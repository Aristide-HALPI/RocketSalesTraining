import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

export interface QualificationItem {
  problems: string;
  problemImpact: string;
  clientConfirmation: string;
  acceptedBenefit: string;
}

export interface SolutionItem {
  characteristic: string;
  definition: string;
  advantages: string;
  benefits: string;
  proofs: string;
}

export interface OutilsCdabExercise {
  id: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated';
  qualification: QualificationItem[];
  solution: SolutionItem[];
  totalScore: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
  evaluatedAt?: string;
  evaluatedBy?: string;
  submittedAt?: string;
  trainerFinalComment?: string;
}

const INITIAL_ITEMS = 8;

const getInitialExercise = (): OutilsCdabExercise => ({
  id: '',
  userId: '',
  status: 'not_started',
  qualification: Array(INITIAL_ITEMS).fill({
    problems: '',
    problemImpact: '',
    clientConfirmation: '',
    acceptedBenefit: ''
  }),
  solution: Array(INITIAL_ITEMS).fill({
    characteristic: '',
    definition: '',
    advantages: '',
    benefits: '',
    proofs: ''
  }),
  totalScore: 0,
  maxScore: 100,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export const outilsCdabService = {
  async getExercise(userId: string): Promise<OutilsCdabExercise> {
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'outil_cdab');
    const exerciseDoc = await getDoc(exerciseRef);

    if (exerciseDoc.exists()) {
      return exerciseDoc.data() as OutilsCdabExercise;
    }

    // Créer un nouvel exercice si aucun n'existe
    const initialExercise = getInitialExercise();
    initialExercise.id = 'outil_cdab';
    initialExercise.userId = userId;

    await setDoc(exerciseRef, initialExercise);
    return initialExercise;
  },

  subscribeToExercise(userId: string, callback: (exercise: OutilsCdabExercise) => void) {
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'outil_cdab');
    return onSnapshot(exerciseRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as OutilsCdabExercise);
      }
    });
  },

  async updateExercise(userId: string, updates: Partial<OutilsCdabExercise>): Promise<void> {
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'outil_cdab');
    await updateDoc(exerciseRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  async submitExercise(userId: string): Promise<void> {
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'outil_cdab');
    await updateDoc(exerciseRef, {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  async evaluateExercise(
    userId: string, 
    totalScore: number,
    comment: string,
    evaluatorId: string
  ): Promise<void> {
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'outil_cdab');
    await updateDoc(exerciseRef, {
      status: 'evaluated',
      totalScore,
      trainerFinalComment: comment,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: evaluatorId,
      updatedAt: new Date().toISOString()
    });
  }
};
