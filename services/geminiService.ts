import { GoogleGenAI, Type } from "@google/genai";
import { Month } from '../types';

export const parseBudgetInput = async (input: string): Promise<{ name: string; amount: number; month: Month; type: string } | null> => {
  if (!process.env.API_KEY) {
    console.error("API Key not found");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract budget event details from the following text: "${input}". 
      Map the month to one of these exact keys: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan (Next Year).
      If the month is not specified, guess based on context or default to "TBD".
      Determine the Type from: Event, Birthday, Trip, Dinner, Sport.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Name of the event or expense" },
            amount: { type: Type.NUMBER, description: "Cost of the event. If unknown, use 0" },
            month: { type: Type.STRING, description: "The month of the event" },
            type: { type: Type.STRING, description: "Category of the event" }
          },
          required: ["name", "amount", "month", "type"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);
    
    // Validate month
    const validMonths = Object.values(Month);
    let mappedMonth = Month.Jan; // Default
    if (validMonths.includes(data.month as Month)) {
        mappedMonth = data.month as Month;
    }

    return {
        name: data.name,
        amount: data.amount,
        month: mappedMonth,
        type: data.type
    };

  } catch (error) {
    console.error("Error parsing with Gemini:", error);
    return null;
  }
};
