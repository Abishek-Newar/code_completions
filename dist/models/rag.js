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
exports.CodeRAG = void 0;
// src/models/rag.ts
const openai_1 = require("@langchain/openai");
const qdrant_1 = require("langchain/vectorstores/qdrant");
const document_1 = require("langchain/document");
const openai_2 = require("@langchain/openai");
const runnables_1 = require("@langchain/core/runnables");
const prompts_1 = require("@langchain/core/prompts");
const codeTemplate_1 = require("./mongoose/codeTemplate");
const config_1 = require("../config");
class CodeRAG {
    constructor() {
        this.ensureString = (input) => {
            if (typeof input === 'string')
                return input;
            if (Array.isArray(input))
                return input.join('\n');
            if (typeof input === 'object')
                return JSON.stringify(input);
            return String(input);
        };
        this.embeddings = new openai_1.OpenAIEmbeddings({
            openAIApiKey: config_1.config.openAiApiKey,
        });
        this.llm = new openai_2.ChatOpenAI({
            modelName: "gpt-4.1-mini-2025-04-14",
            temperature: 0.2,
            openAIApiKey: config_1.config.openAiApiKey,
        });
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Load code templates from MongoDB
                const codeTemplates = yield codeTemplate_1.CodeTemplate.find({});
                // Convert to LangChain documents
                const documents = codeTemplates.map((template) => new document_1.Document({
                    pageContent: template.template,
                    metadata: {
                        language: template.language,
                        framework: template.framework,
                        description: template.description,
                        tags: template.tags,
                    },
                }));
                // Create vector store from documents
                this.vectorStore = yield qdrant_1.QdrantVectorStore.fromDocuments(documents, this.embeddings, {
                    url: "http://localhost:6333",
                    collectionName: "code-templates",
                    collectionConfig: {
                        vectors: {
                            size: 1536, // OpenAI embedding size
                            distance: "Cosine"
                        }
                    }
                });
            }
            catch (error) {
                console.error("Error initializing Qdrant:", error);
                throw error;
            }
        });
    }
    createChain() {
        return __awaiter(this, void 0, void 0, function* () {
            const retriever = this.vectorStore.asRetriever({
                k: 3, // Retrieve top 3 most relevant documents
            });
            // We don't need to bind since we're using an arrow function
            // but let's keep it for extra safety
            const ensureStringBound = this.ensureString.bind(this);
            const prompt = prompts_1.PromptTemplate.fromTemplate(`
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
            const safeRetriever = (query) => __awaiter(this, void 0, void 0, function* () {
                try {
                    // Make sure query is a string before passing to retriever
                    const stringQuery = this.ensureString(query);
                    if (!stringQuery || stringQuery.trim() === '') {
                        console.log("Empty query detected, returning empty context");
                        return [];
                    }
                    const docs = yield retriever.getRelevantDocuments(stringQuery);
                    return docs;
                }
                catch (error) {
                    console.error("Error in retriever:", error);
                    return []; // Return empty array on error
                }
            });
            return runnables_1.RunnableSequence.from([
                {
                    context: (input) => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const docs = yield safeRetriever(input.question);
                            return docs.map((doc) => doc.pageContent).join("\n\n");
                        }
                        catch (error) {
                            console.error("Error processing context:", error);
                            return ""; // Return empty string on error
                        }
                    }),
                    question: new runnables_1.RunnablePassthrough().pipe(ensureStringBound),
                    chatHistory: new runnables_1.RunnablePassthrough().pipe(ensureStringBound),
                    language: new runnables_1.RunnablePassthrough().pipe(ensureStringBound),
                    framework: new runnables_1.RunnablePassthrough().pipe(ensureStringBound),
                },
                prompt,
                this.llm,
            ]);
        });
    }
    addNewTemplate(template) {
        return __awaiter(this, void 0, void 0, function* () {
            // Save to MongoDB
            yield codeTemplate_1.CodeTemplate.create(template);
            // Add to vector store
            yield this.vectorStore.addDocuments([
                new document_1.Document({
                    pageContent: template.template,
                    metadata: {
                        language: template.language,
                        framework: template.framework,
                        description: template.description,
                        tags: template.tags,
                    },
                }),
            ]);
        });
    }
}
exports.CodeRAG = CodeRAG;
