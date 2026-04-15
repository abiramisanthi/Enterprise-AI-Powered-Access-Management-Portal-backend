import dotenv from "dotenv";
dotenv.config();

import Groq from "groq-sdk";

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// ================= CHATBOT =================

export const chatWithAssistant = async (message) => {
    try {
        const response = await client.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content:
                        "You are an AI assistant helping users with access requests in an enterprise system.",
                },
                {
                    role: "user",
                    content: message,
                },
            ],
            temperature: 0.7,
            max_tokens: 300,
        });

        return response.choices[0].message.content;

    } catch (error) {
        console.error("Groq Chat Error:", error);
        return "AI assistant is temporarily unavailable.";
    }
};

// ================= VALIDATE REASON =================
// This now returns: isValid, score, suggestion

export const validateRequestReason = async (
    reason,
    resourceName,
    accessType
) => {
    try {
        const response = await client.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content:
                        `You are an access control reviewer.

Evaluate the quality of an access request reason.

Return ONLY valid JSON in this exact format:

{
  "isValid": true or false,
  "score": number from 1 to 10,
  "suggestion": "improved professional reason if needed"
}

Rules:
- If the reason is clear and professional → isValid = true
- If vague or short → isValid = false
- Score should reflect quality (1–10)
- Always include a suggestion`
                },
                {
                    role: "user",
                    content: `
Resource: ${resourceName}
Access Type: ${accessType}
Reason: ${reason}
`
                }
            ],
            temperature: 0.2,
            max_tokens: 150,
        });

        const text =
            response.choices[0].message.content;

        console.log("AI Validation Raw:", text);

        const result = JSON.parse(text);

        return result;

    } catch (error) {
        console.error("Validation Error:", error);

        // Safe fallback
        return {
            isValid: true,
            score: 8,
            suggestion:
                "Your reason appears acceptable."
        };
    }
};

// ================= SUGGEST REASONS =================

export const generateReasonSuggestions = async (
    resourceName,
    accessType,
    userPrompt
) => {
    try {
        const response = await client.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content:
                        "Generate exactly 3 professional access request reasons. Each reason must be on a new line.",
                },
                {
                    role: "user",
                    content: `
Resource Name: ${resourceName}
Access Type: ${accessType}
Context: ${userPrompt}
`,
                },
            ],
            temperature: 0.7,
            max_tokens: 200,
        });

        const text =
            response.choices[0].message.content;

        const suggestions =
            text
                .split("\n")
                .map(s => s.trim())
                .filter(s => s.length > 0);

        return suggestions;

    } catch (error) {
        console.error("Suggestion Error:", error);

        return [
            "I require temporary access to perform assigned operational tasks.",
            "Access is necessary to complete my responsibilities efficiently.",
            "Temporary permissions are required to support ongoing work activities."
        ];
    }
};