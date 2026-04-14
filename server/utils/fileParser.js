const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Extracts text content from uploaded files.
 * Supports: PDF, TXT, and plain text files.
 */
async function extractTextFromFile(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    }

    // For TXT and other text-based files
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      return fs.readFileSync(filePath, 'utf-8');
    }

    // Images — return a note; the image URL will be sent separately
    if (mimeType.startsWith('image/')) {
      return null; // handled as image in the route
    }

    return null;
  } catch (err) {
    console.error('File parsing error:', err.message);
    return null;
  }
}

module.exports = { extractTextFromFile };
