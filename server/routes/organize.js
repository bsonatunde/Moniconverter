const express = require('express');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const router = express.Router();

// Merge multiple PDFs
router.post('/merge', async (req, res) => {
  try {
    req.upload.array('files', 10)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.files || req.files.length < 2) {
        return res.status(400).json({ error: 'Please upload at least 2 PDF files to merge' });
      }

      const outputPath = path.join(path.dirname(req.files[0].path), `merged-${Date.now()}.pdf`);

      try {
        // Create a new PDF document
        const mergedPdf = await PDFDocument.create();

        // Process each uploaded PDF
        for (const file of req.files) {
          const pdfBytes = fs.readFileSync(file.path);
          const pdf = await PDFDocument.load(pdfBytes);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        // Save the merged PDF
        const pdfBytes = await mergedPdf.save();
        fs.writeFileSync(outputPath, pdfBytes);

        // Clean up input files
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });

        res.json({
          success: true,
          message: `Successfully merged ${req.files.length} PDF files`,
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `merged-${Date.now()}.pdf`,
          pageCount: mergedPdf.getPageCount()
        });

      } catch (error) {
        // Clean up files on error
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('PDF merge error:', error);
    res.status(500).json({ error: 'Failed to merge PDF files' });
  }
});

// Split PDF into separate pages or ranges
router.post('/split', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const { splitType = 'pages', ranges } = req.body;
      const inputPath = req.file.path;
      const outputFiles = [];

      try {
        const pdfBytes = fs.readFileSync(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const totalPages = pdf.getPageCount();

        if (splitType === 'pages') {
          // Split into individual pages
          for (let i = 0; i < totalPages; i++) {
            const newPdf = await PDFDocument.create();
            const [copiedPage] = await newPdf.copyPages(pdf, [i]);
            newPdf.addPage(copiedPage);

            const outputPath = path.join(
              path.dirname(inputPath), 
              `page-${i + 1}-${Date.now()}.pdf`
            );
            
            const pdfBytes = await newPdf.save();
            fs.writeFileSync(outputPath, pdfBytes);
            
            outputFiles.push({
              filename: `page-${i + 1}.pdf`,
              downloadUrl: `/uploads/${path.basename(outputPath)}`,
              pageNumber: i + 1
            });
          }
        } else if (splitType === 'ranges' && ranges) {
          // Split by custom ranges
          const rangeList = JSON.parse(ranges);
          
          for (let i = 0; i < rangeList.length; i++) {
            const range = rangeList[i];
            const startPage = Math.max(0, range.start - 1);
            const endPage = Math.min(totalPages - 1, range.end - 1);
            
            const newPdf = await PDFDocument.create();
            const pageIndices = [];
            
            for (let j = startPage; j <= endPage; j++) {
              pageIndices.push(j);
            }
            
            const copiedPages = await newPdf.copyPages(pdf, pageIndices);
            copiedPages.forEach(page => newPdf.addPage(page));

            const outputPath = path.join(
              path.dirname(inputPath), 
              `range-${startPage + 1}-${endPage + 1}-${Date.now()}.pdf`
            );
            
            const pdfBytes = await newPdf.save();
            fs.writeFileSync(outputPath, pdfBytes);
            
            outputFiles.push({
              filename: `pages-${startPage + 1}-to-${endPage + 1}.pdf`,
              downloadUrl: `/uploads/${path.basename(outputPath)}`,
              pageRange: `${startPage + 1}-${endPage + 1}`
            });
          }
        }

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: `PDF split into ${outputFiles.length} files`,
          files: outputFiles,
          originalPageCount: totalPages
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        outputFiles.forEach(file => {
          const filePath = path.join(path.dirname(inputPath), path.basename(file.downloadUrl));
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
        throw error;
      }
    });
  } catch (error) {
    console.error('PDF split error:', error);
    res.status(500).json({ error: 'Failed to split PDF file' });
  }
});

// Remove specific pages from PDF
router.post('/remove-pages', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const { pagesToRemove } = req.body;
      
      if (!pagesToRemove) {
        return res.status(400).json({ error: 'Please specify pages to remove' });
      }

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `pages-removed-${Date.now()}.pdf`);

      try {
        const pdfBytes = fs.readFileSync(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const totalPages = pdf.getPageCount();
        
        // Parse pages to remove (can be comma-separated list like "1,3,5" or "1-3,5")
        const pagesToRemoveArray = [];
        const ranges = pagesToRemove.split(',');
        
        ranges.forEach(range => {
          range = range.trim();
          if (range.includes('-')) {
            const [start, end] = range.split('-').map(num => parseInt(num.trim()));
            for (let i = start; i <= end; i++) {
              if (i >= 1 && i <= totalPages) {
                pagesToRemoveArray.push(i - 1); // Convert to 0-based index
              }
            }
          } else {
            const pageNum = parseInt(range);
            if (pageNum >= 1 && pageNum <= totalPages) {
              pagesToRemoveArray.push(pageNum - 1); // Convert to 0-based index
            }
          }
        });

        // Create new PDF with remaining pages
        const newPdf = await PDFDocument.create();
        const pagesToKeep = [];
        
        for (let i = 0; i < totalPages; i++) {
          if (!pagesToRemoveArray.includes(i)) {
            pagesToKeep.push(i);
          }
        }

        if (pagesToKeep.length === 0) {
          return res.status(400).json({ error: 'Cannot remove all pages from PDF' });
        }

        const copiedPages = await newPdf.copyPages(pdf, pagesToKeep);
        copiedPages.forEach(page => newPdf.addPage(page));

        // Save the new PDF
        const newPdfBytes = await newPdf.save();
        fs.writeFileSync(outputPath, newPdfBytes);

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: `Removed ${pagesToRemoveArray.length} pages from PDF`,
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `pages-removed-${req.file.originalname}`,
          originalPageCount: totalPages,
          newPageCount: pagesToKeep.length,
          removedPages: pagesToRemoveArray.map(p => p + 1).join(', ')
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('Remove pages error:', error);
    res.status(500).json({ error: 'Failed to remove pages from PDF' });
  }
});

// Extract specific pages from PDF
router.post('/extract-pages', async (req, res) => {
  try {
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const { pagesToExtract } = req.body;
      
      if (!pagesToExtract) {
        return res.status(400).json({ error: 'Please specify pages to extract' });
      }

      const inputPath = req.file.path;
      const outputPath = path.join(path.dirname(inputPath), `extracted-pages-${Date.now()}.pdf`);

      try {
        const pdfBytes = fs.readFileSync(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const totalPages = pdf.getPageCount();
        
        // Parse pages to extract
        const pagesToExtractArray = [];
        const ranges = pagesToExtract.split(',');
        
        ranges.forEach(range => {
          range = range.trim();
          if (range.includes('-')) {
            const [start, end] = range.split('-').map(num => parseInt(num.trim()));
            for (let i = start; i <= end; i++) {
              if (i >= 1 && i <= totalPages) {
                pagesToExtractArray.push(i - 1); // Convert to 0-based index
              }
            }
          } else {
            const pageNum = parseInt(range);
            if (pageNum >= 1 && pageNum <= totalPages) {
              pagesToExtractArray.push(pageNum - 1); // Convert to 0-based index
            }
          }
        });

        if (pagesToExtractArray.length === 0) {
          return res.status(400).json({ error: 'No valid pages specified for extraction' });
        }

        // Create new PDF with extracted pages
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdf, pagesToExtractArray);
        copiedPages.forEach(page => newPdf.addPage(page));

        // Save the new PDF
        const newPdfBytes = await newPdf.save();
        fs.writeFileSync(outputPath, newPdfBytes);

        // Clean up input file
        fs.unlinkSync(inputPath);

        res.json({
          success: true,
          message: `Extracted ${pagesToExtractArray.length} pages from PDF`,
          downloadUrl: `/uploads/${path.basename(outputPath)}`,
          filename: `extracted-pages-${req.file.originalname}`,
          originalPageCount: totalPages,
          extractedPageCount: pagesToExtractArray.length,
          extractedPages: pagesToExtractArray.map(p => p + 1).join(', ')
        });

      } catch (error) {
        // Clean up files on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
      }
    });
  } catch (error) {
    console.error('Extract pages error:', error);
    res.status(500).json({ error: 'Failed to extract pages from PDF' });
  }
});

module.exports = router;
