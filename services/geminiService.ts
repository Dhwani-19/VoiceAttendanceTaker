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
      contents: `I have a list of raw transcribed text where each entry might contain a name and a phone number. 
      Please separate the name from the phone number.
      Fix capitalization and spelling errors for the names.
      Format the phone numbers to a standard format (e.g., XXX-XXX-XXXX) if present. If no phone number is detected, return an empty string for the phone field.
      
      Raw list: ${rawNames}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              original: { type: Type.STRING },
              correctedName: { type: Type.STRING },
              correctedPhone: { type: Type.STRING }
            }
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) return attendees;

    const result = JSON.parse(jsonStr) as { original: string, correctedName: string, correctedPhone: string }[];

    // Map corrections back to the attendee objects
    return attendees.map((attendee, index) => {
      if (result[index]) {
        return {
          ...attendee,
          formattedName: result[index].correctedName,
          formattedPhone: result[index].correctedPhone
        };
      }
      return attendee;
    });

  } catch (error) {
    console.error("Error processing names with Gemini:", error);
    return attendees;
  }
};

export { processNameListWithGemini };
