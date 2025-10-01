const express = require('express');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

// Try to load Sharp, fallback to Jimp if Sharp fails
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Sharp not available, using Jimp as fallback for image processing');
  sharp = null;
}

const Jimp = require('jimp');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const pdf = require('html-pdf');

const router = express.Router();

// Convert JPG/PNG to PDF
router.post('/image-to-pdf', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `converted-${Date.now()}.pdf`);

      try {
        let imageBuffer, width, height;

        if (sharp) {
          // Use Sharp for better performance
          const metadata = await sharp(inputPath).metadata();
          width = metadata.width;
          height = metadata.height;

          imageBuffer = await sharp(inputPath)
            .jpeg({ quality: 90 })
            .toBuffer();
        } else {
          // Fallback to Jimp
          const image = await Jimp.read(inputPath);
          width = image.getWidth();
          height = image.getHeight();

          imageBuffer = await image.quality(90).getBufferAsync(Jimp.MIME_JPEG);
        }

        // Create PDF document
        const pdfDoc = await PDFDocument.create();
        const pdfImage = await pdfDoc.embedJpg(imageBuffer);
        
        // Create page with original dimensions
        const page = pdfDoc.addPage([width, height]);
        
        // Draw image on page
        page.drawImage(pdfImage, {
          x: 0,
          y: 0,
          width,
          height,
        });

        // Save PDF
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, pdfBytes);

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: 'Image converted to PDF successfully',
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `converted-${req.file.originalname.split('.')[0]}.pdf`
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('Image to PDF conversion error:', error);
    res.status(500).json({ error: 'Failed to convert image to PDF' });
  }
});

// Convert Word to PDF (simplified - requires LibreOffice in production)
router.post('/word-to-pdf', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `converted-${Date.now()}.pdf`);

      try {
        // Extract text from Word document
        const result = await mammoth.extractRawText({ path: inputPath });
        const text = result.value;

        // Create HTML content
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              p { margin: 10px 0; }
            </style>
          </head>
          <body>
            ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
          </body>
          </html>
        `;

        // Convert HTML to PDF
        const options = {
          format: 'A4',
          orientation: 'portrait',
          border: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          }
        };

        pdf.create(htmlContent, options).toFile(outputPath, (err, result) => {
          if (err) throw err;

          // Clean up input file
          fs.unlinkSync(inputPath);

          res.json({
            success: true,
            message: 'Word document converted to PDF successfully',
            downloadUrl: `/uploads/${path.basename(outputPath)}`,
            filename: `converted-${req.file.originalname.split('.')[0]}.pdf`
          });
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('Word to PDF conversion error:', error);
    res.status(500).json({ error: 'Failed to convert Word document to PDF' });
  }
});

// Convert Excel to PDF
router.post('/excel-to-pdf', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `converted-${Date.now()}.pdf`);

      try {
        // Read Excel file
        const workbook = XLSX.readFile(inputPath);
        const sheetNames = workbook.SheetNames;
        
        let htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .sheet-title { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; }
            </style>
          </head>
          <body>
        `;

        // Convert each sheet to HTML table
        sheetNames.forEach((sheetName, index) => {
          const worksheet = workbook.Sheets[sheetName];
          const htmlTable = XLSX.utils.sheet_to_html(worksheet);
          
          htmlContent += `
            <div class="sheet-title">Sheet: ${sheetName}</div>
            ${htmlTable}
          `;
        });

        htmlContent += '</body></html>';

        // Convert HTML to PDF
        const options = {
          format: 'A4',
          orientation: 'landscape',
          border: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          }
        };

        pdf.create(htmlContent, options).toFile(outputPath, (err, result) => {
          if (err) throw err;

          // Clean up input file
          fs.unlinkSync(inputPath);

          res.json({
            success: true,
            message: 'Excel file converted to PDF successfully',
            downloadUrl: `/uploads/${path.basename(outputPath)}`,
            filename: `converted-${req.file.originalname.split('.')[0]}.pdf`
          });
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('Excel to PDF conversion error:', error);
    res.status(500).json({ error: 'Failed to convert Excel file to PDF' });
  }
});

// Convert HTML to PDF
router.post('/html-to-pdf', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `converted-${Date.now()}.pdf`);

      try {
        // Read HTML content
        const htmlContent = fs.readFileSync(inputPath, 'utf8');

        // Convert HTML to PDF
        const options = {
          format: 'A4',
          orientation: 'portrait',
          border: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          },
          timeout: 30000
        };

        pdf.create(htmlContent, options).toFile(outputPath, (err, result) => {
          if (err) throw err;

          // Clean up input file
          fs.unlinkSync(inputPath);

          res.json({
            success: true,
            message: 'HTML file converted to PDF successfully',
            downloadUrl: `/uploads/${path.basename(outputPath)}`,
            filename: `converted-${req.file.originalname.split('.')[0]}.pdf`
          });
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('HTML to PDF conversion error:', error);
    res.status(500).json({ error: 'Failed to convert HTML file to PDF' });
  }
});

// Convert PDF to JPG
router.post('/pdf-to-jpg', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const inputPath = req.file.path;
      
      try {
        // Note: This is a simplified implementation
        // In production, you would use pdf2pic or similar library
        // For now, we'll create a placeholder response
        
        res.json({
          success: true,
          message: 'PDF to JPG conversion initiated. This feature requires additional setup for production use.',
          note: 'Please install pdf2pic and poppler-utils for full PDF to image conversion functionality'
        });

      } catch (error) {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('PDF to JPG conversion error:', error);
    res.status(500).json({ error: 'Failed to convert PDF to JPG' });
  }
});

// Convert Image to Text (OCR)
router.post('/image-to-text', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `extracted-${Date.now()}.txt`);

      try {
        // Try Tesseract.js OCR
        let extractedText = '';
        let confidence = 0;
        
        try {
          console.log('Attempting OCR with Tesseract.js...');
          
          // Preprocess image for better OCR results
          const processedImagePath = path.join(path.dirname(inputPath), `processed-${Date.now()}.png`);
          
          if (sharp) {
            await sharp(inputPath)
              .resize(null, 2000, { withoutEnlargement: true })
              .sharpen()
              .png({ quality: 100 })
              .toFile(processedImagePath);
          } else {
            // Fallback to Jimp for preprocessing
            const image = await Jimp.read(inputPath);
            if (image.getHeight() > 2000) {
              image.resize(Jimp.AUTO, 2000);
            }
            await image.writeAsync(processedImagePath);
          }

          const { createWorker } = require('tesseract.js');
          
          const worker = await createWorker({
            logger: m => console.log('OCR Progress:', m.status, m.progress)
          });
          
          await worker.loadLanguage('eng');
          await worker.initialize('eng');
          
          await worker.setParameters({
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,!?-()[]{}:;"\'',
            tessedit_pageseg_mode: '6',
          });
          
          const { data } = await worker.recognize(processedImagePath);
          extractedText = data.text;
          confidence = data.confidence;
          
          await worker.terminate();
          
          // Clean up processed image
          if (fs.existsSync(processedImagePath)) fs.unlinkSync(processedImagePath);
          
          console.log('OCR successful, confidence:', confidence);
          
        } catch (ocrError) {
          console.error('Tesseract.js failed, using fallback:', ocrError.message);
          
          // Fallback: Return a message indicating OCR setup needed
          extractedText = `OCR processing failed. This feature requires additional setup in production.\n\nError: ${ocrError.message}\n\nTo enable OCR functionality, ensure Tesseract.js can properly initialize and download language data.`;
          confidence = 0;
        }

        // Save extracted text to file
        fs.writeFileSync(outputPath, extractedText);

        // Clean up input file
        fs.unlinkSync(inputPath);

        const message = confidence > 0 
          ? `Text extracted from image successfully (Confidence: ${confidence.toFixed(1)}%)`
          : 'OCR processing completed (requires additional setup for full functionality)';

        res.json({
          success: true,
          message: message,
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `extracted-${req.file.originalname.split('.')[0]}.txt`,
          extractedText: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
          confidence: confidence
        });

      } catch (error) {
        console.error('Image to Text conversion error:', error);
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('Image to Text conversion error:', error);
    res.status(500).json({ error: 'Failed to extract text from image' });
  }
});

// Convert PDF to Word
router.post('/pdf-to-word', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `converted-${Date.now()}.docx`);

      try {
        // For now, we'll create a placeholder response
        // In production, you would use libraries like pdf2docx or mammoth for conversion
        
        // Read PDF content (basic text extraction)
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(inputPath);
        const data = await pdfParse(dataBuffer);
        
        // Create a simple Word document structure
        const docx = require('docx');
        const { Document, Packer, Paragraph, TextRun } = docx;

        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: data.text,
                    font: "Arial",
                    size: 24,
                  }),
                ],
              }),
            ],
          }],
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(outputPath, buffer);

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: 'PDF converted to Word successfully',
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `converted-${req.file.originalname.split('.')[0]}.docx`
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('PDF to Word conversion error:', error);
    res.status(500).json({ error: 'Failed to convert PDF to Word' });
  }
});

module.exports = router;
