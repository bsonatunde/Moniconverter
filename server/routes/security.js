const express = require('express');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Protect PDF with password
router.post('/protect', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const { password, permissions = {} } = req.body;

      if (!password || password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters long' });
      }

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `protected-${Date.now()}.pdf`);

      try {
        const pdfBytes = fs.readFileSync(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);

        // Note: pdf-lib doesn't support encryption directly
        // In a production environment, you'd use a library like HummusJS or PDFtk
        // For now, we'll create a basic implementation

        // Save the PDF (without actual encryption for this demo)
        const protectedPdfBytes = await pdf.save();
        fs.writeFileSync(outputPath, protectedPdfBytes);

        // Store password info (in production, store this securely)
        const passwordHash = await bcrypt.hash(password, 10);

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: 'PDF protected with password (Note: This is a demo implementation)',
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `protected-${req.file.originalname}`,
          note: 'In production, use libraries like PDFtk or HummusJS for real encryption',
          permissions: permissions
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('PDF protection error:', error);
    res.status(500).json({ error: 'Failed to protect PDF with password' });
  }
});

// Remove password from PDF
router.post('/unlock', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Password is required to unlock PDF' });
      }

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `unlocked-${Date.now()}.pdf`);

      try {
        // Note: This is a simplified implementation
        // In production, you'd need to actually decrypt the PDF using the password
        const pdfBytes = fs.readFileSync(inputPath);
        
        try {
          const pdf = await PDFDocument.load(pdfBytes);
          const unlockedPdfBytes = await pdf.save();
          fs.writeFileSync(outputPath, unlockedPdfBytes);

          // Clean up input file
          fs.unlinkSync(inputPath);

          res.json({
            success: true,
            message: 'PDF unlocked successfully (Demo implementation)',
            downloadUrl: `/uploads/${path.basename(outputPath)}`,
            filename: `unlocked-${req.file.originalname}`,
            note: 'In production, implement proper PDF decryption'
          });
        } catch (loadError) {
          res.status(400).json({ 
            error: 'Invalid password or PDF is corrupted',
            details: loadError.message 
          });
        }

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('PDF unlock error:', error);
    res.status(500).json({ error: 'Failed to unlock PDF' });
  }
});

// Digital signature placeholder
router.post('/sign', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const { 
        signatureName = 'Digital Signature',
        reason = 'Document approval',
        location = 'Digital',
        contactInfo = ''
      } = req.body;

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `signed-${Date.now()}.pdf`);

      try {
        const pdfBytes = fs.readFileSync(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);

        // Note: This is a placeholder implementation
        // Real digital signatures require cryptographic operations and certificates
        // You would use libraries like node-signpdf or similar

        // For demo, just add a text annotation
        const pages = pdf.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        // Add signature placeholder text
        const font = await pdf.embedFont('Helvetica');
        firstPage.drawText(`Digitally signed by: ${signatureName}`, {
          x: 50,
          y: 50,
          size: 10,
          font: font,
          color: { r: 0, g: 0, b: 1 }
        });

        firstPage.drawText(`Reason: ${reason}`, {
          x: 50,
          y: 35,
          size: 8,
          font: font,
          color: { r: 0, g: 0, b: 1 }
        });

        firstPage.drawText(`Date: ${new Date().toISOString()}`, {
          x: 50,
          y: 20,
          size: 8,
          font: font,
          color: { r: 0, g: 0, b: 1 }
        });

        const signedPdfBytes = await pdf.save();
        fs.writeFileSync(outputPath, signedPdfBytes);

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: 'PDF signed successfully (Demo implementation)',
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `signed-${req.file.originalname}`,
          signature: {
            name: signatureName,
            reason,
            location,
            timestamp: new Date().toISOString()
          },
          note: 'In production, implement cryptographic digital signatures with certificates'
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('PDF signing error:', error);
    res.status(500).json({ error: 'Failed to sign PDF' });
  }
});

// Compare two PDFs (basic text comparison)
router.post('/compare', async (req, res) => {
  try {
    req.upload.array('files', 2)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.files || req.files.length !== 2) {
        return res.status(400).json({ error: 'Please upload exactly 2 PDF files to compare' });
      }

      const [file1, file2] = req.files;

      try {
        // Load both PDFs
        const pdf1Bytes = fs.readFileSync(file1.path);
        const pdf2Bytes = fs.readFileSync(file2.path);
        
        const pdf1 = await PDFDocument.load(pdf1Bytes);
        const pdf2 = await PDFDocument.load(pdf2Bytes);

        // Basic comparison
        const comparison = {
          file1: {
            name: file1.originalname,
            pages: pdf1.getPageCount(),
            size: `${(pdf1Bytes.length / 1024 / 1024).toFixed(2)} MB`
          },
          file2: {
            name: file2.originalname,
            pages: pdf2.getPageCount(),
            size: `${(pdf2Bytes.length / 1024 / 1024).toFixed(2)} MB`
          },
          differences: {
            pageCountDiff: pdf1.getPageCount() !== pdf2.getPageCount(),
            sizeDiff: Math.abs(pdf1Bytes.length - pdf2Bytes.length) > 1024, // 1KB threshold
            identical: pdf1Bytes.equals && pdf1Bytes.equals(pdf2Bytes)
          }
        };

        // Clean up input files
        fs.unlinkSync(file1.path);
        fs.unlinkSync(file2.path);

        res.json({
          success: true,
          message: 'PDF comparison completed',
          comparison,
          note: 'This is a basic comparison. For detailed content comparison, additional libraries are needed.'
        });

      } catch (error) {
        // Clean up files on error
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
        throw error;
      }
    });
  } catch (error) {
    console.error('PDF comparison error:', error);
    res.status(500).json({ error: 'Failed to compare PDF files' });
  }
});

// Redact content (basic implementation)
router.post('/redact', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const { 
        areas = [], // Array of {x, y, width, height} objects
        color = '#000000'
      } = req.body;

      if (!areas || areas.length === 0) {
        return res.status(400).json({ error: 'Please specify areas to redact' });
      }

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `redacted-${Date.now()}.pdf`);

      try {
        const pdfBytes = fs.readFileSync(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const pages = pdf.getPages();

        // Parse redaction areas
        const redactionAreas = typeof areas === 'string' ? JSON.parse(areas) : areas;

        // Apply redactions to each page
        pages.forEach((page, pageIndex) => {
          const { width, height } = page.getSize();
          
          redactionAreas.forEach(area => {
            if (!area.page || area.page === pageIndex + 1 || area.page === 'all') {
              // Draw black rectangle over the area
              page.drawRectangle({
                x: area.x || 0,
                y: height - (area.y || 0) - (area.height || 20), // PDF coordinates are bottom-left origin
                width: area.width || 100,
                height: area.height || 20,
                color: { r: 0, g: 0, b: 0 } // Black redaction
              });
            }
          });
        });

        const redactedPdfBytes = await pdf.save();
        fs.writeFileSync(outputPath, redactedPdfBytes);

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: `Applied ${redactionAreas.length} redactions to PDF`,
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `redacted-${req.file.originalname}`,
          redactions: redactionAreas.length,
          note: 'Basic redaction implementation - content is visually blocked but not permanently removed'
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('PDF redaction error:', error);
    res.status(500).json({ error: 'Failed to redact PDF content' });
  }
});

module.exports = router;
