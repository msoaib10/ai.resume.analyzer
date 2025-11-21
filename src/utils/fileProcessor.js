export class FileProcessor {
    async extractText(file) {
        const fileType = file.type;
        
        if (fileType === 'application/pdf') {
            return await this.extractPDFText(file);
        } else if (fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return await this.extractWordText(file);
        } else {
            throw new Error('Unsupported file type');
        }
    }

    async extractPDFText(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            
            return fullText.trim();
        } catch (error) {
            console.error('Error extracting PDF text:', error);
            throw new Error('Failed to extract text from PDF');
        }
    }

    async extractWordText(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } catch (error) {
            console.error('Error extracting Word text:', error);
            throw new Error('Failed to extract text from Word document');
        }
    }
}