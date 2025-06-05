import React, { useState } from 'react';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
}

const sampleQuestions: Question[] = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: "Paris"
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: "Mars"
  }
];

const QuizPage: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);

  const handleAnswerClick = (selectedAnswer: string) => {
    if (selectedAnswer === sampleQuestions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }

    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < sampleQuestions.length) {
      setCurrentQuestion(nextQuestion);
    } else {
      setShowScore(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          {showScore ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
              <p className="mb-4">You scored {score} out of {sampleQuestions.length}</p>
              <button
                onClick={resetQuiz}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Retry Quiz
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">
                  Question {currentQuestion + 1}/{sampleQuestions.length}
                </h2>
                <p className="text-xl">{sampleQuestions[currentQuestion].question}</p>
              </div>
              <div className="space-y-4">
                {sampleQuestions[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerClick(option)}
                    className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPage; 