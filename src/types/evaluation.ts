export type ExerciseType = 
  | 'goalkeeper'
  | 'three_sections'
  | 'decision_maker_meeting'
  | 'iiep'
  | 'company_presentation'
  | 'eombus_paf_i'
  | 'three_keys'
  | 'cdab';

export type EvaluationWorkflow = 
  | 'manual'                // Correction manuelle uniquement
  | 'ai_with_review'        // L'IA évalue automatiquement, le formateur valide
  | 'ai_manual_with_review' // L'IA évalue sur demande, le formateur valide
  | 'ai_auto_publish'       // L'IA évalue et publie automatiquement
  | 'auto_correction';      // Correction et publication automatiques sans IA ni formateur

export type EvaluationStatus = 'pending' | 'ai_evaluated' | 'trainer_reviewing' | 'published';

export interface SubCriterion {
  id: string;
  name: string;
  maxPoints: number;
  score: number;
  feedback: string;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  score: number;
  consigne: string;
  subCriteria?: SubCriterion[];
  feedback: string;
}

export interface ScoringCriteria {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  scoreOptions: number[];
  required: boolean;
  score: number;
  feedback: string;
}

export interface Evaluation {
  totalScore: number;
  criteria: EvaluationCriterion[];
  comments: string;
  evaluatedBy: string | null;
  evaluatedAt: string | null;
  status: EvaluationStatus;
  workflow: EvaluationWorkflow;
  aiEvaluation?: AIEvaluation;
  trainerReview?: TrainerReview;
}

export interface AIEvaluation {
  criteria: EvaluationCriterion[];
  feedback: string;
  evaluatedAt: string;
  confidence: number; // Score de confiance de l'IA entre 0 et 1
  warnings?: string[]; // Avertissements éventuels sur l'évaluation
}

export interface TrainerReview {
  criteria: EvaluationCriterion[];
  feedback: string;
  reviewedAt: string;
  reviewedBy: string;
  aiAgreementScore?: number; // Score d'accord avec l'évaluation de l'IA (0-1)
  modifiedCriteria?: string[]; // Liste des critères modifiés par le formateur
}

export interface EvaluationState {
  exerciseType: ExerciseType;
  status: EvaluationStatus;
  workflow: EvaluationWorkflow;
  submittedAt: string;
  submittedBy: string;
  aiEvaluation?: AIEvaluation;
  trainerReview?: TrainerReview;
  publishedAt?: string;
  publishedBy?: string;
  version: number; // Pour suivre les modifications de l'évaluation
}

// Type générique pour les exercices
export interface Exercise<T = Record<string, unknown>> {
  id: string;
  type: ExerciseType;
  userId: string;
  content: T; // Contenu spécifique à chaque type d'exercice
  evaluation: EvaluationState;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    aiEnabled?: boolean;
    aiModel?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    timeLimit?: number;
    tags?: string[];
  };
}

export interface ExerciseSubmission {
  type: string;
  content: Record<string, unknown>;
  status: 'draft' | 'submitted' | 'evaluated';
  evaluation?: Evaluation;
  submittedAt: string;
  updatedAt: string;
}
