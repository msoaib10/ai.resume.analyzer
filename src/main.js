import { ResumeAnalyzer } from './components/ResumeAnalyzer.js';
import { FileProcessor } from './utils/fileProcessor.js';
import { AIAnalyzer } from './services/aiAnalyzer.js';

class App {
    constructor() {
        this.fileProcessor = new FileProcessor();
        this.aiAnalyzer = new AIAnalyzer();
        this.resumeAnalyzer = new ResumeAnalyzer(this.fileProcessor, this.aiAnalyzer);
        this.init();
    }

    init() {
        const root = document.getElementById('root');
        root.innerHTML = this.resumeAnalyzer.render();
        this.resumeAnalyzer.bindEvents();
        this.setupInterviewPrep();
    }

    // helper to escape raw text for HTML
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    setupInterviewPrep() {
        const prepBtn = document.getElementById('interviewPrepBtn');
        const prepContainer = document.getElementById('interview-prep-container');
        const resumeTextarea = document.getElementById('extractedText');
        const jobDescTextarea = document.getElementById('jobDescription');
        prepBtn.addEventListener('click', async () => {
            await this.handleInterviewPrep(resumeTextarea.textContent, jobDescTextarea.value, prepContainer);
        });
    }

    async handleInterviewPrep(resumeText, jobDescText, container) {
        container.innerHTML = '<div class="p-4 text-center text-gray-600">Generating interview questions, please wait...</div>';
        try {
            // Use AIAnalyzer to generate questions
            const prompt = `You are a senior hiring manager. Based on the following resume and job description, generate three behavioral and three technical interview questions. For each question, provide a detailed reasoning for why it is relevant. Return the output strictly in the following JSON format:\n\n{\n  "behavioral": [\n    { "question": "...", "reasoning": "..." },\n    { "question": "...", "reasoning": "..." },\n    { "question": "...", "reasoning": "..." }\n  ],\n  "technical": [\n    { "question": "...", "reasoning": "..." },\n    { "question": "...", "reasoning": "..." },\n    { "question": "...", "reasoning": "..." }\n  ]\n}\n\nResume:\n${resumeText}\n\nJob Description:\n${jobDescText}`;
            const resultObj = await this.aiAnalyzer.tryAnalysisWithFallback(prompt, { returnRaw: true });
            const result = resultObj && resultObj.parsed ? resultObj.parsed : resultObj;
            this.renderInterviewPrep(result, container);

            // If no questions were generated, show the raw AI output to help debugging
            const noBehavioral = !result || !result.behavioral || result.behavioral.length === 0;
            const noTechnical = !result || !result.technical || result.technical.length === 0;
            if (noBehavioral && noTechnical && resultObj) {
                if (resultObj.raw) {
                    container.innerHTML += `<details class="mt-4 p-4 bg-gray-50 border rounded"><summary class="font-medium">Raw AI output (for debugging)</summary><pre class="mt-2 text-sm text-gray-700 whitespace-pre-wrap">${this.escapeHtml(resultObj.raw)}</pre></details>`;
                }
                if (resultObj.full) {
                    container.innerHTML += `<details class="mt-4 p-4 bg-gray-50 border rounded"><summary class="font-medium">Full API JSON (debug)</summary><pre class="mt-2 text-sm text-gray-700 whitespace-pre-wrap">${this.escapeHtml(JSON.stringify(resultObj.full, null, 2))}</pre></details>`;
                }
            }
        } catch (err) {
            container.innerHTML = `<div class="p-4 text-center text-red-500">Error: ${err.message || 'Failed to generate questions.'}</div>`;
        }
    }

    renderInterviewPrep(data, container) {
        let html = `<h2 class="text-2xl font-bold mb-6">Interview Preparation Questions</h2>`;
        html += `<div class="interview-prep-grid grid grid-cols-1 md:grid-cols-2 gap-8">`;
        // Behavioral column
        html += `<div><h3 class="text-xl font-semibold mb-4 text-primary">Behavioral Questions</h3>`;
        html += '<div class="flex flex-col gap-4">';
        const behavioralList = (data && data.behavioral) ? data.behavioral : [];
        if (behavioralList.length === 0) {
            html += `<div class="text-sm text-gray-500">No behavioral questions generated.</div>`;
        } else {
            for (const q of behavioralList) {
                const questionText = (q && q.question) ? q.question : (typeof q === 'string' ? q : JSON.stringify(q));
                const reasoningText = (q && q.reasoning) ? q.reasoning : '';
                html += `<div class="question-card border rounded-lg shadow-sm p-4 bg-white">
                    <div class="font-bold text-gray-800 mb-2">${questionText}</div>
                    <div class="reasoning text-sm italic border-l-4 border-accent pl-3 text-gray-600">${reasoningText}</div>
                </div>`;
            }
        }
        html += '</div></div>';
        // Technical column
        html += `<div><h3 class="text-xl font-semibold mb-4 text-primary">Technical Questions</h3>`;
        html += '<div class="flex flex-col gap-4">';
        const technicalList = (data && data.technical) ? data.technical : [];
        if (technicalList.length === 0) {
            html += `<div class="text-sm text-gray-500">No technical questions generated.</div>`;
        } else {
            for (const q of technicalList) {
                const questionText = (q && q.question) ? q.question : (typeof q === 'string' ? q : JSON.stringify(q));
                const reasoningText = (q && q.reasoning) ? q.reasoning : '';
                html += `<div class="question-card border rounded-lg shadow-sm p-4 bg-white">
                    <div class="font-bold text-gray-800 mb-2">${questionText}</div>
                    <div class="reasoning text-sm italic border-l-4 border-accent pl-3 text-gray-600">${reasoningText}</div>
                </div>`;
            }
        }
        html += '</div></div>';
        html += '</div>';
        container.innerHTML = html;
    }
}

new App();