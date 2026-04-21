import { GoogleGenAI, Type } from "@google/genai";
import { WordChallenge } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchVocabularyRound = async (count: number = 5): Promise<WordChallenge[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} distinct English words or short phrases suitable for a language learning game, along with their correct Portuguese translation and 3 incorrect Portuguese distractors (wrong meanings or visually similar but wrong words).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING, description: "The word in English" },
              correctPortuguese: { type: Type.STRING, description: "The correct Portuguese translation" },
              distractors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 incorrect Portuguese translations",
              },
            },
            required: ["english", "correctPortuguese", "distractors"],
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as WordChallenge[];
    }
    throw new Error("No data returned from Gemini");
  } catch (error) {
    console.error("Error fetching vocabulary:", error);
    // Fallback data in case of API failure or rate limit
    return [
      { english: "To be convincing", correctPortuguese: "Ser convincente", distractors: ["Ser chato", "Estar confuso", "Ter coragem"] },
      { english: "Butterfly", correctPortuguese: "Borboleta", distractors: ["Pássaro", "Abelha", "Formiga"] },
      { english: "Library", correctPortuguese: "Biblioteca", distractors: ["Livraria", "Escola", "Cozinha"] },
      { english: "Strawberry", correctPortuguese: "Morango", distractors: ["Banana", "Uva", "Melancia"] },
      { english: "Keyboard", correctPortuguese: "Teclado", distractors: ["Mouse", "Tela", "Cadeira"] },
    ];
  }
};