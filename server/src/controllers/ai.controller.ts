import { Request, Response } from 'express';
import OpenAI from 'openai';
import Question from '../models/question.model';

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Generate dynamic question based on previous answers
export const generateDynamicQuestion = async (req: Request, res: Response) => {
  try {
    const { 
      previousQuestions, 
      answers, 
      category,
      preferredType = 'scale'
    } = req.body;

    // Construct prompt for OpenAI
    const prompt = `
      Based on the following mental health assessment information, generate a thoughtful follow-up question.
      
      Previous questions: ${JSON.stringify(previousQuestions)}
      User's answers: ${JSON.stringify(answers)}
      
      Create a new question for the category: ${category}
      Question type should be: ${preferredType}
      
      The question should dig deeper based on the previous responses and be clinically appropriate.
      
      Format response as JSON with the following structure:
      {
        "id": "unique-id-here", 
        "text": "question text here",
        "category": "${category}",
        "type": "${preferredType}",
        "options": [{"text": "option text", "value": number}, ...],
        "weight": 1
      }
    `;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert mental health professional creating assessment questions." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5
    });

    // Parse the response
    const generatedQuestion = JSON.parse(completion.choices[0].message.content);

    // Save the AI-generated question to the database
    const question = new Question({
      ...generatedQuestion,
      isAiGenerated: true,
      aiGenerationPrompt: prompt
    });

    await question.save();

    res.status(200).json({
      success: true,
      data: {
        question: generatedQuestion
      }
    });
  } catch (error) {
    console.error('AI question generation error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while generating question'
    });
  }
};

// Analyze free text input from user
export const analyzeAssessmentText = async (req: Request, res: Response) => {
  try {
    const { text, context } = req.body;

    // Construct prompt for OpenAI
    const prompt = `
      Analyze the following text from a mental health assessment:
      
      User's text: "${text}"
      
      Assessment context: ${JSON.stringify(context)}
      
      Provide analysis of emotional state, key concerns, and potential areas to explore further.
      
      Format response as JSON with the following structure:
      {
        "emotionalState": "brief description",
        "keyConcerns": ["concern1", "concern2", ...],
        "suggestedExplorationAreas": ["area1", "area2", ...],
        "suggestedFollowUpQuestions": ["question1", "question2", ...]
      }
    `;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert mental health professional analyzing patient responses." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    // Parse the response
    const analysis = JSON.parse(completion.choices[0].message.content);

    res.status(200).json({
      success: true,
      data: {
        analysis
      }
    });
  } catch (error) {
    console.error('AI text analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while analyzing text'
    });
  }
};

// Generate personalized insights
export const generatePersonalizedInsights = async (req: Request, res: Response) => {
  try {
    const { assessmentResults, assessmentHistory } = req.body;

    // Construct prompt for OpenAI
    const prompt = `
      Generate personalized mental health insights based on the following assessment results:
      
      Current assessment: ${JSON.stringify(assessmentResults)}
      Assessment history: ${JSON.stringify(assessmentHistory)}
      
      Provide deeper insights that go beyond the standard analysis, including:
      1. Patterns and trends over time
      2. Connections between different mental health categories
      3. Specific, actionable recommendations
      4. Positive reinforcement of improvements
      
      Format response as JSON with the following structure:
      {
        "insights": ["insight1", "insight2", ...],
        "patterns": ["pattern1", "pattern2", ...],
        "advancedRecommendations": ["rec1", "rec2", ...],
        "positiveObservations": ["obs1", "obs2", ...]
      }
    `;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert mental health professional providing personalized insights." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4
    });

    // Parse the response
    const insights = JSON.parse(completion.choices[0].message.content);

    res.status(200).json({
      success: true,
      data: {
        insights
      }
    });
  } catch (error) {
    console.error('AI insights generation error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while generating insights'
    });
  }
}; 