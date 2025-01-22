import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { DialogueLine } from '../features/goalkeeper/types';
import { EvaluationState } from '../types/evaluation';

export interface AIEvaluationCriterion {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  score: number;
  feedback: string;
  consigne: string;
}

export interface AIEvaluationResponse {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  criteria: AIEvaluationCriterion[];
}

const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'https://api.example.com';
const AI_API_KEY = import.meta.env.VITE_AI_API_KEY;

export const AIService = {
  async evaluateDialogue(lines: DialogueLine[]): Promise<AIEvaluationResponse> {
    try {
      const dialogue = lines.map(line => `${line.speaker}: ${line.text}`).join('\n');
      
      const response = await fetch(`${AI_API_URL}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({ dialogue })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data as AIEvaluationResponse;
    } catch (error) {
      console.error('Error evaluating dialogue:', error);
      throw error;
    }
  },

  async updateAIEvaluation(userId: string, evaluation: AIEvaluationResponse): Promise<void> {
    const exerciseRef = doc(db, `users/${userId}/exercises/goalkeeper`);
    const exerciseDoc = await getDoc(exerciseRef);

    if (!exerciseDoc.exists()) {
      throw new Error('Exercise not found');
    }

    // Convertir l'évaluation AI en format compatible avec l'exercice
    const evaluationState: Partial<EvaluationState> = {
      status: 'ai_evaluated',
      aiEvaluation: {
        criteria: evaluation.criteria,
        feedback: evaluation.feedback,
        evaluatedAt: new Date().toISOString(),
        confidence: 0.8
      }
    };

    await updateDoc(exerciseRef, {
      evaluation: evaluationState,
      updatedAt: new Date().toISOString()
    });
  }
};
