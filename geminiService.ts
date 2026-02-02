
import { GoogleGenAI, Type } from "@google/genai";

export const analyzeCarpentryPhoto = async (base64Image: string) => {
  // Always use the API key from environment variables directly.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      // Simplified contents structure as per guidelines for multi-part requests.
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Identify the furniture issue in this photo. Be specific about what needs fixing (e.g., loose hinge, broken handle, termite damage). Provide a short 1-sentence description in English and Hindi." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            issue: { type: Type.STRING },
            issueHindi: { type: Type.STRING },
            estimatedCategory: { type: Type.STRING, description: "One of: door, cupboard, table, chair, other" },
            isSmallJob: { type: Type.BOOLEAN }
          },
          required: ["issue", "issueHindi", "estimatedCategory", "isSmallJob"]
        }
      }
    });

    // response.text is a property, not a method.
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};
