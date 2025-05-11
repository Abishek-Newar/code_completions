// src/models/mongoose/chatSession.ts
import mongoose, { Schema } from "mongoose";
import { ChatSessionDocument, ChatMessageData } from "../../types";

const ChatMessageSchema = new Schema<ChatMessageData>(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<ChatSessionDocument>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    messages: [ChatMessageSchema],
  },
  { timestamps: true }
);

export const ChatSession = mongoose.model<ChatSessionDocument>(
  "ChatSession",
  ChatSessionSchema
);
