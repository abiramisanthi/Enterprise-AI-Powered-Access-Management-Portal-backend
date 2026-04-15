import {
    validateRequestReason,
    generateReasonSuggestions,
    chatWithAssistant
} from '../utils/openaiAI.js';

import AccessRequest from '../models/AccessRequest.js';
import AuditLog from '../models/AuditLog.js';

// In-memory chat history per user session
// (Gemini agent already has its own memory, this is UI history only)
const chatHistories = new Map();

// =====================================
// VALIDATE REQUEST (WITH USER MEMORY)
// =====================================
export const validateRequest = async (req, res) => {
    try {
        const { reason, resourceName, accessType, requestId } = req.body;
        const userId = req.user._id.toString();

        if (!reason || !resourceName || !accessType) {
            return res.status(400).json({
                message: 'reason, resourceName, and accessType are required'
            });
        }

        const result = await validateRequestReason(
            reason,
            resourceName,
            accessType,
            userId
        );

        if (requestId) {
            await AccessRequest.findByIdAndUpdate(requestId, {
                aiValidationScore: result.score,
                aiSuggestion: result.feedback
            });
        }

        await AuditLog.create({
            user: req.user._id,
            username: req.user.username,
            action: 'AI_VALIDATION',
            details: `AI validated reason for resource "${resourceName}" — Score: ${result.score}/10`,
            ipAddress: req.ip
        });

        res.json(result);

    } catch (error) {
        console.error('AI validation error:', error);

        res.status(500).json({
            message: 'AI validation failed',
            error: error.message
        });
    }
};

// =====================================
// GENERATE SMART REASONS (AGENT MODE)
// =====================================
export const suggestReasons = async (req, res) => {
    try {
        const {
            resourceName,
            accessType,
            userPrompt
        } = req.body;

        const suggestions =
            await generateReasonSuggestions(
                resourceName,
                accessType,
                userPrompt
            );

        res.json({
            success: true,
            suggestions: suggestions
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Suggestion failed"
        });
    }
};
// =====================================
// CHAT WITH AI AGENT (WITH MEMORY)
// =====================================
export const chat = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user._id.toString();

        if (!message) {
            return res.status(400).json({
                message: 'message is required'
            });
        }

        if (!chatHistories.has(userId)) {
            chatHistories.set(userId, []);
        }

        const history = chatHistories.get(userId);

        const reply = await chatWithAssistant(
            message,
            history,
            userId
        );

        history.push({ role: 'User', content: message });
        history.push({ role: 'Assistant', content: reply });

        if (history.length > 20) {
            history.splice(0, 2);
        }

        await AuditLog.create({
            user: req.user._id,
            username: req.user.username,
            action: 'CHAT_MESSAGE',
            details: 'AI chatbot interaction',
            ipAddress: req.ip
        });

        res.json({
            reply,
            historyLength: history.length
        });

    } catch (error) {
        console.error('Chat error:', error);

        res.status(500).json({
            message: 'Chat failed',
            error: error.message
        });
    }
};

