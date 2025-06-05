import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Assessment from '../models/assessment.model';
import mongoose from 'mongoose';

// Helper function to create PDF
const createAssessmentPdf = (assessment: any, outputPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(outputPath);
      
      // Set up event handlers
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
      
      // Pipe the PDF to the file
      doc.pipe(writeStream);
      
      // Add title
      doc.fontSize(25)
        .font('Helvetica-Bold')
        .text('Mental Health Assessment Report', { align: 'center' })
        .moveDown(1);
      
      // Add date
      doc.fontSize(12)
        .font('Helvetica')
        .text(`Date: ${new Date(assessment.createdAt).toLocaleDateString()}`, { align: 'right' })
        .moveDown(2);
      
      // Add overall analysis
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .text('Overall Analysis')
        .moveDown(0.5);
      
      doc.fontSize(12)
        .font('Helvetica')
        .text(assessment.overallAnalysis, { align: 'justify' })
        .moveDown(2);
      
      // Add category results
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .text('Category Results')
        .moveDown(0.5);
      
      Object.entries(assessment.categories).forEach(([category, data]: [string, any]) => {
        doc.fontSize(14)
          .font('Helvetica-Bold')
          .text(category.charAt(0).toUpperCase() + category.slice(1))
          .moveDown(0.2);
        
        doc.fontSize(12)
          .font('Helvetica')
          .text(`Score: ${data.score.toFixed(1)}%`)
          .text(`Severity: ${data.severity}`)
          .text(`Summary: ${data.summary}`)
          .moveDown(1);
      });
      
      // Add recommendations
      doc.addPage();
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .text('Recommendations')
        .moveDown(0.5);
      
      assessment.recommendations.forEach((recommendation: string, index: number) => {
        doc.fontSize(12)
          .font('Helvetica')
          .text(`${index + 1}. ${recommendation}`)
          .moveDown(0.5);
      });
      
      // Add disclaimer
      doc.moveDown(2);
      doc.fontSize(10)
        .font('Helvetica-Oblique')
        .text('Disclaimer: This assessment is for informational purposes only and should not be considered as a clinical diagnosis. If you are experiencing severe symptoms, please seek professional help.', { align: 'center' });
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
};

// Generate PDF from assessment
export const generatePdf = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user._id;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID format'
      });
    }

    // Find assessment
    const assessment = await Assessment.findById(assessmentId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Check if assessment belongs to user
    if (assessment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this assessment'
      });
    }

    // Create directory for PDFs if it doesn't exist
    const pdfDir = path.join(__dirname, '../../pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // Create PDF filename
    const filename = `assessment-${assessmentId}-${Date.now()}.pdf`;
    const pdfPath = path.join(pdfDir, filename);

    // Generate PDF
    await createAssessmentPdf(assessment, pdfPath);

    // Set headers and send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    // Stream the file
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
    
    // Delete file after sending
    fileStream.on('end', () => {
      fs.unlinkSync(pdfPath);
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while generating PDF'
    });
  }
};

// Create shareable link for assessment
export const createShareableLink = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user._id;
    const { expiration = 7 } = req.body; // Days until link expires, default 7 days

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID format'
      });
    }

    // Find assessment
    const assessment = await Assessment.findById(assessmentId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Check if assessment belongs to user
    if (assessment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this assessment'
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expiration);

    // In a production environment, this would be saved to a database
    // For now, we'll simulate this with a mock response
    
    // Base URL from environment or default
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareableUrl = `${baseUrl}/shared-assessment/${token}`;

    // Return shareable link details
    res.status(200).json({
      success: true,
      data: {
        url: shareableUrl,
        expiresAt: expirationDate,
        token
      }
    });

  } catch (error) {
    console.error('Create shareable link error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating shareable link'
    });
  }
}; 