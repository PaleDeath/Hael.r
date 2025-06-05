import mongoose, { Document, Schema } from 'mongoose';

export interface IOption {
  text: string;
  value: number;
}

export interface IQuestion extends Document {
  id: string;
  text: string;
  category: string;
  type: string;
  options: IOption[];
  weight: number;
  isAiGenerated: boolean;
  suggestedFollowUp?: string;
  aiGenerationPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const optionSchema = new Schema<IOption>({
  text: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true
  }
}, { _id: false });

const questionSchema = new Schema<IQuestion>(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    text: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true,
      enum: ['anxiety', 'depression', 'stress', 'sleep', 'social']
    },
    type: {
      type: String,
      required: true,
      enum: ['multiple-choice', 'scale', 'yes-no']
    },
    options: [optionSchema],
    weight: {
      type: Number,
      required: true,
      default: 1
    },
    isAiGenerated: {
      type: Boolean,
      default: false
    },
    suggestedFollowUp: {
      type: String
    },
    aiGenerationPrompt: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IQuestion>('Question', questionSchema); 