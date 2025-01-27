import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { DialogueLine } from '../features/goalkeeper/types';
import type { EvaluationStatus } from '../types/evaluation';
import { createThread, createThreadMessage } from '../api/ai/route';

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
  threadId?: string;
  // Scores et feedbacks par section et question
  scores?: number[][];
  feedbacks?: string[][];
}

export interface ExerciseEvaluationRequest {
  type: 'company' | 'rdv_decideur' | 'objections' | 'cdab';
  content?: string;
  sections?: any[];
}

const ORGANIZATION_ID = import.meta.env.VITE_FABRILE_ORG_ID;
const AGENT_ID = import.meta.env.VITE_FABRILE_BOT_ID;

export const AIService = {
  async evaluateDialogue(lines: DialogueLine[]): Promise<AIEvaluationResponse> {
    try {
      // Créer un nouveau thread pour cette conversation
      const thread = await createThread(ORGANIZATION_ID, AGENT_ID);
      const threadId = thread.id;

      // Formater le dialogue pour l'envoi
      const dialogue = lines.map(line => `${line.speaker}: ${line.text}`).join('\n');
      
      // Envoyer le message au thread
      const messageResponse = await createThreadMessage(ORGANIZATION_ID, threadId, dialogue);

      // Traiter la réponse
      const evaluation: AIEvaluationResponse = {
        score: messageResponse.evaluation?.score || 0,
        feedback: messageResponse.content || '',
        strengths: messageResponse.evaluation?.strengths || [],
        improvements: messageResponse.evaluation?.improvements || [],
        criteria: messageResponse.evaluation?.criteria || [],
        threadId: threadId
      };

      return evaluation;
    } catch (error) {
      console.error('Error evaluating dialogue:', error);
      throw error;
    }
  },

  async evaluateExercise(exerciseData: ExerciseEvaluationRequest): Promise<AIEvaluationResponse> {
    try {
      // Créer un nouveau thread pour cet exercice
      const thread = await createThread(ORGANIZATION_ID, AGENT_ID);
      const threadId = thread.id;

      // Préparer le contenu à évaluer
      let content = '';
      if (exerciseData.type === 'company' && exerciseData.content) {
        content = `Type d'exercice: ${exerciseData.type}\nContenu: ${exerciseData.content}`;
      } else if (exerciseData.sections) {
        content = `Type d'exercice: ${exerciseData.type}\nSections:\n${JSON.stringify(exerciseData.sections, null, 2)}`;
      }

      // Envoyer le message au thread
      const messageResponse = await createThreadMessage(ORGANIZATION_ID, threadId, content);

      // Traiter la réponse
      const evaluation: AIEvaluationResponse = {
        score: messageResponse.evaluation?.score || 0,
        feedback: messageResponse.content || '',
        strengths: messageResponse.evaluation?.strengths || [],
        improvements: messageResponse.evaluation?.improvements || [],
        criteria: messageResponse.evaluation?.criteria || [],
        threadId: threadId
      };

      return evaluation;
    } catch (error) {
      console.error('Error evaluating exercise:', error);
      throw error;
    }
  },

  async updateAIEvaluation(userId: string, evaluation: AIEvaluationResponse): Promise<void> {
    const exerciseRef = doc(db, `users/${userId}/exercises/meeting`);
    const exerciseDoc = await getDoc(exerciseRef);

    if (!exerciseDoc.exists()) {
      throw new Error('Exercise document not found');
    }

    const updatedData = {
      evaluation: {
        status: 'ai_evaluated' as EvaluationStatus,
        score: evaluation.score,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        criteria: evaluation.criteria,
        threadId: evaluation.threadId,
        evaluatedAt: new Date().toISOString()
      }
    };

    await updateDoc(exerciseRef, updatedData);
  }
};
