"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
// src/config/index.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || "3000", 10),
    mongoUri: process.env.MONGODB_URI || "mongodb+srv://Abishek_Newar:Abishek2002@cluster0.kkrveku.mongodb.net/codeGenerator",
    openAiApiKey: process.env.OPENAI_API_KEY || "",
    environment: process.env.NODE_ENV ||
        "development",
};
