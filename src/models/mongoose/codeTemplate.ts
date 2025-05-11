// src/models/mongoose/codeTemplate.ts
import mongoose, { Schema } from "mongoose";
import { CodeTemplateDocument } from "../../types";

const CodeTemplateSchema = new Schema<CodeTemplateDocument>(
  {
    language: {
      type: String,
      required: true,
      index: true,
    },
    framework: {
      type: String,
      index: true,
    },
    template: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      index: true,
    },
  },
  { timestamps: true }
);

export const CodeTemplate = mongoose.model<CodeTemplateDocument>(
  "codeTemplate",
  CodeTemplateSchema
);
