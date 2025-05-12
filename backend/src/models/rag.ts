// src/models/rag.ts
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "langchain/vectorstores/qdrant";
import { Document } from "langchain/document";
import { ChatOpenAI } from "@langchain/openai";
import { 
  RunnableSequence, 
  RunnablePassthrough 
} from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { CodeTemplate } from "./mongoose/codeTemplate";
import { RagDocument } from "../types";
import { config } from "../config";

export class CodeRAG {
  private embeddings: OpenAIEmbeddings;
  private vectorStore!: QdrantVectorStore;
  private llm: ChatOpenAI;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openAiApiKey,
    });
    this.llm = new ChatOpenAI({
      modelName: "gpt-4.1-mini-2025-04-14",
      temperature: 0.2,
      openAIApiKey: config.openAiApiKey,
    });
  }

  async initialize() {
    try {
      // Load code templates from MongoDB
      const codeTemplates = await CodeTemplate.find({});
      
      // Convert to LangChain documents
      const documents = codeTemplates.map(
        (template) =>
          new Document({
            pageContent: template.template,
            metadata: {
              language: template.language,
              framework: template.framework,
              description: template.description,
              tags: template.tags,
            },
          })
      );

      // Create vector store from documents
      this.vectorStore = await QdrantVectorStore.fromDocuments(
        documents,
        this.embeddings,
        {
          url: "http://localhost:6333",
          collectionName: "code-templates",
          collectionConfig: {
            vectors: {
              size: 1536, // OpenAI embedding size
              distance: "Cosine"
            }
          }
        }
      );
    } catch (error) {
      console.error("Error initializing Qdrant:", error);
      throw error;
    }
  }

  private ensureString = (input: any): string => {
    if (typeof input === 'string') return input;
    if (Array.isArray(input)) return input.join('\n');
    if (typeof input === 'object') return JSON.stringify(input);
    return String(input);
  }

  async createChain() {
    const retriever = this.vectorStore.asRetriever({
      k: 3, // Retrieve top 3 most relevant documents
    });

    // We don't need to bind since we're using an arrow function
    // but let's keep it for extra safety
    const ensureStringBound = this.ensureString.bind(this);

    const prompt = PromptTemplate.fromTemplate(`
      You are a code generation assistant. Use the following context and chat history
      to generate code based on the user's request.
      
      Context: {context}
      
      Chat History: {chatHistory}
      
      User Request: {question}
      
      Language: {language}
      Framework: {framework}
      
      Generate the appropriate code in the requested language and explain key parts:
    `);

    // Create a safer retriever wrapper that ensures string output
    const safeRetriever = async (query: any) => {
      try {
        // Make sure query is a string before passing to retriever
        const stringQuery = this.ensureString(query);
        if (!stringQuery || stringQuery.trim() === '') {
          console.log("Empty query detected, returning empty context");
          return [];
        }
        const docs = await retriever.getRelevantDocuments(stringQuery);
        return docs;
      } catch (error) {
        console.error("Error in retriever:", error);
        return []; // Return empty array on error
      }
    };

    return RunnableSequence.from([
      {
        context: async (input: any) => {
          try {
            const docs = await safeRetriever(input.question);
            return docs.map((doc) => doc.pageContent).join("\n\n");
          } catch (error) {
            console.error("Error processing context:", error);
            return ""; // Return empty string on error
          }
        },
        question: new RunnablePassthrough().pipe(ensureStringBound),
        chatHistory: new RunnablePassthrough().pipe(ensureStringBound),
        language: new RunnablePassthrough().pipe(ensureStringBound),
        framework: new RunnablePassthrough().pipe(ensureStringBound),
      },
      prompt,
      this.llm,
    ]);
  }

  async addNewTemplate(template: {
    language: string;
    framework?: string;
    template: string;
    description: string;
    tags: string[];
  }) {
    // Save to MongoDB
    await CodeTemplate.create(template);
    
    // Add to vector store
    await this.vectorStore.addDocuments([
      new Document({
        pageContent: template.template,
        metadata: {
          language: template.language,
          framework: template.framework,
          description: template.description,
          tags: template.tags,
        },
      }),
    ]);
  }
}
