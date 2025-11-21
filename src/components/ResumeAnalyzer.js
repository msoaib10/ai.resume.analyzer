export class ResumeAnalyzer {
    constructor(fileProcessor, aiAnalyzer) {
        this.fileProcessor = fileProcessor;
        this.aiAnalyzer = aiAnalyzer;
        this.currentAnalysis = null;
        this.uploadedFile = null;
        this.extractedText = '';
    }

    render() {
    return `
            <div class="container mx-auto px-2 py-4 max-w-4xl">
                <!-- Header -->
                <header class="text-center mb-12">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full mb-6">
                        <i class="fas fa-file-alt text-white text-2xl"></i>
                    </div>
                    <h1 class="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
                        AI Resume Analyzer
                    </h1>
                    <p class="text-xl text-gray-600 max-w-2xl mx-auto">
                        Get your ATS score, identify strengths & weaknesses, and receive actionable insights to boost your interview chances
                    </p>
                </header>

                <!-- API Key Setup -->
                <!-- Status Info -->
                <div class="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
                    <div class="flex items-center mb-4">
                        <i class="fas fa-info-circle text-primary mr-3"></i>
                        <h2 class="text-xl font-semibold">Analysis Status</h2>
                    </div>
                    <p class="text-gray-600">AI-powered resume analysis with automatic model fallback for optimal results.</p>
                </div>

                <!-- Main Content Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- Left Column: Upload & Job Description -->
                    <div class="space-y-4">
                        <!-- File Upload -->
                        <div class="bg-white rounded-lg shadow p-4 border border-gray-100">
                            <h2 class="text-xl font-semibold mb-6 flex items-center">
                                <i class="fas fa-upload text-primary mr-3"></i>
                                Upload Resume
                            </h2>
                            
                            <div 
                                id="dropZone" 
                                class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary transition-all duration-300 cursor-pointer group"
                            >
                                <div class="flex flex-col items-center">
                                    <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 group-hover:text-primary transition-colors mb-4"></i>
                                    <p class="text-lg font-medium text-gray-700 mb-2">Drop your resume here</p>
                                    <p class="text-gray-500 mb-4">or click to browse</p>
                                    <p class="text-sm text-gray-400">Supports PDF and Word documents</p>
                                </div>
                                <input type="file" id="fileInput" class="hidden" accept=".pdf,.doc,.docx">
                            </div>

                            <!-- File Preview -->
                            <div id="filePreview" class="mt-4 hidden">
                                <div class="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                                    <div class="flex items-center">
                                        <i class="fas fa-file text-primary mr-3"></i>
                                        <div>
                                            <p id="fileName" class="font-medium"></p>
                                            <p id="fileSize" class="text-sm text-gray-500"></p>
                                        </div>
                                    </div>
                                    <button id="removeFile" class="text-red-500 hover:text-red-700 transition-colors">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Job Description -->
                        <div class="bg-white rounded-lg shadow p-4 border border-gray-100">
                            <h2 class="text-xl font-semibold mb-6 flex items-center">
                                <i class="fas fa-briefcase text-secondary mr-3"></i>
                                Job Description
                            </h2>
                            <textarea 
                                id="jobDescription" 
                                placeholder="Paste the job description here for targeted analysis..."
                                class="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent resize-none transition-all duration-200"
                            ></textarea>
                        </div>

                        <!-- Extracted Text Display -->
                        <div id="extractedTextContainer" class="bg-white rounded-lg shadow p-4 border border-gray-100 hidden">
                            <h2 class="text-xl font-semibold mb-6 flex items-center">
                                <i class="fas fa-file-text text-accent mr-3"></i>
                                Extracted Resume Text
                            </h2>
                            <div class="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                                <pre id="extractedText" class="text-sm text-gray-700 whitespace-pre-wrap font-mono"></pre>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">This is the text extracted from your resume that will be analyzed.</p>
                        </div>

                        <!-- Analyze Button -->
                        <div class="flex flex-col gap-2">
                            <button 
                                id="analyzeBtn" 
                                class="w-full bg-gradient-to-r from-primary to-secondary text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                disabled
                            >
                                <i class="fas fa-chart-line mr-2"></i>
                                Analyze Resume
                            </button>
                            <button 
                                id="interviewPrepBtn" 
                                class="w-full bg-gradient-to-r from-accent to-secondary text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                            >
                                <i class="fas fa-comments mr-2"></i>
                                Generate Interview Prep
                            </button>
                        </div>
                    </div>

                    <!-- Right Column: Results -->
                    <div class="space-y-4">
                        <!-- Analysis Results -->
                        <div id="resultsContainer" class="hidden">
                            <!-- ATS Score -->
                            <div class="bg-white rounded-lg shadow p-4 border border-gray-100 mb-4">
                                <h2 class="text-xl font-semibold mb-6 flex items-center">
                                    <i class="fas fa-tachometer-alt text-accent mr-3"></i>
                                    ATS Score
                                </h2>
                                <div class="text-center">
                                    <div class="relative inline-flex items-center justify-center">
                                        <svg class="w-32 h-32 transform -rotate-90">
                                            <circle cx="64" cy="64" r="56" stroke="currentColor" stroke-width="8" fill="none" class="text-gray-200"></circle>
                                            <circle id="scoreCircle" cx="64" cy="64" r="56" stroke="currentColor" stroke-width="8" fill="none" class="text-accent" stroke-linecap="round" stroke-dasharray="351.86" stroke-dashoffset="351.86"></circle>
                                        </svg>
                                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                                            <span id="atsScore" class="text-4xl font-bold text-gray-800">0</span>
                                            <span class="text-sm text-gray-600">/ 100</span>
                                        </div>
                                    </div>
                                    <p id="scoreStatus" class="mt-4 text-lg font-medium"></p>
                                </div>
                            </div>

                            <!-- Strengths -->
                            <div class="bg-white rounded-lg shadow p-4 border border-gray-100 mb-4">
                                <h3 class="text-lg font-semibold mb-4 flex items-center text-accent">
                                    <i class="fas fa-check-circle mr-2"></i>
                                    Strengths
                                </h3>
                                <ul id="strengthsList" class="space-y-2"></ul>
                            </div>

                            <!-- Weaknesses -->
                            <div class="bg-white rounded-lg shadow p-4 border border-gray-100 mb-4">
                                <h3 class="text-lg font-semibold mb-4 flex items-center text-red-500">
                                    <i class="fas fa-exclamation-triangle mr-2"></i>
                                    Areas for Improvement
                                </h3>
                                <ul id="weaknessesList" class="space-y-2"></ul>
                            </div>

                            <!-- Suggestions -->
                            <div class="bg-white rounded-lg shadow p-4 border border-gray-100">
                                <h3 class="text-lg font-semibold mb-4 flex items-center text-warning">
                                    <i class="fas fa-lightbulb mr-2"></i>
                                    Recommendations
                                </h3>
                                <div id="suggestionsList" class="space-y-3"></div>
                            </div>
                        </div>
                        <!-- Interview Preparation Results -->
                        <div id="interview-prep-container" class="mt-4"></div>
                        <!-- Interview Questions Results removed -->

                        <!-- Loading State -->
                        <div id="loadingState" class="hidden bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-center">
                            <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
                            <h3 class="text-xl font-semibold mb-2">Analyzing Your Resume...</h3>
                            <p class="text-gray-600">This may take a few moments</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.bindFileUpload();
        this.bindAnalyzeButton();
        this.bindFormValidation();
    }

    bindFileUpload() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const filePreview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const removeFile = document.getElementById('removeFile');

        // Click to upload
        dropZone.addEventListener('click', () => fileInput.click());

        // File selection
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-primary', 'bg-blue-50');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-primary', 'bg-blue-50');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-primary', 'bg-blue-50');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        // Remove file
        removeFile.addEventListener('click', (e) => {
            e.stopPropagation();
            this.uploadedFile = null;
            this.extractedText = '';
            fileInput.value = '';
            filePreview.classList.add('hidden');
            this.validateForm();
        });
    }

    async handleFileUpload(file) {
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        if (!validTypes.includes(file.type)) {
            alert('Please upload a PDF or Word document.');
            return;
        }

        this.uploadedFile = file;
        
        // Show file preview
        const filePreview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        
        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
        filePreview.classList.remove('hidden');

        try {
            // Extract text
            this.extractedText = await this.fileProcessor.extractText(file);
            this.displayExtractedText(this.extractedText);
            this.validateForm();
        } catch (error) {
            console.error('Error extracting text:', error);
            alert('Error reading file. Please try again.');
        }
    }

    bindAnalyzeButton() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        analyzeBtn.addEventListener('click', async () => {
            const jobDescription = document.getElementById('jobDescription').value.trim();
            
            if (!this.extractedText || !jobDescription) {
                alert('Please fill all required fields.');
                return;
            }

            try {
                this.showLoading();
                const analysis = await this.aiAnalyzer.analyzeResume(this.extractedText, jobDescription);
                this.displayResults(analysis);
            } catch (error) {
                console.error('Analysis error:', error);
                alert(`Error analyzing resume: ${error.message}`);
            } finally {
                this.hideLoading();
            }
        });
    }

    bindFormValidation() {
        const jobDescription = document.getElementById('jobDescription');
        
        jobDescription.addEventListener('input', () => this.validateForm());
    }

    validateForm() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const jobDescription = document.getElementById('jobDescription').value.trim();
        
        const isValid = this.extractedText && jobDescription;
        analyzeBtn.disabled = !isValid;
    }

    displayExtractedText(text) {
        const container = document.getElementById('extractedTextContainer');
        const textElement = document.getElementById('extractedText');
        
        textElement.textContent = text;
        container.classList.remove('hidden');
    }

    showLoading() {
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('resultsContainer').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loadingState').classList.add('hidden');
    }

    displayResults(analysis) {
        // Show results container
        document.getElementById('resultsContainer').classList.remove('hidden');
        
        // Update ATS Score
        this.animateScore(analysis.atsScore);
        
        // Update strengths
        const strengthsList = document.getElementById('strengthsList');
        strengthsList.innerHTML = analysis.strengths.map(strength => 
            `<li class="flex items-start"><i class="fas fa-check text-accent mr-2 mt-1"></i><span>${strength}</span></li>`
        ).join('');
        
        // Update weaknesses
        const weaknessesList = document.getElementById('weaknessesList');
        weaknessesList.innerHTML = analysis.weaknesses.map(weakness => 
            `<li class="flex items-start"><i class="fas fa-times text-red-500 mr-2 mt-1"></i><span>${weakness}</span></li>`
        ).join('');
        
        // Update suggestions
        const suggestionsList = document.getElementById('suggestionsList');
        suggestionsList.innerHTML = analysis.suggestions.map((suggestion, index) => 
            `<div class="bg-amber-50 border-l-4 border-warning p-4 rounded">
                <div class="flex items-start">
                    <span class="bg-warning text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">${index + 1}</span>
                    <p class="text-gray-800">${suggestion}</p>
                </div>
            </div>`
        ).join('');
    }

    animateScore(score) {
        const scoreElement = document.getElementById('atsScore');
        const scoreCircle = document.getElementById('scoreCircle');
        const scoreStatus = document.getElementById('scoreStatus');
        
        // Animate number as percentage
        let current = 0;
        const increment = score / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= score) {
                current = score;
                clearInterval(timer);
            }
            scoreElement.textContent = Math.round(current) + '%';
        }, 20);
        
        // Animate circle
        const circumference = 351.86;
        const offset = circumference - (score / 100) * circumference;
        scoreCircle.style.strokeDashoffset = offset;
        
        // Update status
        let status, color;
        if (score >= 80) {
            status = 'Excellent';
            color = 'text-accent';
        } else if (score >= 60) {
            status = 'Good';
            color = 'text-warning';
        } else {
            status = 'Needs Improvement';
            color = 'text-red-500';
        }
        
        scoreStatus.textContent = status;
        scoreStatus.className = `mt-4 text-lg font-medium ${color}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}