"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatHistoryManager = void 0;
// src/storage/chatHistory.ts
const chatSession_1 = require("../models/mongoose/chatSession");
class ChatHistoryManager {
    createSession() {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionId = Math.random().toString(36).substring(2, 15);
            yield chatSession_1.ChatSession.create({
                sessionId,
                messages: [],
            });
            return sessionId;
        });
    }
    addMessage(sessionId, role, content) {
        return __awaiter(this, void 0, void 0, function* () {
            yield chatSession_1.ChatSession.updateOne({ sessionId }, {
                $push: {
                    messages: {
                        role,
                        content,
                        timestamp: new Date(),
                    },
                },
            });
        });
    }
    getMessages(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield chatSession_1.ChatSession.findOne({ sessionId });
            return (session === null || session === void 0 ? void 0 : session.messages) || [];
        });
    }
    formatChatHistory(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const messages = yield this.getMessages(sessionId);
            return messages
                .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
                .join("\n\n");
        });
    }
    sessionExists(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const count = yield chatSession_1.ChatSession.countDocuments({ sessionId });
            return count > 0;
        });
    }
}
exports.ChatHistoryManager = ChatHistoryManager;
