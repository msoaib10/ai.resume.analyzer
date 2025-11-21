export class AIAnalyzer {
    constructor() {
        // Hardcoded Gemini API key
        this.apiKey = "AIzaSyBLkcZkahKRAmv13XnL_G6SwFFtAgcenBU"; // Replace with your actual API key
        // Default models (may not be available, will fetch actual list)
        this.models = [];
        this.currentModelIndex = 0;
        this.modelsFetched = false;
    }

    async fetchAvailableModels() {
        if (this.modelsFetched && this.models.length > 0) return;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            if (!response.ok) throw new Error('Failed to fetch models');
            const data = await response.json();
            // Filter for models that support generateContent
            this.models = (data.models || [])
                .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
            this.modelsFetched = true;
            // Fallback to first available model if none found
            if (this.models.length === 0 && data.models && data.models.length > 0) {
                this.models = [data.models[0].name.replace('models/', '')];
            }
            // Fallback to gemini-pro if still empty
            if (this.models.length === 0) {
                this.models = ['gemini-pro'];
            }
        } catch (e) {
            console.error('Error fetching available models:', e);
            // Fallback to default if fetch fails
            this.models = ['gemini-pro'];
            this.modelsFetched = true;
        }
    }
    async analyzeResume(resumeText, jobDescription) {
        const prompt = this.buildAnalysisPrompt(resumeText, jobDescription);
        await this.fetchAvailableModels();
        // Always reset model index before analysis
        this.currentModelIndex = 0;
        // Ensure models array is not empty
        if (!this.models || this.models.length === 0) {
            this.models = ['gemini-pro'];
        }
        return await this.tryAnalysisWithFallback(prompt);
    }

    async tryAnalysisWithFallback(prompt, attemptOrOptions = 0) {
        // Try all available models until one succeeds or all fail
        let lastError = null;
        // Support legacy numeric second arg or options object { returnRaw: true }
        let options = {};
        if (typeof attemptOrOptions === 'object') options = attemptOrOptions || {};
        else options.attemptCount = attemptOrOptions;
        const returnRaw = !!options.returnRaw;
        for (let i = 0; i < this.models.length; i++) {
            const currentModel = this.models[i];
            if (!currentModel) continue;
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: prompt
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 2048,
                        }
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }
                const data = await response.json().catch(() => null);

                // Defensive extraction of text - handle multiple possible response shapes
                let analysisText = null;

                // Common v1beta generateContent shape
                if (data && Array.isArray(data.candidates) && data.candidates.length > 0) {
                    const cand = data.candidates[0];
                    if (cand && cand.content) {
                        // content may be an object with parts, or a string
                        if (Array.isArray(cand.content.parts) && cand.content.parts.length > 0) {
                            analysisText = cand.content.parts.map(p => p.text || p).join('\n');
                        } else if (typeof cand.content === 'string') {
                            analysisText = cand.content;
                        }
                    }
                }

                // Alternative shapes (some APIs return 'outputs' or 'text' directly)
                if (!analysisText && data) {
                    if (Array.isArray(data.outputs) && data.outputs.length > 0) {
                        // outputs may contain content or text
                        const out = data.outputs[0];
                        if (out && out.content && Array.isArray(out.content)) {
                            analysisText = out.content.map(c => (c.text || (c.parts && c.parts.map(p=>p.text||p).join('\n')))).join('\n');
                        } else if (out && typeof out.text === 'string') {
                            analysisText = out.text;
                        }
                    }

                    // Generic fallback fields
                    if (!analysisText && typeof data.text === 'string') analysisText = data.text;
                    if (!analysisText && typeof data.output === 'string') analysisText = data.output;
                }

                if (!analysisText) {
                    // As a last resort, recursively search the response object for the longest string value.
                    const collectStrings = (obj, results = []) => {
                        if (obj == null) return results;
                        if (typeof obj === 'string') {
                            results.push(obj);
                            return results;
                        }
                        if (Array.isArray(obj)) {
                            for (const v of obj) collectStrings(v, results);
                            return results;
                        }
                        if (typeof obj === 'object') {
                            for (const k of Object.keys(obj)) collectStrings(obj[k], results);
                            return results;
                        }
                        return results;
                    };

                    try {
                        const allStrings = collectStrings(data || {});
                        if (allStrings.length > 0) {
                            // choose the longest string as a heuristic
                            const longest = allStrings.reduce((a, b) => (a.length >= b.length ? a : b), '');
                            if (longest && longest.length > 40) {
                                analysisText = longest;
                                console.warn(`Using longest string fallback for model ${currentModel} (length=${analysisText.length})`);
                            }
                        }
                    } catch (e) {
                        // ignore fallback errors
                    }

                    if (!analysisText) {
                        // Log full response for debugging and continue to next model
                        console.error(`Unexpected AI response shape for model ${currentModel}:`, data);
                        lastError = new Error('AI response did not contain expected text content');
                        // continue to try the next model instead of throwing immediately
                        continue;
                    }
                }

                const parsed = this.parseAnalysisResponse(analysisText);
                if (returnRaw) return { parsed, raw: analysisText, full: data };
                return parsed;
            } catch (error) {
                console.error(`AI Analysis error with model ${currentModel}:`, error);
                lastError = error;
                // Only retry with next model if error is busy/overload/quota/rate limit/server error
                if (!this.shouldRetryWithNextModel(error)) {
                    break;
                }
            }
        }
        // Reset model index for next analysis
        this.currentModelIndex = 0;
        throw new Error(`Failed to analyze resume with AI after trying ${this.models.length} model(s): ${lastError ? lastError.message : 'Unknown error'}`);
    }

    shouldRetryWithNextModel(error) {
        const errorMessage = error.message.toLowerCase();
        return errorMessage.includes('overload') || 
               errorMessage.includes('quota') || 
               errorMessage.includes('rate limit') ||
               errorMessage.includes('503') ||
               errorMessage.includes('429') ||
               errorMessage.includes('500');
    }

    buildAnalysisPrompt(resumeText, jobDescription) {
        return `
As an expert ATS (Applicant Tracking System) analyzer and recruitment specialist with 40+ years of experience, please analyze the following resume against the provided job description.

RESUME TEXT:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Please provide a comprehensive analysis in the following JSON format:

{
    "atsScore": [number from 0-100],
    "strengths": [
        "strength 1",
        "strength 2",
        "strength 3"
    ],
    "weaknesses": [
        "weakness 1",
        "weakness 2",
        "weakness 3"
    ],
    "suggestions": [
        "specific actionable suggestion 1",
        "specific actionable suggestion 2",
        "specific actionable suggestion 3",
        "specific actionable suggestion 4",
        "specific actionable suggestion 5"
    ]
}

ANALYSIS CRITERIA:
- ATS Score should be based on keyword matching, skills alignment, experience relevance, and format optimization
- Strengths should highlight what matches well with the job requirements
- Weaknesses should identify gaps or missing elements that hurt ATS scoring
- Suggestions should be specific, actionable recommendations to improve the ATS score and interview chances

Please ensure the response is valid JSON only, without any additional text or formatting.
        `;
    }

    parseAnalysisResponse(responseText) {
        try {
            // Log the raw AI response for debugging
            console.log('Raw AI response:', responseText);

            // Clean the response text to extract JSON
            let jsonText = responseText.trim();

            // Remove markdown code blocks if present
            jsonText = jsonText.replace(/```json\s*|\s*```/g, '');
            jsonText = jsonText.replace(/```\s*|\s*```/g, '');

            // Find the JSON object
            const jsonStart = jsonText.indexOf('{');
            const jsonEnd = jsonText.lastIndexOf('}') + 1;

            if (jsonStart !== -1 && jsonEnd !== -1) {
                jsonText = jsonText.substring(jsonStart, jsonEnd);
            }

            const analysis = JSON.parse(jsonText);

            // ATS analysis format
            if (
                typeof analysis.atsScore === 'number' &&
                Array.isArray(analysis.strengths) &&
                Array.isArray(analysis.weaknesses) &&
                Array.isArray(analysis.suggestions)
            ) {
                return {
                    atsScore: Math.max(0, Math.min(100, analysis.atsScore)),
                    strengths: analysis.strengths.slice(0, 5),
                    weaknesses: analysis.weaknesses.slice(0, 5),
                    suggestions: analysis.suggestions.slice(0, 6)
                };
            }

            // Interview prep format (normalize several possible shapes)
            const normalizeList = (val) => {
                // If it's a JSON string, try to parse it
                if (typeof val === 'string') {
                    const trimmed = val.trim();
                    if ((trimmed.startsWith('{') || trimmed.startsWith('['))) {
                        try {
                            const parsed = JSON.parse(trimmed);
                            return normalizeList(parsed);
                        } catch (e) {
                            // fall through to treat as single string question
                        }
                    }
                    return [{ question: val, reasoning: '' }];
                }

                if (!val) return [];

                if (Array.isArray(val)) {
                    return val.map(item => {
                        if (typeof item === 'string') return { question: item, reasoning: '' };
                        if (item && typeof item === 'object') {
                            const question = item.question || item.q || item.prompt || item.text || '';
                            const reasoning = item.reasoning || item.reason || item.r || '';
                            // If the object doesn't have clear question text, stringify as fallback
                            return { question: question || JSON.stringify(item), reasoning };
                        }
                        return { question: String(item), reasoning: '' };
                    });
                }

                // Unknown type -> stringify
                return [{ question: String(val), reasoning: '' }];
            };

            if (analysis && (analysis.behavioral || analysis.technical)) {
                return {
                    behavioral: normalizeList(analysis.behavioral),
                    technical: normalizeList(analysis.technical)
                };
            }

            throw new Error('Invalid analysis response structure');
        } catch (error) {
            console.error('Error parsing AI response:', error);
            // Fallback response for ATS analysis
            return {
                atsScore: 65,
                strengths: [
                    "Resume contains relevant work experience",
                    "Professional format and structure",
                    "Clear contact information provided"
                ],
                weaknesses: [
                    "Missing some key job-specific keywords",
                    "Could benefit from more quantified achievements",
                    "Some sections could be better optimized for ATS"
                ],
                suggestions: [
                    "Add more industry-specific keywords from the job description",
                    "Quantify achievements with specific numbers and metrics",
                    "Optimize section headers for better ATS parsing",
                    "Include relevant certifications or training",
                    "Tailor the professional summary to match job requirements"
                ]
            };
        }
    }
}