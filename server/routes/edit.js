const express = require('express');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const router = express.Router();

// Rotate PDF pages
router.post('/rotate', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const { rotation = 90, pages = 'all' } = req.body;
      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `rotated-${Date.now()}.pdf`);

      try {
        const pdfBytes = fs.readFileSync(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const totalPages = pdf.getPageCount();

        // Determine which pages to rotate
        let pagesToRotate = [];
        if (pages === 'all') {
          pagesToRotate = Array.from({ length: totalPages }, (_, i) => i);
        } else {
          // Parse specific pages (e.g., "1,3,5" or "1-3,5")
          const ranges = pages.split(',');
          ranges.forEach(range => {
            range = range.trim();
            if (range.includes('-')) {
              const [start, end] = range.split('-').map(num => parseInt(num.trim()));
              for (let i = start; i <= end; i++) {
                if (i >= 1 && i <= totalPages) {
                  pagesToRotate.push(i - 1);
                }
              }
            } else {
              const pageNum = parseInt(range);
              if (pageNum >= 1 && pageNum <= totalPages) {
                pagesToRotate.push(pageNum - 1);
              }
            }
          });
        }

        // Rotate specified pages
        const pdfPages = pdf.getPages();
        pagesToRotate.forEach(pageIndex => {
          const page = pdfPages[pageIndex];
          const currentRotation = page.getRotation().angle;
          const newRotation = (currentRotation + parseInt(rotation)) % 360;
          page.setRotation({ type: 'degrees', angle: newRotation });
        });

        // Save the rotated PDF
        const rotatedPdfBytes = await pdf.save();
        fs.writeFileSync(outputPath, rotatedPdfBytes);

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: `Rotated ${pagesToRotate.length} pages by ${rotation} degrees`,
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `rotated-${req.file.originalname}`,
          rotatedPages: pagesToRotate.map(p => p + 1).join(', '),
          rotation: rotation
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('PDF rotation error:', error);
    res.status(500).json({ error: 'Failed to rotate PDF pages' });
  }
});

// Add watermark to PDF
router.post('/watermark', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const { 
        text = 'WATERMARK', 
        opacity = 0.3, 
        fontSize = 50, 
        color = '#999999',
        position = 'center' 
      } = req.body;

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `watermarked-${Date.now()}.pdf`);

      try {
        const pdfBytes = fs.readFileSync(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const pages = pdf.getPages();

        if (pages.length === 0) {
          throw new Error('PDF has no pages');
        }

        const font = await pdf.embedFont(StandardFonts.Helvetica);

        if (!font) {
          throw new Error('Failed to embed font');
        }

        // Convert hex color to RGB
        const hexToRgb = (hex) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
          } : { r: 0.6, g: 0.6, b: 0.6 };
        };

        const textColor = hexToRgb(color);

        // Add watermark to each page
        pages.forEach(page => {
          const { width, height } = page.getSize();
          
          // Calculate position
          let x, y;
          switch (position) {
            case 'top-left':
              x = 50;
              y = height - 100;
              break;
            case 'top-right':
              x = width - 200;
              y = height - 100;
              break;
            case 'bottom-left':
              x = 50;
              y = 100;
              break;
            case 'bottom-right':
              x = width - 200;
              y = 100;
              break;
            case 'center':
            default:
              x = width / 2 - (text.length * fontSize / 4);
              y = height / 2;
              break;
          }

          // Draw watermark text
          page.drawText(text, {
            x: x,
            y: y,
            size: parseInt(fontSize),
            font: font,
            color: rgb(textColor.r, textColor.g, textColor.b),
            opacity: parseFloat(opacity)
          });
        });

        // Save the watermarked PDF
        const watermarkedPdfBytes = await pdf.save();
        fs.writeFileSync(outputPath, watermarkedPdfBytes);

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: `Added watermark to ${pages.length} pages`,
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `watermarked-${req.file.originalname}`,
          watermark: {
            text,
            position,
            opacity,
            fontSize,
            color
          }
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('Watermark error:', error);
    res.status(500).json({ error: 'Failed to add watermark to PDF' });
  }
});

// Add page numbers to PDF
router.post('/page-numbers', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const { 
        position = 'bottom-center',
        fontSize = 12,
        color = '#000000',
        startPage = 1,
        format = '{page}'
      } = req.body;

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `numbered-${Date.now()}.pdf`);

      try {
        const pdfBytes = fs.readFileSync(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const pages = pdf.getPages();
        const font = await pdf.embedFont(StandardFonts.Helvetica);

        if (!font) {
          throw new Error('Failed to embed font');
        }

        // Convert hex color to RGB
        const hexToRgb = (hex) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
          } : { r: 0, g: 0, b: 0 };
        };

        const textColor = hexToRgb(color);

        // Add page numbers
        pages.forEach((page, index) => {
          const { width, height } = page.getSize();
          const pageNumber = index + parseInt(startPage);
          const pageText = format.replace('{page}', pageNumber).replace('{total}', pages.length);
          
          // Calculate position
          let x, y;
          switch (position) {
            case 'top-left':
              x = 50;
              y = height - 30;
              break;
            case 'top-center':
              x = width / 2 - (pageText.length * fontSize / 4);
              y = height - 30;
              break;
            case 'top-right':
              x = width - 80;
              y = height - 30;
              break;
            case 'bottom-left':
              x = 50;
              y = 20;
              break;
            case 'bottom-right':
              x = width - 80;
              y = 20;
              break;
            case 'bottom-center':
            default:
              x = width / 2 - (pageText.length * fontSize / 4);
              y = 20;
              break;
          }

          // Draw page number
          page.drawText(pageText, {
            x: x,
            y: y,
            size: parseInt(fontSize),
            font: font,
            color: rgb(textColor.r, textColor.g, textColor.b)
          });
        });

        // Save the numbered PDF
        const numberedPdfBytes = await pdf.save();
        fs.writeFileSync(outputPath, numberedPdfBytes);

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: `Added page numbers to ${pages.length} pages`,
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `numbered-${req.file.originalname}`,
          pageNumbers: {
            position,
            fontSize,
            color,
            startPage,
            format,
            totalPages: pages.length
          }
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('Page numbering error:', error);
    res.status(500).json({ error: 'Failed to add page numbers to PDF' });
  }
});

// Compress PDF (basic implementation)
router.post('/compress', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `compressed-${Date.now()}.pdf`);

      try {
        const pdfBytes = fs.readFileSync(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);

        // Basic compression by saving with default settings
        // In production, you might want to use Ghostscript or similar tools for better compression
        const compressedPdfBytes = await pdf.save({
          useObjectStreams: false,
          addDefaultPage: false
        });

        fs.writeFileSync(outputPath, compressedPdfBytes);

        const originalSize = fs.statSync(inputPath).size;
        const compressedSize = fs.statSync(outputPath).size;
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: 'PDF compressed successfully',
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `compressed-${req.file.originalname}`,
          compression: {
            originalSize: `${(originalSize / 1024 / 1024).toFixed(2)} MB`,
            compressedSize: `${(compressedSize / 1024 / 1024).toFixed(2)} MB`,
            savedSpace: `${compressionRatio}%`
          }
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('PDF compression error:', error);
    res.status(500).json({ error: 'Failed to compress PDF' });
  }
});

module.exports = router;
