import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalysisResult } from './types';
import AnxietyIllustration from './illustrations/AnxietyIllustration';
import DepressionIllustration from './illustrations/DepressionIllustration';
import StressIllustration from './illustrations/StressIllustration';
import SleepIllustration from './illustrations/SleepIllustration';
import SocialIllustration from './illustrations/SocialIllustration';
import AssessmentCharts from './visualizations/AssessmentCharts';

interface SavedAssessment {
  date: string;
  result: AnalysisResult;
  answers: Record<string, number>;
  questionPath: string[];
}

const AssessmentHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [savedAssessments, setSavedAssessments] = useState<SavedAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<SavedAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved assessments from localStorage
    try {
      const savedData = localStorage.getItem('savedAssessments');
      if (savedData) {
        const assessments = JSON.parse(savedData);
        setSavedAssessments(assessments);
        
        // Select the most recent assessment by default if available
        if (assessments.length > 0) {
          setSelectedAssessment(assessments[0]);
        }
      }
    } catch (error) {
      console.error('Error loading saved assessments:', error);
    }
    
    setLoading(false);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getCategoryIcon = (category: string, severity: 'low' | 'moderate' | 'high') => {
    const size = 24;
    
    switch (category) {
      case 'anxiety':
        return <AnxietyIllustration severity={severity} size={size} />;
      case 'depression':
        return <DepressionIllustration severity={severity} size={size} />;
      case 'stress':
        return <StressIllustration severity={severity} size={size} />;
      case 'sleep':
        return <SleepIllustration severity={severity} size={size} />;
      case 'social':
        return <SocialIllustration severity={severity} size={size} />;
      default:
        return null;
    }
  };
  
  const getSeverityColor = (severity: 'low' | 'moderate' | 'high') => {
    switch (severity) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleDeleteAssessment = (index: number) => {
    if (window.confirm('Are you sure you want to delete this assessment?')) {
      const updatedAssessments = [...savedAssessments];
      updatedAssessments.splice(index, 1);
      setSavedAssessments(updatedAssessments);
      localStorage.setItem('savedAssessments', JSON.stringify(updatedAssessments));
      
      if (updatedAssessments.length > 0) {
        setSelectedAssessment(updatedAssessments[0]);
      } else {
        setSelectedAssessment(null);
      }
    }
  };
  
  const handleTakeNewAssessment = () => {
    navigate('/quizpage');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold">Assessment History</h1>
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mb-4"></div>
            <p>Loading your assessment history...</p>
          </div>
        ) : savedAssessments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-md text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-xl font-medium mb-4">No Saved Assessments</h2>
            <p className="text-gray-600 mb-6">You haven't completed any mental health assessments yet, or they haven't been saved.</p>
            <button
              onClick={handleTakeNewAssessment}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Take New Assessment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Assessment List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md p-4 mb-4">
                <h2 className="text-xl font-medium mb-4">Your Assessments</h2>
                <button
                  onClick={handleTakeNewAssessment}
                  className="w-full mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Take New Assessment
                </button>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {savedAssessments.map((assessment, index) => {
                    // Find the highest severity category
                    let highestSeverity: 'low' | 'moderate' | 'high' = 'low';
                    Object.values(assessment.result.categories).forEach(category => {
                      if (category.severity === 'high') highestSeverity = 'high';
                      else if (category.severity === 'moderate' && highestSeverity === 'low') highestSeverity = 'moderate';
                    });
                    
                    return (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAssessment && assessment.date === selectedAssessment.date
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedAssessment(assessment)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{formatDate(assessment.date)}</div>
                            <div className="text-sm text-gray-500">
                              {Object.keys(assessment.answers).length} questions answered
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(highestSeverity)}`}>
                            {highestSeverity}
                          </span>
                        </div>
                        <div className="mt-2 flex space-x-1">
                          {Object.entries(assessment.result.categories).map(([category, data]) => (
                            <div 
                              key={category} 
                              className="w-6 h-6" 
                              title={`${category}: ${data.severity}`}
                            >
                              {getCategoryIcon(category, data.severity)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Assessment Details */}
            <div className="lg:col-span-2">
              {selectedAssessment ? (
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-medium">Assessment Details</h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDeleteAssessment(savedAssessments.findIndex(a => a.date === selectedAssessment.date))}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete assessment"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-4">
                    Taken on {formatDate(selectedAssessment.date)}
                  </div>
                  
                  {/* Data Visualization (only show if there are at least 2 assessments) */}
                  {savedAssessments.length >= 2 && (
                    <div className="mb-6">
                      <h3 className="font-medium mb-2">Progress Visualization</h3>
                      <AssessmentCharts assessments={savedAssessments} />
                    </div>
                  )}
                  
                  {/* Overall Analysis */}
                  <div className="p-4 rounded-lg bg-gray-50 mb-6">
                    <h3 className="font-medium mb-2">Overall Analysis</h3>
                    <p className="text-gray-700">{selectedAssessment.result.overallAnalysis}</p>
                  </div>
                  
                  {/* Category Results */}
                  <h3 className="font-medium mb-2">Category Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {Object.entries(selectedAssessment.result.categories).map(([category, data]) => (
                      <div key={category} className="p-4 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <div className="w-6 h-6 mr-2">
                              {getCategoryIcon(category, data.severity)}
                            </div>
                            <h4 className="font-medium capitalize">{category}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(data.severity)}`}>
                            {data.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{data.summary}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Recommendations */}
                  <h3 className="font-medium mb-2">Recommendations</h3>
                  <div className="p-4 rounded-lg bg-gray-50">
                    <ul className="list-disc pl-5 space-y-1 text-gray-700">
                      {selectedAssessment.result.recommendations.map((recommendation, index) => (
                        <li key={index}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-md p-6 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">Select an Assessment</h3>
                  <p className="text-gray-600">Choose an assessment from the list to view its details.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentHistoryPage; 