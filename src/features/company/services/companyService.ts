import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { AIService } from '../../../services/AIService';

export interface CompanyExercise {
  userId: string;
  presentation: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated';
  score?: number;
  maxScore: number;
  feedback?: string;
  submittedAt?: string;
  updatedAt: string;
  createdAt: string;
  lastUpdated?: string;
  evaluatedAt?: string;
  evaluatedBy?: string;
}

function cleanUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

export const companyService = {
  async getExercise(userId: string): Promise<CompanyExercise> {
    const docRef = doc(db, `users/${userId}/exercises`, 'company');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const exercise = docSnap.data() as CompanyExercise;
      // Si la présentation est vide, on remet le statut à not_started
      if (!exercise.presentation && exercise.status === 'in_progress') {
        exercise.status = 'not_started';
        await setDoc(docRef, cleanUndefined(exercise));
      }
      return exercise;
    }

    const newExercise: CompanyExercise = {
      userId,
      presentation: '',
      status: 'not_started',
      maxScore: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    await setDoc(docRef, cleanUndefined(newExercise));
    return newExercise;
  },

  async updateExercise(userId: string, exercise: CompanyExercise) {
    const docRef = doc(db, `users/${userId}/exercises`, 'company');
    
    if (exercise.status === 'not_started' && exercise.presentation.trim() !== '') {
      exercise.status = 'in_progress';
    }
    
    exercise.updatedAt = new Date().toISOString();
    exercise.lastUpdated = new Date().toISOString();
    
    await setDoc(docRef, cleanUndefined(exercise));
  },

  async submitExercise(userId: string) {
    const docRef = doc(db, `users/${userId}/exercises`, 'company');
    const exercise = await this.getExercise(userId);
    
    exercise.status = 'submitted';
    exercise.submittedAt = new Date().toISOString();
    exercise.updatedAt = new Date().toISOString();
    exercise.lastUpdated = new Date().toISOString();
    
    await setDoc(docRef, cleanUndefined(exercise));
  },

  async evaluateExercise(userId: string, score: number, feedback: string, evaluatorId: string) {
    const docRef = doc(db, `users/${userId}/exercises`, 'company');
    const exercise = await this.getExercise(userId);
    
    exercise.score = score;
    exercise.feedback = feedback;
    exercise.status = 'evaluated';
    exercise.evaluatedAt = new Date().toISOString();
    exercise.evaluatedBy = evaluatorId;
    exercise.updatedAt = new Date().toISOString();
    exercise.lastUpdated = new Date().toISOString();
    
    await setDoc(docRef, cleanUndefined(exercise));
  },

  async evaluateWithAI(userId: string): Promise<void> {
    const docRef = doc(db, `users/${userId}/exercises`, 'company');
    const exercise = await this.getExercise(userId);
    
    try {
      const aiEvaluation = await AIService.evaluateExercise({
        type: 'company',
        content: exercise.presentation
      });

      // Mise à jour avec l'évaluation de l'IA
      exercise.score = aiEvaluation.score;
      exercise.feedback = aiEvaluation.feedback;
      exercise.status = 'evaluated';
      exercise.evaluatedAt = new Date().toISOString();
      exercise.evaluatedBy = 'AI';
      exercise.lastUpdated = new Date().toISOString();
      
      await setDoc(docRef, cleanUndefined(exercise));
    } catch (error) {
      console.error('Erreur lors de l\'évaluation IA:', error);
      throw error;
    }
  },

  subscribeToExercise(userId: string, callback: (exercise: CompanyExercise) => void) {
    const docRef = doc(db, `users/${userId}/exercises`, 'company');
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as CompanyExercise);
      }
    });
  }
};
