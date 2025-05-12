// src/storage/chatHistory.ts
import { ChatSession } from "../models/mongoose/chatSession";
import { ChatMessageData } from "../types";

export class ChatHistoryManager {
  async createSession(Ip:(string | null)): Promise<string> {
    const sessionId = Math.random().toString(36).substring(2, 15);
    await ChatSession.create({
      sessionId,
      messages: [],
      ip: Ip,
      title: null
    });
    return sessionId;
  }
  async getAllSession(Ip:(string | null)){
    const allSessions = ChatSession.find({
      ip: Ip 
    })
    return allSessions
  }

  async addMessage(
    sessionId: string,
    role: "user" | "assistant",
    content: string
  ): Promise<void> {
    await ChatSession.updateOne(
      { sessionId },
      {
        $push: {
          messages: {
            role,
            content,
            timestamp: new Date(),
          },
        },
      }
    );
  }

  async getMessages(sessionId: string): Promise<ChatMessageData[]> {
    const session = await ChatSession.findOne({ sessionId });
    return session?.messages || [];
  }
  async getTitle(sessionId:string): Promise<Boolean>{
    const session = await ChatSession.findOne({sessionId});
    if(session?.title === null){
      return false
    }
    return true
  }

  async setTitle(sessionId:string,title:string){
    await ChatSession.updateOne({sessionId:sessionId},{title:title})
  }

  async formatChatHistory(sessionId: string): Promise<string> {
    const messages = await this.getMessages(sessionId);
    return messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    const count = await ChatSession.countDocuments({ sessionId });
    return count > 0;
  }
}
