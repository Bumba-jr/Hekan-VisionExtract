import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export interface RegistrationRow {
  sNo: string;
  fullName: string;
  position: string;
  dcc: string;
  lcc: string;
  phone: string;
  email: string;
  paymentInfo: string;
  amount: string;
}

export interface ExtractedData {
  fileName: string;
  rows: RegistrationRow[];
}

export async function extractTextFromImage(base64Data: string, fileName: string, mimeType: string): Promise<ExtractedData> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          parts: [
            {
              text: `Extract registration data from this image of a HEKAN 60TH NATIONAL CONVENTION REGISTRATION FORM.
              
              The table has the following columns:
              1. S/NO
              2. Full Name
              3. Position in the church
              4. District Church Council (DCC) & GCC Office/Mission Field
              5. Local Church Council (LCC) & GCC Office/Mission Field
              6. Phone Number (if Available)
              7. Email address (If available)
              8. Bank (POS) Payment Receipt/Transaction ID or Cash
              9. Amount
              
              IMPORTANT INSTRUCTIONS:
              - EXTRACT EVERY ROW: Each person must be a separate object in the 'rows' array. Do not combine multiple people into one row.
              - RESOLVE DITTO MARKS: If you see "11", "''", or any symbol indicating "same as above" in any column (especially in Payment Info or Amount), you MUST replace it with the actual value from the row immediately above it. For example, if row 1 says "Cash" and row 2 says "11", row 2's paymentInfo should be "Cash".
              - DATA CLEANING: Ensure names are properly capitalized. Ensure phone numbers and emails are extracted correctly.
              - BLANK FIELDS: If a field is empty, use an empty string "".
              
              Return the result as a JSON object with a 'rows' array.`,
            },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sNo: { type: Type.STRING },
                  fullName: { type: Type.STRING },
                  position: { type: Type.STRING },
                  dcc: { type: Type.STRING },
                  lcc: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  email: { type: Type.STRING },
                  paymentInfo: { type: Type.STRING },
                  amount: { type: Type.STRING },
                },
                required: ["sNo", "fullName", "position", "dcc", "lcc", "phone", "email", "paymentInfo", "amount"],
              },
            },
          },
          required: ["rows"],
        },
      },
    });

    const result = JSON.parse(response.text || '{"rows":[]}');

    return {
      fileName,
      rows: result.rows || [],
    };
  } catch (error) {
    console.error("Error extracting text:", error);
    return {
      fileName,
      rows: [],
    };
  }
}
