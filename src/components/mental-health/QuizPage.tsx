import React, { useState, useEffect, useRef, useCallback } from 'react';
import { questions as allQuestions } from './questions';
import { analyzeResponses } from './analyzer';
import { QuizState, AnalysisResult, Question } from './types';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { determineNextQuestion } from './questionLogic';
import AnxietyIllustration from './illustrations/AnxietyIllustration';
import DepressionIllustration from './illustrations/DepressionIllustration';
import StressIllustration from './illustrations/StressIllustration';
import SleepIllustration from './illustrations/SleepIllustration';
import SocialIllustration from './illustrations/SocialIllustration';
import CrisisResources from './CrisisResources';
import { useNavigate } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: {},
    completed: false,
    questionPath: [] // Track the path of questions we've shown
  });
  const [currentQuestion, setCurrentQuestion] = useState<Question>(allQuestions[0]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questionHistory, setQuestionHistory] = useState<Question[]>([allQuestions[0]]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const questionRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLDivElement>(null);

  // Calculate progress based on answers given, not fixed question list
  const progress = Math.min(
    ((Object.keys(state.answers).length) / 10) * 100, 
    100
  );

  // Check if there are any high severity categories
  const hasCriticalSeverity = result && 
    Object.values(result.categories).some(category => category.severity === 'high');
  
  // Identify the most severe category for targeted resources
  const getMostSevereCategory = (): { category: string, severity: 'low' | 'moderate' | 'high' } => {
    if (!result) return { category: 'general', severity: 'low' };
    
    let mostSevereCategory = 'general';
    let highestSeverity: 'low' | 'moderate' | 'high' = 'low';
    
    Object.entries(result.categories).forEach(([category, data]) => {
      if (data.severity === 'high' && highestSeverity !== 'high') {
        mostSevereCategory = category;
        highestSeverity = 'high';
      } else if (data.severity === 'moderate' && highestSeverity === 'low') {
        mostSevereCategory = category;
        highestSeverity = 'moderate';
      }
    });
    
    return { category: mostSevereCategory, severity: highestSeverity };
  };

  // Determine the next question based on previous answers
  const getNextQuestion = useCallback(() => {
    if (Object.keys(state.answers).length >= 10) {
      // End quiz after 10 questions
      return null;
    }
    
    // Get the next question using our decision logic
    const nextQuestion = determineNextQuestion(
      currentQuestion,
      state.answers,
      questionHistory
    );
    
    return nextQuestion;
  }, [currentQuestion, state.answers, questionHistory]);
  
  // Function to handle sharing results
  const handleShareResults = () => {
    setShowShareOptions(!showShareOptions);
  };
  
  // Function to save results to local storage
  const handleSaveResults = () => {
    if (!result) return;
    
    try {
      // Get existing saved assessments or initialize empty array
      const savedAssessments = JSON.parse(localStorage.getItem('savedAssessments') || '[]');
      
      // Add new assessment with timestamp
      savedAssessments.push({
        date: new Date().toISOString(),
        result,
        answers: state.answers,
        questionPath: state.questionPath
      });
      
      // Save back to localStorage
      localStorage.setItem('savedAssessments', JSON.stringify(savedAssessments));
      
      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving assessment:', error);
    }
  };
  
  // Function to handle email form submission
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real app, this would connect to a backend service to send emails
    // For now, we'll just simulate success
    setEmailSuccess(true);
    setTimeout(() => {
      setEmailSuccess(false);
      setShowEmailForm(false);
    }, 3000);
  };

  useEffect(() => {
    // Initial setup
    setIsLoading(true);
    setSelectedOption(null);
    
    if (currentQuestion && questionRef.current && optionsRef.current) {
      // Create dynamic gradient background animation
      if (containerRef.current) {
        const colors = [
          'rgba(245,245,240,1)',
          'rgba(255,255,255,0.8)',
          'rgba(240,240,235,1)',
          'rgba(250,250,245,0.9)'
        ];

        gsap.to(containerRef.current, {
          background: `radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, ${colors[Math.floor(Math.random() * colors.length)]} 0%, ${colors[Math.floor(Math.random() * colors.length)]} 70%)`,
          duration: 15,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      }

      // Update progress bar with animation
      if (progressBarRef.current) {
        gsap.to(progressBarRef.current, {
          width: `${progress}%`,
          duration: 1,
          ease: "power2.out"
        });
      }

      if (progressTextRef.current) {
        gsap.to(progressTextRef.current, {
          opacity: 0,
          duration: 0.3,
          onComplete: () => {
            if (progressTextRef.current) {
              progressTextRef.current.textContent = `Question ${Object.keys(state.answers).length + 1} of 10`;
              gsap.to(progressTextRef.current, {
                opacity: 1,
                duration: 0.3
              });
            }
          }
        });
      }

      // Reset elements
      gsap.set(questionRef.current, {
        opacity: 0,
        y: 50
      });

      // Ensure options are visible initially but transparent
      const options = optionsRef.current.children;
      gsap.set(options, {
        opacity: 0,
        y: 20
      });

      // Start animations
      const timeline = gsap.timeline({
        onComplete: () => setIsLoading(false)
      });

      timeline
        .to(questionRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out"
        })
        .to(options, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out"
        }, "-=0.4");
    }
  }, [currentQuestion, progress, state.answers.length]);

  useEffect(() => {
    // If the assessment is completed and we have results, animate them in
    if (state.completed && result && questionRef.current) {
      gsap.fromTo(questionRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
      );
    }
  }, [state.completed, result]);

  const handleAnswer = (value: number) => {
    if (isLoading) return; // Prevent multiple clicks during animation

    // Set selected option for visual feedback
    setSelectedOption(value);
    
    // Delay state update to allow for option selection animation
    setTimeout(() => {
      const newAnswers = {
        ...state.answers,
        [currentQuestion.id]: value
      };

      setIsLoading(true);

      // Animate out current question
      const timeline = gsap.timeline({
        onComplete: () => {
          // Reset positions for next animation
          if (questionRef.current && optionsRef.current) {
            gsap.set([questionRef.current, optionsRef.current.children], {
              opacity: 0,
              y: 20
            });
          }

          // Get the next question based on answer history
          const nextQuestion = getNextQuestion();
          
          if (!nextQuestion || Object.keys(newAnswers).length >= 10) {
            const analysisResult = analyzeResponses(newAnswers);
            setState({
              ...state,
              answers: newAnswers,
              completed: true
            });
            setResult(analysisResult);
            
            // Check for critical responses and potential self-harm risk
            const depressionAnswers = Object.entries(newAnswers)
              .filter(([questionId]) => questionId.startsWith('dep-'))
              .map(([, value]) => value);
            
            // Log the assessment for research purposes (in a real app, this would be sent to a backend)
            console.log('Assessment completed:', {
              answers: newAnswers,
              result: analysisResult,
              timestamp: new Date().toISOString()
            });
          } else {
            setQuestionHistory(prev => [...prev, nextQuestion]);
            setCurrentQuestion(nextQuestion);
            setState({
              ...state,
              answers: newAnswers,
              questionPath: [...state.questionPath, currentQuestion.id]
            });
          }
        }
      });

      if (questionRef.current && optionsRef.current) {
        timeline.to([questionRef.current, optionsRef.current.children], {
          opacity: 0,
          y: -30,
          duration: 0.5,
          stagger: 0.05,
          ease: "power2.inOut"
        });
      }
    }, 400); // Short delay for visual feedback
  };

  const goBackToHome = () => {
    navigate('/');
  };

  const renderQuestion = () => {
    const { text, options = [] } = currentQuestion;

    return (
      <div className="max-w-2xl mx-auto">
        <div 
          ref={questionRef}
          className="mb-10 opacity-0"
        >
          <h2 className="text-2xl md:text-3xl font-medium mb-2">{text}</h2>
          <p className="text-gray-500 text-sm">
            Select the option that best describes your experience over the past two weeks.
          </p>
        </div>
        
        <div ref={optionsRef} className="space-y-3">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(option.value)}
              className={`w-full text-left p-4 rounded-lg transition-all duration-300 transform hover:scale-[1.01] ${
                selectedOption === option.value
                  ? 'bg-blue-50 border-blue-200 border-2'
                  : 'bg-white hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center transition-all ${
                  selectedOption === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200'
                }`}>
                  {selectedOption === option.value && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span>{option.text}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!result) return null;
    
    const { category, severity } = getMostSevereCategory();
    const showCrisisResources = severity === 'high' || severity === 'moderate';

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 opacity-0" ref={questionRef}>
        <h2 className="text-3xl font-semibold mb-6 text-center">Your Mental Health Assessment</h2>
        
        {/* Show crisis resources for high severity results */}
        {showCrisisResources && (
          <CrisisResources 
            severity={severity} 
            category={category}
          />
        )}
        
        {/* Results Content */}
        <div className="space-y-8">
          {/* Overall Analysis */}
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-xl font-medium mb-4">Overall Analysis</h3>
            <p className="text-gray-700">{result.overallAnalysis}</p>
          </div>
          
          {/* Category Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(result.categories).map(([category, data]) => (
              <div key={category} className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-medium capitalize">{category}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    data.severity === 'low' ? 'bg-green-100 text-green-800' : 
                    data.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {data.severity}
                  </span>
                </div>
                
                <p className="text-gray-700 mb-4">{data.summary}</p>
                
                {/* Render appropriate illustration based on category */}
                <div className="flex justify-center my-4">
                  {category === 'anxiety' && (
                    <AnxietyIllustration severity={data.severity} size={150} />
                  )}
                  {category === 'depression' && (
                    <DepressionIllustration severity={data.severity} size={150} />
                  )}
                  {category === 'stress' && (
                    <StressIllustration severity={data.severity} size={150} />
                  )}
                  {category === 'sleep' && (
                    <SleepIllustration severity={data.severity} size={150} />
                  )}
                  {category === 'social' && (
                    <SocialIllustration severity={data.severity} size={150} />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Recommendations */}
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-xl font-medium mb-4">Recommendations</h3>
            <ul className="list-disc pl-5 space-y-2">
              {result.recommendations.map((recommendation, index) => (
                <li key={index} className="text-gray-700">{recommendation}</li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <button 
              onClick={goBackToHome}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors"
            >
              Back to Home
            </button>

            <button 
              onClick={handleSaveResults}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition-colors relative"
            >
              {saveSuccess ? 'Saved!' : 'Save Results'}
              {saveSuccess && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  ✓
                </span>
              )}
            </button>
            
            <button 
              onClick={handleShareResults}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow transition-colors"
            >
              Share Results
            </button>
          </div>
          
          {/* Share Options */}
          {showShareOptions && (
            <div className="mt-4 bg-white rounded-xl p-6 shadow-md">
              <h3 className="text-xl font-medium mb-4">Share Options</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowEmailForm(true)}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email Results
                </button>
                
                <button 
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                  onClick={() => {
                    // This would normally generate a PDF - for now just show an alert
                    alert('PDF download would start here.');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
              </div>
              
              {/* Email Form */}
              {showEmailForm && (
                <form onSubmit={handleEmailSubmit} className="mt-6 p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Send Results via Email</h4>
                  
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input 
                      type="email" 
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full p-2 border rounded focus:ring focus:ring-blue-300 focus:outline-none"
                      placeholder="Enter your email address"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button 
                      type="button"
                      onClick={() => setShowEmailForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      {emailSuccess ? 'Sent!' : 'Send Email'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
          
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>This assessment is based on standardized mental health screening tools. Results are not a clinical diagnosis.</p>
            <p className="mt-1">For professional help, consider consulting a licensed mental health provider.</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-[#F5F5F0] py-20 px-4 transition-all duration-1000 ease-in-out"
    >
      {/* Back to Home button at the top */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={goBackToHome}
          className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>
      </div>

      {/* Progress bar */}
      {!state.completed && (
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex justify-between items-center mb-2">
            <div ref={progressTextRef} className="text-sm font-medium text-gray-700">
              Question {Object.keys(state.answers).length + 1} of 10
            </div>
            <div className="text-sm font-medium text-gray-700">
              {Math.round(progress)}%
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              ref={progressBarRef}
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {state.completed ? renderResults() : renderQuestion()}
    </div>
  );
};

export default QuizPage; 