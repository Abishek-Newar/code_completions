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
exports.CodeGenerationGraph = void 0;
// src/graphs/codeGenerationGraph.ts
const langgraph_1 = require("@langchain/langgraph");
const openai_1 = require("@langchain/openai");
const prompts_1 = require("@langchain/core/prompts");
const runnables_1 = require("@langchain/core/runnables");
const config_1 = require("../config");
class CodeGenerationGraph {
    constructor(rag, historyManager) {
        this.rag = rag;
        this.historyManager = historyManager;
        this.llm = new openai_1.ChatOpenAI({
            modelName: "gpt-4.1-mini-2025-04-14",
            temperature: 0.2,
            openAIApiKey: config_1.config.openAiApiKey,
        });
        this.buildGraph();
    }
    ensureString(input) {
        if (typeof input === 'string')
            return input;
        if (Array.isArray(input))
            return input.join('\n');
        if (typeof input === 'object')
            return JSON.stringify(input);
        return String(input);
    }
    buildGraph() {
        this.graph = new langgraph_1.StateGraph({
            channels: {
                question: { value: null },
                chatHistory: { value: null },
                context: { value: null },
                codeGeneration: { value: null },
                codeExplanation: { value: null },
                finalResponse: { value: null },
                sessionId: { value: null },
                language: { value: null },
                framework: { value: null }
            }
        });
        // Node for retrieving context
        this.graph.addNode("retrieveContext", (state) => __awaiter(this, void 0, void 0, function* () {
            const ragChain = yield this.rag.createChain();
            const context = yield ragChain.invoke({
                question: this.ensureString(state.question),
                chatHistory: this.ensureString(state.chatHistory),
                language: this.ensureString(state.language || "typescript"),
                framework: this.ensureString(state.framework || ""),
            });
            return { context: context.content };
        }));
        // Node for generating code
        this.graph.addNode("generateCode", runnables_1.RunnableSequence.from([
            (state) => ({
                question: this.ensureString(state.question),
                context: this.ensureString(state.context),
                chatHistory: this.ensureString(state.chatHistory),
                language: this.ensureString(state.language || "typescript"),
                framework: this.ensureString(state.framework || ""),
            }),
            prompts_1.PromptTemplate.fromTemplate(`Generate code for the following request: {question}
          
          Use this context: {context}
          
          Chat history: {chatHistory}
          
          Language: {language}
          Framework: {framework}
          
          Provide only the code with appropriate comments:`),
            this.llm,
            (output) => ({ codeGeneration: output.content }),
        ]));
        // Node for explaining code
        this.graph.addNode("explainCode", runnables_1.RunnableSequence.from([
            (state) => ({
                code: this.ensureString(state.codeGeneration),
                language: this.ensureString(state.language || "typescript"),
            }),
            prompts_1.PromptTemplate.fromTemplate(`Explain the following {language} code in a clear and concise manner:
          
          {code}`),
            this.llm,
            (output) => ({ codeExplanation: output.content }),
        ]));
        // Node for creating final response
        this.graph.addNode("createResponse", (state) => __awaiter(this, void 0, void 0, function* () {
            const language = this.ensureString(state.language || "typescript");
            const finalResponse = `
## Generated ${language.toUpperCase()} Code ${state.framework ? `(${this.ensureString(state.framework)})` : ""}

\`\`\`${language}
${this.ensureString(state.codeGeneration)}
\`\`\`

## Explanation

${this.ensureString(state.codeExplanation)}
`;
            // Save assistant response to chat history
            yield this.historyManager.addMessage(this.ensureString(state.sessionId), "assistant", finalResponse);
            return { finalResponse };
        }));
        // Define the graph edges
        this.graph.addEdge("retrieveContext", "generateCode");
        this.graph.addEdge("generateCode", "explainCode");
        this.graph.addEdge("explainCode", "createResponse");
        this.graph.addEdge("createResponse", langgraph_1.END);
        // Set the entry point
        this.graph.setEntryPoint("retrieveContext");
    }
    run(question, sessionId, language, framework) {
        return __awaiter(this, void 0, void 0, function* () {
            // Save user question to chat history
            yield this.historyManager.addMessage(sessionId, "user", question);
            // Get formatted chat history
            const chatHistory = yield this.historyManager.formatChatHistory(sessionId);
            // Run the graph
            const result = yield this.graph.compile().invoke({
                question: this.ensureString(question),
                chatHistory: this.ensureString(chatHistory),
                context: "",
                codeGeneration: "",
                codeExplanation: "",
                finalResponse: "",
                sessionId: this.ensureString(sessionId),
                language: this.ensureString(language),
                framework: this.ensureString(framework),
            });
            return result.finalResponse;
        });
    }
}
exports.CodeGenerationGraph = CodeGenerationGraph;
