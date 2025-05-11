// src/config/index.ts
import dotenv from "dotenv";
import { AppConfig } from "../types";

dotenv.config();

export const config: AppConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  mongoUri: process.env.MONGODB_URI || "mongodb+srv://Abishek_Newar:Abishek2002@cluster0.kkrveku.mongodb.net/codeGenerator",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  environment: (process.env.NODE_ENV as "development" | "production" | "test") || 
    "development",
};
