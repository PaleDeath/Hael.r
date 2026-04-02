import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import firebaseAuthService from './firebase.auth.service';

// Assessment interfaces to match your existing MongoDB models
export interface ICategory {
  score: number;
  severity: 'low' | 'moderate' | 'high';
  summary: string;
}

export interface IAssessment {
  id?: string;
  userId: string;
  answers: Record<string, number>;
  questionPath: string[];
  categories: Record<string, ICategory>;
  overallAnalysis: string;
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssessmentData {
  answers: Record<string, number>;
  questionPath: string[];
  categories: Record<string, ICategory>;
  overallAnalysis: string;
  recommendations: string[];
}

class FirebaseAssessmentService {
  private collectionName = 'assessments';

  // Create new assessment
  async createAssessment(assessmentData: CreateAssessmentData) {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated to create assessment');
      }

      const now = new Date();
      const assessment: Omit<IAssessment, 'id'> = {
        userId: user.uid,
        ...assessmentData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...assessment,
        createdAt: Timestamp.fromDate(assessment.createdAt),
        updatedAt: Timestamp.fromDate(assessment.updatedAt)
      });

      return {
        success: true,
        assessment: { id: docRef.id, ...assessment },
        message: 'Assessment created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create assessment',
        error
      };
    }
  }

  // Get assessment by ID
  async getAssessmentById(assessmentId: string) {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const assessmentDoc = await getDoc(doc(db, this.collectionName, assessmentId));
      
      if (!assessmentDoc.exists()) {
        throw new Error('Assessment not found');
      }

      const data = assessmentDoc.data();
      
      // Check if user owns this assessment
      if (data.userId !== user.uid) {
        throw new Error('Not authorized to access this assessment');
      }

      const assessment: IAssessment = {
        id: assessmentDoc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as IAssessment;

      return {
        success: true,
        assessment,
        message: 'Assessment retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get assessment',
        error
      };
    }
  }

  // Get user assessments with pagination
  async getUserAssessments(page: number = 1, pageLimit: number = 10) {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const assessmentsRef = collection(db, this.collectionName);
      let assessmentQuery = query(
        assessmentsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );

      // Handle pagination
      if (page > 1) {
        const previousPageQuery = query(
          assessmentsRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit((page - 1) * pageLimit)
        );
        const previousDocs = await getDocs(previousPageQuery);
        const lastDoc = previousDocs.docs[previousDocs.docs.length - 1];
        
        if (lastDoc) {
          assessmentQuery = query(
            assessmentsRef,
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(pageLimit)
          );
        }
      }

      const snapshot = await getDocs(assessmentQuery);
      const assessments: IAssessment[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as IAssessment[];

      // Get total count for pagination
      const totalQuery = query(
        assessmentsRef,
        where('userId', '==', user.uid)
      );
      const totalSnapshot = await getDocs(totalQuery);
      const total = totalSnapshot.size;

      return {
        success: true,
        assessments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / pageLimit),
          totalAssessments: total,
          hasNextPage: page < Math.ceil(total / pageLimit),
          hasPreviousPage: page > 1
        },
        message: 'Assessments retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get assessments',
        error
      };
    }
  }

  // Get assessment statistics
  async getAssessmentStats() {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const assessmentsRef = collection(db, this.collectionName);
      const userAssessmentsQuery = query(
        assessmentsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(userAssessmentsQuery);
      const assessments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as IAssessment[];

      if (assessments.length === 0) {
        return {
          success: true,
          stats: {
            totalAssessments: 0,
            latestAssessment: null,
            averageScores: {},
            trends: {},
            improvementSuggestions: []
          },
          message: 'No assessments found'
        };
      }

      // Calculate statistics
      const totalAssessments = assessments.length;
      const latestAssessment = assessments[0];
      
      // Calculate average scores across all categories
      const categoryTotals: Record<string, { total: number; count: number }> = {};
      
      assessments.forEach(assessment => {
        Object.entries(assessment.categories).forEach(([category, data]) => {
          if (!categoryTotals[category]) {
            categoryTotals[category] = { total: 0, count: 0 };
          }
          categoryTotals[category].total += data.score;
          categoryTotals[category].count += 1;
        });
      });

      const averageScores = Object.entries(categoryTotals).reduce((acc, [category, data]) => {
        acc[category] = data.total / data.count;
        return acc;
      }, {} as Record<string, number>);

      // Calculate trends (improvement/decline over time)
      const trends: Record<string, 'improving' | 'declining' | 'stable'> = {};
      
      if (assessments.length >= 2) {
        const recent = assessments[0];
        const previous = assessments[1];
        
        Object.keys(recent.categories).forEach(category => {
          const recentScore = recent.categories[category]?.score || 0;
          const previousScore = previous.categories[category]?.score || 0;
          const difference = recentScore - previousScore;
          
          if (Math.abs(difference) < 2) {
            trends[category] = 'stable';
          } else if (difference > 0) {
            trends[category] = 'declining'; // Higher scores typically mean worse in mental health
          } else {
            trends[category] = 'improving';
          }
        });
      }

      // Generate improvement suggestions based on latest assessment
      const improvementSuggestions = this.generateImprovementSuggestions(latestAssessment);

      return {
        success: true,
        stats: {
          totalAssessments,
          latestAssessment,
          averageScores,
          trends,
          improvementSuggestions
        },
        message: 'Assessment statistics retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get assessment statistics',
        error
      };
    }
  }

  // Update assessment (if needed)
  async updateAssessment(assessmentId: string, updateData: Partial<CreateAssessmentData>) {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // First check if assessment exists and user owns it
      const result = await this.getAssessmentById(assessmentId);
      if (!result.success) {
        return result;
      }

      const updateDataWithTimestamp = {
        ...updateData,
        updatedAt: Timestamp.fromDate(new Date())
      };

      await updateDoc(doc(db, this.collectionName, assessmentId), updateDataWithTimestamp);

      return {
        success: true,
        message: 'Assessment updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update assessment',
        error
      };
    }
  }

  // Delete assessment
  async deleteAssessment(assessmentId: string) {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // First check if assessment exists and user owns it
      const result = await this.getAssessmentById(assessmentId);
      if (!result.success) {
        return result;
      }

      await deleteDoc(doc(db, this.collectionName, assessmentId));

      return {
        success: true,
        message: 'Assessment deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete assessment',
        error
      };
    }
  }

  // Generate improvement suggestions based on assessment
  private generateImprovementSuggestions(assessment: IAssessment): string[] {
    const suggestions: string[] = [];
    
    Object.entries(assessment.categories).forEach(([category, data]) => {
      if (data.severity === 'high') {
        switch (category) {
          case 'anxiety':
            suggestions.push('Consider practicing daily meditation or breathing exercises');
            suggestions.push('Try progressive muscle relaxation techniques');
            break;
          case 'depression':
            suggestions.push('Engage in regular physical activity');
            suggestions.push('Connect with friends and family regularly');
            break;
          case 'stress':
            suggestions.push('Implement time management strategies');
            suggestions.push('Practice stress-reduction techniques like yoga');
            break;
          case 'sleep':
            suggestions.push('Establish a consistent sleep schedule');
            suggestions.push('Create a relaxing bedtime routine');
            break;
          case 'social':
            suggestions.push('Join social groups or activities');
            suggestions.push('Practice social skills in low-pressure environments');
            break;
        }
      }
    });

    // Add general suggestions if needed
    if (suggestions.length === 0) {
      suggestions.push('Continue maintaining your current positive mental health practices');
      suggestions.push('Consider regular check-ins with our assessment tool');
    }

    return suggestions;
  }
}

export default new FirebaseAssessmentService(); 