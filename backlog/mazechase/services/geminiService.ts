import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const FALLBACK_QUESTIONS: Question[] = [
  {
    id: '1',
    text: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctAnswer: '4'
  },
  {
    id: '2',
    text: 'Capital of France?',
    options: ['London', 'Berlin', 'Madrid', 'Paris'],
    correctAnswer: 'Paris'
  },
  {
    id: '3',
    text: 'Color of the sky?',
    options: ['Green', 'Blue', 'Red', 'Yellow'],
    correctAnswer: 'Blue'
  },
  {
    id: '4',
    text: 'Fastest land animal?',
    options: ['Cheetah', 'Lion', 'Horse', 'Sloth'],
    correctAnswer: 'Cheetah'
  },
  {
    id: '5',
    text: 'H2O is water?',
    options: ['True', 'False', 'Maybe', 'No'],
    correctAnswer: 'True'
  }
];

export const generateQuestions = async (topic: string): Promise<Question[]> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found, using fallback questions.");
    return FALLBACK_QUESTIONS;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 multiple-choice questions about "${topic}". 
      Each question must have exactly 4 short options (1-3 words max per option to fit in a game maze).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 4 options"
              },
              correctAnswer: { type: Type.STRING, description: "Must match one of the options exactly" }
            },
            required: ["id", "text", "options", "correctAnswer"]
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as Question[];
      // Shuffle options for gameplay variety if the model didn't
      // Ensure options array exists before sorting to prevent runtime errors
      return data.map(q => ({
        ...q,
        options: (q.options || []).sort(() => Math.random() - 0.5)
      }));
    }
    
    return FALLBACK_QUESTIONS;
  } catch (error) {
    console.error("Failed to generate questions:", error);
    return FALLBACK_QUESTIONS;
  }
};