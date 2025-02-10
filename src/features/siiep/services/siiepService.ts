import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { evaluateExercise } from '../../../api/ai/routes/evaluation';
import type { AIEvaluationResponse } from '../../../api/ai/routes/evaluation';

export interface SIIEPResponse {
  sInterroger: string;
  investiguer: string;
  empathie: string;
  proposer: string;
}

export interface SIIEPObjection {
  id: number;
  responses: SIIEPResponse;
  score?: {
    points: number;
    maxPoints: number;
    percentage: number;
  };
  feedback?: string;
}

export interface SIIEPExercise {
  id: string;
  userId: string;
  type: 'siiep';
  objections: SIIEPObjection[];
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated' | 'published';
  totalScore?: number;
  maxScore?: number;
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string;
  evaluatedAt?: string;
  evaluatedBy?: string;
  submittedAt?: string;
  aiEvaluation?: AIEvaluationResponse;
}

// Configuration des objections initiales
export const INITIAL_OBJECTIONS: Omit<SIIEPObjection, 'id'>[] = [
  {
    responses: {
      sInterroger: '',
      investiguer: '',
      empathie: '',
      proposer: ''
    }
  },
  {
    responses: {
      sInterroger: '',
      investiguer: '',
      empathie: '',
      proposer: ''
    }
  },
  {
    responses: {
      sInterroger: '',
      investiguer: '',
      empathie: '',
      proposer: ''
    }
  }
];

function cleanUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

const EXERCISE_DOC_NAME = 'siiep';

export const siiepService = {
  async getExercise(userId: string): Promise<SIIEPExercise> {
    const docRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Si l'exercice n'existe pas, créer un nouveau
      const newExercise: SIIEPExercise = {
        id: EXERCISE_DOC_NAME,
        userId,
        type: 'siiep',
        status: 'not_started',
        objections: INITIAL_OBJECTIONS.map((obj, index) => ({
          ...obj,
          id: index + 1
        })),
        maxScore: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      await setDoc(docRef, cleanUndefined(newExercise));
      return newExercise;
    }

    return docSnap.data() as SIIEPExercise;
  },

  subscribeToExercise(userId: string, callback: (exercise: SIIEPExercise) => void) {
    if (!userId) return () => {};

    const docRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as SIIEPExercise);
      }
    });
  },

  async updateExercise(userId: string, updates: Partial<SIIEPExercise>): Promise<void> {
    const docRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
    await updateDoc(docRef, cleanUndefined({
      ...updates,
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }));
  },

  async submitExercise(userId: string): Promise<void> {
    const exercise = await this.getExercise(userId);

    // Vérifier si l'exercice est vide
    const isExerciseEmpty = exercise.objections.every(objection =>
      Object.values(objection.responses).every(response => !response.trim())
    );

    if (isExerciseEmpty) {
      throw new Error('L\'exercice ne peut pas être soumis car il est vide');
    }

    await this.updateExercise(userId, {
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });
  },

  async evaluateExercise(userId: string, evaluatorId: string): Promise<void> {
    try {
      await this.updateExercise(userId, {
        status: 'evaluated',
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: evaluatorId
      });
    } catch (error) {
      console.error('Error evaluating exercise:', error);
      throw error;
    }
  },

  async evaluateWithAI(userId: string, organizationId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const exercise = await this.getExercise(userId);
      if (!exercise) {
        throw new Error('Exercise not found');
      }

      // Formater le contenu pour l'IA
      const formattedContent = {
        type: 'siiep',
        exercise: {
          objections: exercise.objections.map(obj => ({
            id: obj.id,
            responses: {
              sInterroger: obj.responses.sInterroger,
              investiguer: obj.responses.investiguer,
              empathie: obj.responses.empathie,
              proposer: obj.responses.proposer
            }
          }))
        }
      };

      console.log('Formatted content for AI:', formattedContent);

      // Évaluer avec l'IA en utilisant le bot SIIEP
      const evaluation = await evaluateExercise(
        organizationId,
        JSON.stringify(formattedContent),
        'siiep'
      );

      // Mettre à jour l'exercice avec l'évaluation
      const updatedExercise: Partial<SIIEPExercise> = {
        aiEvaluation: evaluation,
        status: 'evaluated',
        totalScore: evaluation.evaluation?.responses?.reduce((sum, r) => sum + r.score, 0) || 0,
        maxScore: 30,
        evaluatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // Sauvegarder dans Firestore
      const exerciseRef = doc(db, `users/${userId}/exercises/siiep`);
      await updateDoc(exerciseRef, cleanUndefined(updatedExercise));

    } catch (error) {
      console.error('Error evaluating exercise with AI:', error);
      throw error;
    }
  },

  async resetExercise(userId: string): Promise<void> {
    const docRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
    
    const newExercise: SIIEPExercise = {
      id: EXERCISE_DOC_NAME,
      userId,
      type: 'siiep',
      status: 'not_started',
      objections: INITIAL_OBJECTIONS.map((obj, index) => ({
        ...obj,
        id: index + 1
      })),
      maxScore: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    await setDoc(docRef, cleanUndefined(newExercise));
  }
};
