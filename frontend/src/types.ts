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