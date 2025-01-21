import { doc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DialogueLine } from '../types/goalkeeper';
import { EvaluationWorkflow, EvaluationState, ScoringCriteria } from '../types/evaluation';
import { AIEvaluationResponse } from '../types/goalkeeper';

export interface AIEvaluation {
  feedback: string;
  criteria: ScoringCriteria[];
  lineComments: { [key: string]: string };
  evaluatedAt: string;
}

export class AIService {
  private static API_URL = import.meta.env.VITE_AI_API_URL || 'https://api.example.com';
  private static API_KEY = import.meta.env.VITE_AI_API_KEY;

  static async evaluateGoalkeeperExercise(
    firstCallLines: DialogueLine[],
    secondCallLines: DialogueLine[]
  ): Promise<AIEvaluationResponse> {
    try {
      const response = await fetch(`${this.API_URL}/evaluate/goalkeeper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`,
        },
        body: JSON.stringify({
          firstCall: firstCallLines,
          secondCall: secondCallLines,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data as AIEvaluationResponse;
    } catch (error) {
      console.error('Error calling AI evaluation API:', error);
      throw error;
    }
  }

  static async evaluatePendingExercises() {
    try {
      // 1. Récupérer les paramètres d'évaluation
      const settingsRef = collection(db, 'evaluationSettings');
      const settingsSnap = await getDocs(settingsRef);
      const settings = Object.fromEntries(
        settingsSnap.docs.map(doc => [doc.id, doc.data()])
      );

      // 2. Récupérer tous les exercices en attente
      const exercisesRef = collection(db, 'exercises');
      const q = query(exercisesRef, where('evaluation.status', '==', 'pending'));
      const exercisesSnap = await getDocs(q);

      // 3. Évaluer chaque exercice selon son workflow
      for (const exerciseDoc of exercisesSnap.docs) {
        const exercise = exerciseDoc.data();
        const exerciseType = exercise.type;
        const workflow = settings[exerciseType]?.workflow as EvaluationWorkflow;

        if (!workflow || workflow === 'manual' || workflow === 'auto_correction') continue;

        let evaluation: AIEvaluationResponse;
        
        // Évaluer avec l'IA selon le type d'exercice
        switch (exerciseType) {
          case 'goalkeeper':
            evaluation = await this.evaluateGoalkeeperExercise(
              exercise.firstCallLines,
              exercise.secondCallLines
            );
            break;
          // Ajouter d'autres types d'exercices ici
          default:
            continue;
        }

        // Transformer les critères pour correspondre au type ScoringCriteria
        const transformedCriteria: ScoringCriteria[] = evaluation.criteria.map((criterion: any) => ({
          id: criterion.id || `criterion_${Math.random().toString(36).substr(2, 9)}`,
          name: criterion.name,
          description: criterion.description || '',
          maxPoints: criterion.maxScore || 10,
          score: criterion.score || 0,
          feedback: criterion.feedback || '',
          required: criterion.required || false,
          scoreOptions: Array.from({ length: (criterion.maxScore || 10) + 1 }, (_, i) => i)
        }));

        // Mettre à jour l'état de l'évaluation
        const newEvaluationState: Partial<EvaluationState> = {
          status: workflow === 'ai_auto_publish' ? 'published' : 'ai_evaluated',
          aiEvaluation: {
            criteria: transformedCriteria,
            feedback: evaluation.feedback,
            evaluatedAt: new Date().toISOString(),
            confidence: 0.85 // À ajuster selon votre modèle
          }
        };

        // Si auto-publication, ajouter les champs de publication
        if (workflow === 'ai_auto_publish') {
          newEvaluationState.publishedAt = new Date().toISOString();
          newEvaluationState.publishedBy = 'ai';
        }

        await updateDoc(exerciseDoc.ref, {
          'evaluation': newEvaluationState
        });
      }
    } catch (error) {
      console.error('Error evaluating pending exercises:', error);
      throw error;
    }
  }
}
