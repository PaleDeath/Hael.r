import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswer {
  questionId: string;
  value: number;
}

export interface ICategory {
  score: number;
  severity: 'low' | 'moderate' | 'high';
  summary: string;
}

export interface IAssessment extends Document {
  user: mongoose.Types.ObjectId;
  answers: Record<string, number>;
  questionPath: string[];
  categories: Record<string, ICategory>;
  overallAnalysis: string;
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>({
  score: {
    type: Number,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'moderate', 'high'],
    required: true
  },
  summary: {
    type: String,
    required: true
  }
}, { _id: false });

const assessmentSchema = new Schema<IAssessment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    answers: {
      type: Schema.Types.Mixed,
      required: true
    },
    questionPath: [{
      type: String,
      required: true
    }],
    categories: {
      anxiety: categorySchema,
      depression: categorySchema,
      stress: categorySchema,
      sleep: categorySchema,
      social: categorySchema
    },
    overallAnalysis: {
      type: String,
      required: true
    },
    recommendations: [{
      type: String,
      required: true
    }]
  },
  {
    timestamps: true
  }
);

// Create indexes
assessmentSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<IAssessment>('Assessment', assessmentSchema); 