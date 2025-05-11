// src/index.ts
import express from "express";
import mongoose from "mongoose";
import { CodeRAG } from "./models/rag";
import { ChatHistoryManager } from "./storage/chatHistory";
import { CodeGenerationGraph } from "./graphs/codeGenerationGraph";
import { CodeTemplate } from "./models/mongoose/codeTemplate";
import { config } from "./config";
import { logger } from "./utils/logger";
import { ApiResponse, CodeGenerationRequest } from "./types";

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb+srv://Abishek_Newar:Abishek2002@cluster0.kkrveku.mongodb.net/codeGenerator");
    logger.info("Connected to MongoDB");

    const app = express();
    app.use(express.json());

    // Initialize RAG system
    const codeRAG = new CodeRAG();
    await codeRAG.initialize();
    logger.info("RAG system initialized");

    // Initialize chat history manager
    const historyManager = new ChatHistoryManager();

    // Create the code generation graph
    const codeGraph = new CodeGenerationGraph(codeRAG, historyManager);
    logger.info("Code generation graph created");

    // Seed initial code templates if none exist
    const templateCount = await CodeTemplate.countDocuments();
    if (templateCount === 0) {
      logger.info("Seeding initial code templates");
      await seedInitialTemplates();
    }

    // API endpoints
    app.post("/api/sessions", async (req, res) => {
      try {
        const sessionId = await historyManager.createSession();
        const response: ApiResponse<{ sessionId: string }> = {
          success: true,
          data: { sessionId },
        };
        res.json(response);
      } catch (error) {
        logger.error("Error creating session", error);
        const response: ApiResponse<null> = {
          success: false,
          error: "Failed to create session",
        };
        res.status(500).json(response);
      }
    });

    app.post("/api/generate", async (req, res) => {
      try {
        const { question, sessionId, language, framework } = req.body as CodeGenerationRequest;

        if (!question || !sessionId) {
          const response: ApiResponse<null> = {
            success: false,
            error: "Missing question or sessionId",
          };
          return res.status(400).json(response);
        }

        // Verify session exists
        const sessionExists = await historyManager.sessionExists(sessionId);
        if (!sessionExists) {
          const response: ApiResponse<null> = {
            success: false,
            error: "Invalid sessionId",
          };
          return res.status(404).json(response);
        }

        const generatedCode = await codeGraph.run(
          question,
          sessionId,
          language,
          framework
        );

        const response: ApiResponse<{ response: string }> = {
          success: true,
          data: { response: generatedCode },
        };
        res.json(response);
      } catch (error) {
        logger.error("Error generating code", error);
        const response: ApiResponse<null> = {
          success: false,
          error: "Failed to generate code",
        };
        res.status(500).json(response);
      }
    });

    app.get("/api/history/:sessionId", async (req, res) => {
      try {
        const { sessionId } = req.params;
        const messages = await historyManager.getMessages(sessionId);
        
        const response: ApiResponse<{ messages: any[] }> = {
          success: true,
          data: { messages },
        };
        res.json(response);
      } catch (error) {
        logger.error("Error fetching history", error);
        const response: ApiResponse<null> = {
          success: false,
          error: "Failed to fetch chat history",
        };
        res.status(500).json(response);
      }
    });

    app.post("/api/templates", async (req, res) => {
      try {
        const { language, framework, template, description, tags } = req.body;

        if (!language || !template || !description) {
          const response: ApiResponse<null> = {
            success: false,
            error: "Missing required fields",
          };
          return res.status(400).json(response);
        }

        await codeRAG.addNewTemplate({
          language,
          framework,
          template,
          description,
          tags: tags || [],
        });

        const response: ApiResponse<{ message: string }> = {
          success: true,
          data: { message: "Template added successfully" },
        };
        res.json(response);
      } catch (error) {
        logger.error("Error adding template", error);
        const response: ApiResponse<null> = {
          success: false,
          error: "Failed to add template",
        };
        res.status(500).json(response);
      }
    });

    // Start the server
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
  } catch (error) {
    logger.error("Application failed to start", error);
    process.exit(1);
  }
}

async function seedInitialTemplates() {
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

  await CodeTemplate.insertMany(templates);
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
