import { Request, Response } from 'express';
import Assessment from '../models/assessment.model';
import mongoose from 'mongoose';

// Create a new assessment
export const createAssessment = async (req: Request, res: Response) => {
  try {
    const { 
      answers,
      questionPath,
      categories,
      overallAnalysis,
      recommendations
    } = req.body;

    const userId = req.user._id;

    // Create new assessment
    const assessment = new Assessment({
      user: userId,
      answers,
      questionPath,
      categories,
      overallAnalysis,
      recommendations
    });

    await assessment.save();

    res.status(201).json({
      success: true,
      data: {
        assessment
      }
    });
  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while saving assessment'
    });
  }
};

// Get assessment by ID
export const getAssessmentById = async (req: Request, res: Response) => {
  try {
    const assessmentId = req.params.id;
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

    res.status(200).json({
      success: true,
      data: {
        assessment
      }
    });
  } catch (error) {
    console.error('Get assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving assessment'
    });
  }
};

// Get all assessments for a user
export const getUserAssessments = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Count total assessments
    const total = await Assessment.countDocuments({ user: userId });
    
    // Find assessments for user
    const assessments = await Assessment.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        assessments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user assessments error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving assessments'
    });
  }
};

// Get assessment statistics
export const getAssessmentStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;

    // Find all assessments for user
    const assessments = await Assessment.find({ user: userId })
      .sort({ createdAt: 1 });

    if (assessments.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          stats: {
            totalAssessments: 0,
            categoryTrends: {},
            latestScores: {}
          }
        }
      });
    }

    // Calculate category trends over time
    const categoryTrends: Record<string, { dates: Date[], scores: number[] }> = {
      anxiety: { dates: [], scores: [] },
      depression: { dates: [], scores: [] },
      stress: { dates: [], scores: [] },
      sleep: { dates: [], scores: [] },
      social: { dates: [], scores: [] }
    };

    // Populate trends
    assessments.forEach(assessment => {
      Object.entries(assessment.categories).forEach(([category, data]) => {
        categoryTrends[category].dates.push(assessment.createdAt);
        categoryTrends[category].scores.push(data.score);
      });
    });

    // Get latest scores
    const latestAssessment = assessments[assessments.length - 1];
    const latestScores: Record<string, number> = {};
    
    Object.entries(latestAssessment.categories).forEach(([category, data]) => {
      latestScores[category] = data.score;
    });

    // Return stats
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalAssessments: assessments.length,
          categoryTrends,
          latestScores,
          lastAssessmentDate: latestAssessment.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get assessment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving assessment statistics'
    });
  }
}; 