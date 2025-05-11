// src/graphs/codeGenerationGraph.ts
import { StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { CodeRAG } from "../models/rag";
import { ChatHistoryManager } from "../storage/chatHistory";
import { GraphState } from "../types";
import { config } from "../config";

export class CodeGenerationGraph {
  private rag: CodeRAG;
  private historyManager: ChatHistoryManager;
  private graph!: StateGraph<GraphState>;
  private llm: ChatOpenAI;

  constructor(rag: CodeRAG, historyManager: ChatHistoryManager) {
    this.rag = rag;
    this.historyManager = historyManager;
    this.llm = new ChatOpenAI({
      modelName: "gpt-4.1-mini-2025-04-14",
      temperature: 0.2,
      openAIApiKey: config.openAiApiKey,
    });
    this.buildGraph();
  }

  private ensureString(input: any): string {
    if (typeof input === 'string') return input;
    if (Array.isArray(input)) return input.join('\n');
    if (typeof input === 'object') return JSON.stringify(input);
    return String(input);
  }

  private buildGraph() {
    this.graph = new StateGraph<GraphState>({
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
    this.graph.addNode("retrieveContext", async (state: GraphState) => {
      const ragChain = await this.rag.createChain();
      const context = await ragChain.invoke({
        question: this.ensureString(state.question),
        chatHistory: this.ensureString(state.chatHistory),
        language: this.ensureString(state.language || "typescript"),
        framework: this.ensureString(state.framework || ""),
      });
      return { context: context.content };
    });

    // Node for generating code
    this.graph.addNode(
      "generateCode",
      RunnableSequence.from([
        (state: GraphState) => ({
          question: this.ensureString(state.question),
          context: this.ensureString(state.context),
          chatHistory: this.ensureString(state.chatHistory),
          language: this.ensureString(state.language || "typescript"),
          framework: this.ensureString(state.framework || ""),
        }),
        PromptTemplate.fromTemplate(
          `Generate code for the following request: {question}
          
          Use this context: {context}
          
          Chat history: {chatHistory}
          
          Language: {language}
          Framework: {framework}
          
          Provide only the code with appropriate comments:`
        ),
        this.llm,
        (output) => ({ codeGeneration: output.content }),
      ])
    );

    // Node for explaining code
    this.graph.addNode(
      "explainCode",
      RunnableSequence.from([
        (state: GraphState) => ({
          code: this.ensureString(state.codeGeneration),
          language: this.ensureString(state.language || "typescript"),
        }),
        PromptTemplate.fromTemplate(
          `Explain the following {language} code in a clear and concise manner:
          
          {code}`
        ),
        this.llm,
        (output) => ({ codeExplanation: output.content }),
      ])
    );

    // Node for creating final response
    this.graph.addNode("createResponse", async (state: GraphState) => {
      const language = this.ensureString(state.language || "typescript");
      const finalResponse = `
## Generated ${language.toUpperCase()} Code ${
        state.framework ? `(${this.ensureString(state.framework)})` : ""
      }

\`\`\`${language}
${this.ensureString(state.codeGeneration)}
\`\`\`

## Explanation

${this.ensureString(state.codeExplanation)}
`;
      
      // Save assistant response to chat history
      await this.historyManager.addMessage(
        this.ensureString(state.sessionId),
        "assistant",
        finalResponse
      );
      
      return { finalResponse };
    });

    // Define the graph edges
    this.graph.addEdge("retrieveContext", "generateCode");
    this.graph.addEdge("generateCode", "explainCode");
    this.graph.addEdge("explainCode", "createResponse");
    this.graph.addEdge("createResponse", END);

    // Set the entry point
    this.graph.setEntryPoint("retrieveContext");
  }

  async run(
    question: string, 
    sessionId: string, 
    language?: string, 
    framework?: string
  ): Promise<string> {
    // Save user question to chat history
    await this.historyManager.addMessage(sessionId, "user", question);
    
    // Get formatted chat history
    const chatHistory = await this.historyManager.formatChatHistory(sessionId);
    
    // Run the graph
    const result = await this.graph.compile().invoke({
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
  }
}
