export interface DialogueLine {
  id: string;
  speaker: 'goalkeeper' | 'commercial';
  text: string;
  feedback: string;
  required: boolean;
  isSecondCall?: boolean;
}

export interface DialogueAnalysis {
  feedback: string;
  score: number;
  reviewedBy: 'ai' | 'formatter';
  reviewedAt: string;
}

export interface SubCriterion {
  id: string;
  name: string;
  score: number;
  maxPoints: number;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  scoreOptions: number[];
  score?: number;
  feedback?: string;
  subCriteria?: SubCriterion[];
}

export interface GoalkeeperAnswers {
  firstCallDialogue: DialogueLine[];
  secondCallDialogue: DialogueLine[];
  reviewed: boolean;
  reviewedBy: 'ai' | 'formatter' | null;
  reviewedAt: string | null;
  totalScore: number;
  criteria: EvaluationCriterion[];
  globalFeedback?: string;
}

export type EvaluationWorkflow = 'manual' | 'ai_with_review' | 'ai_auto_publish';

export interface EvaluationState {
  status: 'pending' | 'ai_evaluated' | 'trainer_reviewing' | 'published';
  workflow: EvaluationWorkflow;
  aiEvaluation?: {
    criteria: EvaluationCriterion[];
    feedback: string;
    evaluatedAt: string;
    confidence: number;
  };
  trainerReview?: {
    criteria: EvaluationCriterion[];
    feedback: string;
    reviewedAt: string;
    reviewedBy: string;
  };
}

export interface AIEvaluationResponse {
  lineComments: {
    lineId: string;
    comment: string;
  }[];
  criteria: EvaluationCriterion[];
  feedback: string;
}
