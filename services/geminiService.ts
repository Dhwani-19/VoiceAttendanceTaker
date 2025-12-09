import { GoogleGenAI, Type } from "@google/genai";
import { Attendee } from "../types";

const processNameListWithGemini = async (attendees: Attendee[]): Promise<Attendee[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing");
    return attendees; // Return original list if no key
  }

  const ai = new GoogleGenAI({ apiKey });

  const rawNames = attendees.map(a => a.rawInput).join(", ");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `I have a list of raw transcribed names from a speech-to-text system. 
      Please fix capitalization, spelling errors that look like common names, and remove any non-name filler words.
      
      Raw list: ${rawNames}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              original: { type: Type.STRING },
              corrected: { type: Type.STRING }
            }
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) return attendees;

    const result = JSON.parse(jsonStr) as { original: string, corrected: string }[];
    
    // Map corrections back to the attendee objects
    return attendees.map((attendee, index) => {
       // We assume the order is preserved, but let's be safe and try to map by index if count matches
       // or just return the corrected name if the array lengths match.
       if (result[index]) {
         return { ...attendee, formattedName: result[index].corrected };
       }
       return attendee;
    });

  } catch (error) {
    console.error("Error processing names with Gemini:", error);
    return attendees;
  }
};

export { processNameListWithGemini };