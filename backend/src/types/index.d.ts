// src/types/index.ts

// MongoDB/Mongoose related types
import { Document as MongooseDocument } from "mongoose";

export interface CodeTemplateDocument extends MongooseDocument {
  language: string;
  framework?: string;
  template: string;
  description: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageData {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatSessionDocument extends MongooseDocument {
  sessionId: string;
  messages: ChatMessageData[];
  ip: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// RAG related types
export interface RagDocument {
  pageContent: string;
  metadata: Record<string, any>;
}

// LangGraph state types
export interface GraphState {
  question: string;
  chatHistory: string;
  context: string;
  generatedCode: string;  // Changed from codeGeneration
  codeExplanationText: string;  // Changed from codeExplanation
  finalResponseText: string;  // Changed from finalResponse
  sessionId: string;
  language: string;
  framework: string;
}

// API related types
export interface CodeGenerationRequest {
  question: string;
  sessionId: string;
  language?: string;
  framework?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Configuration
export interface AppConfig {
  port: number;
  mongoUri: string;
  openAiApiKey: string;
  environment: "development" | "production" | "test";
}
