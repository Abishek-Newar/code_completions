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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const rag_1 = require("./models/rag");
const chatHistory_1 = require("./storage/chatHistory");
const codeGenerationGraph_1 = require("./graphs/codeGenerationGraph");
const codeTemplate_1 = require("./models/mongoose/codeTemplate");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Connect to MongoDB
            yield mongoose_1.default.connect("mongodb+srv://Abishek_Newar:Abishek2002@cluster0.kkrveku.mongodb.net/codeGenerator");
            logger_1.logger.info("Connected to MongoDB");
            const app = (0, express_1.default)();
            app.use(express_1.default.json());
            // Initialize RAG system
            const codeRAG = new rag_1.CodeRAG();
            yield codeRAG.initialize();
            logger_1.logger.info("RAG system initialized");
            // Initialize chat history manager
            const historyManager = new chatHistory_1.ChatHistoryManager();
            // Create the code generation graph
            const codeGraph = new codeGenerationGraph_1.CodeGenerationGraph(codeRAG, historyManager);
            logger_1.logger.info("Code generation graph created");
            // Seed initial code templates if none exist
            const templateCount = yield codeTemplate_1.CodeTemplate.countDocuments();
            if (templateCount === 0) {
                logger_1.logger.info("Seeding initial code templates");
                yield seedInitialTemplates();
            }
            // API endpoints
            app.post("/api/sessions", (req, res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const sessionId = yield historyManager.createSession();
                    const response = {
                        success: true,
                        data: { sessionId },
                    };
                    res.json(response);
                }
                catch (error) {
                    logger_1.logger.error("Error creating session", error);
                    const response = {
                        success: false,
                        error: "Failed to create session",
                    };
                    res.status(500).json(response);
                }
            }));
            app.post("/api/generate", (req, res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const { question, sessionId, language, framework } = req.body;
                    if (!question || !sessionId) {
                        const response = {
                            success: false,
                            error: "Missing question or sessionId",
                        };
                        return res.status(400).json(response);
                    }
                    // Verify session exists
                    const sessionExists = yield historyManager.sessionExists(sessionId);
                    if (!sessionExists) {
                        const response = {
                            success: false,
                            error: "Invalid sessionId",
                        };
                        return res.status(404).json(response);
                    }
                    const generatedCode = yield codeGraph.run(question, sessionId, language, framework);
                    const response = {
                        success: true,
                        data: { response: generatedCode },
                    };
                    res.json(response);
                }
                catch (error) {
                    logger_1.logger.error("Error generating code", error);
                    const response = {
                        success: false,
                        error: "Failed to generate code",
                    };
                    res.status(500).json(response);
                }
            }));
            app.get("/api/history/:sessionId", (req, res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const { sessionId } = req.params;
                    const messages = yield historyManager.getMessages(sessionId);
                    const response = {
                        success: true,
                        data: { messages },
                    };
                    res.json(response);
                }
                catch (error) {
                    logger_1.logger.error("Error fetching history", error);
                    const response = {
                        success: false,
                        error: "Failed to fetch chat history",
                    };
                    res.status(500).json(response);
                }
            }));
            app.post("/api/templates", (req, res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const { language, framework, template, description, tags } = req.body;
                    if (!language || !template || !description) {
                        const response = {
                            success: false,
                            error: "Missing required fields",
                        };
                        return res.status(400).json(response);
                    }
                    yield codeRAG.addNewTemplate({
                        language,
                        framework,
                        template,
                        description,
                        tags: tags || [],
                    });
                    const response = {
                        success: true,
                        data: { message: "Template added successfully" },
                    };
                    res.json(response);
                }
                catch (error) {
                    logger_1.logger.error("Error adding template", error);
                    const response = {
                        success: false,
                        error: "Failed to add template",
                    };
                    res.status(500).json(response);
                }
            }));
            // Start the server
            app.listen(config_1.config.port, () => {
                logger_1.logger.info(`Server running on port ${config_1.config.port}`);
            });
        }
        catch (error) {
            logger_1.logger.error("Application failed to start", error);
            process.exit(1);
        }
    });
}
function seedInitialTemplates() {
    return __awaiter(this, void 0, void 0, function* () {
        const templates = [
            {
                language: "typescript",
                framework: "express",
                template: `
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';

// Define interface for the model
interface IItem {
  name: string;
  description: string;
  price: number;
  createdAt: Date;
}

// Create mongoose schema
const ItemSchema = new mongoose.Schema<IItem>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create model
const Item = mongoose.model<IItem>('Item', ItemSchema);

// Initialize express app
const app = express();
app.use(express.json());

// Routes
app.get('/items', async (req: Request, res: Response) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/items', async (req: Request, res: Response) => {
  try {
    const newItem = new Item(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create item' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
      `,
                description: "Express.js REST API with Mongoose integration",
                tags: ["express", "mongoose", "rest", "api"],
            },
            {
                language: "typescript",
                framework: "react",
                template: `
import React, { useState, useEffect } from 'react';

interface Props {
  title: string;
  fetchUrl: string;
}

interface DataItem {
  id: number;
  name: string;
  [key: string]: any;
}

export const DataFetcher: React.FC<Props> = ({ title, fetchUrl }) => {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(fetchUrl);
        
        if (!response.ok) {
          throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (e) {
        setError(\`Failed to fetch data: \${e instanceof Error ? e.message : String(e)}\`);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchUrl]);

  return (
    <div className="data-fetcher">
      <h2>{title}</h2>
      
      {loading && <p>Loading...</p>}
      
      {error && <p className="error">{error}</p>}
      
      {!loading && !error && (
        <ul className="data-list">
          {data.length > 0 ? (
            data.map((item) => (
              <li key={item.id} className="data-item">
                {item.name}
              </li>
            ))
          ) : (
            <li>No data available</li>
          )}
        </ul>
      )}
    </div>
  );
};
      `,
                description: "React functional component with data fetching",
                tags: ["react", "hooks", "fetch", "typescript"],
            },
            {
                language: "typescript",
                framework: "node",
                template: `
import fs from 'fs/promises';
import path from 'path';

interface FileData {
  name: string;
  content: string;
  size: number;
  isDirectory: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class FileManager {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async listFiles(dirPath: string = ''): Promise<FileData[]> {
    try {
      const targetPath = path.join(this.basePath, dirPath);
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      
      const result: FileData[] = [];
      
      for (const entry of entries) {
        const fullPath = path.join(targetPath, entry.name);
        const stats = await fs.stat(fullPath);
        
        result.push({
          name: entry.name,
          content: entry.isDirectory() ? '' : await this.readTextFile(path.join(dirPath, entry.name)),
          size: stats.size,
          isDirectory: entry.isDirectory(),
          createdAt: stats.birthtime,
          updatedAt: stats.mtime
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error(\`Failed to list files: \${error instanceof Error ? error.message : String(error)}\`);
    }
  }

  async readTextFile(filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error(\`Failed to read file: \${error instanceof Error ? error.message : String(error)}\`);
    }
  }

  async writeTextFile(filePath: string, content: string): Promise<void> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      const dirPath = path.dirname(fullPath);
      
      // Ensure directory exists
      await fs.mkdir(dirPath, { recursive: true });
      
      await fs.writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      console.error('Error writing file:', error);
      throw new Error(\`Failed to write file: \${error instanceof Error ? error.message : String(error)}\`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(\`Failed to delete file: \${error instanceof Error ? error.message : String(error)}\`);
    }
  }
}

// Usage example
async function main() {
  const fileManager = new FileManager('./data');
  
  // List files
  const files = await fileManager.listFiles();
  console.log('Files:', files);
  
  // Write a file
  await fileManager.writeTextFile('example.txt', 'Hello, world!');
  
  // Read a file
  const content = await fileManager.readTextFile('example.txt');
  console.log('Content:', content);
  
  // Delete a file
  await fileManager.deleteFile('example.txt');
}
      `,
                description: "Node.js file management utility with TypeScript",
                tags: ["node", "filesystem", "utility", "typescript"],
            },
        ];
        yield codeTemplate_1.CodeTemplate.insertMany(templates);
    });
}
main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
});
