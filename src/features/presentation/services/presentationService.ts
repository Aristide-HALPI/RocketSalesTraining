import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { AIEvaluationResponse, AIService } from '../../../services/AIService';

export interface PresentationExercise {
  id: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated';
  content: string;
  totalScore: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
  aiEvaluation?: AIEvaluationResponse;
  evaluatedAt?: string;
  evaluatedBy?: string;
  submittedAt?: string;
  trainerComment?: string;
}

const cleanUndefined = (obj: any): any => {
  Object.keys(obj).forEach(key => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
};

export const presentationService = {
  async getExercise(userId: string): Promise<PresentationExercise> {
    if (!userId) throw new Error('User ID is required');

    try {
      const exerciseRef = doc(db, `users/${userId}/exercises`, 'presentation');
      const exerciseDoc = await getDoc(exerciseRef);

      if (!exerciseDoc.exists()) {
        // Create a new exercise
        const newExercise: PresentationExercise = {
          id: 'presentation',
          userId,
          status: 'not_started',
          content: '',
          totalScore: 0,
          maxScore: 20,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(exerciseRef, cleanUndefined(newExercise));
        return newExercise;
      }

      const data = exerciseDoc.data() as PresentationExercise;
      return {
        ...data,
        id: exerciseDoc.id,
        maxScore: data.maxScore || 20  // Ensure maxScore is always set
      };
    } catch (error) {
      console.error('Error fetching presentation exercise:', error);
      throw new Error('Failed to fetch presentation exercise. Please try again.');
    }
  },

  subscribeToExercise(userId: string, callback: (exercise: PresentationExercise) => void) {
    if (!userId) throw new Error('User ID is required');

    try {
      console.log('Subscribing to exercise for user:', userId);
      const exerciseRef = doc(db, `users/${userId}/exercises`, 'presentation');
      
      return onSnapshot(exerciseRef, 
        (doc) => {
          if (doc.exists()) {
            const data = doc.data() as PresentationExercise;
            callback({
              ...data,
              id: doc.id,
              maxScore: data.maxScore || 20  // Ensure maxScore is always set
            });
          } else {
            // If document doesn't exist, create a new one
            this.getExercise(userId)
              .then(callback)
              .catch(error => console.error('Error creating new exercise:', error));
          }
        },
        (error) => {
          console.error('Error subscribing to exercise:', error);
          // Notify the UI of the error
          callback({
            id: 'error',
            userId,
            status: 'not_started',
            content: '',
            totalScore: 0,
            maxScore: 20,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      );
    } catch (error) {
      console.error('Error setting up exercise subscription:', error);
      throw new Error('Failed to subscribe to exercise updates. Please try again.');
    }
  },

  async updateExercise(userId: string, updates: Partial<PresentationExercise>) {
    if (!userId) throw new Error('User ID is required');

    const exerciseRef = doc(db, `users/${userId}/exercises`, 'presentation');
    await updateDoc(exerciseRef, cleanUndefined({
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  },

  async submitExercise(userId: string) {
    if (!userId) throw new Error('User ID is required');

    const exerciseRef = doc(db, `users/${userId}/exercises`, 'presentation');
    await updateDoc(exerciseRef, {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  async evaluateExercise(userId: string, score: number, comment: string, evaluatorId: string) {
    if (!userId) throw new Error('User ID is required');
    if (!evaluatorId) throw new Error('Evaluator ID is required');
    if (score < 0 || score > 20) throw new Error('Score must be between 0 and 20');

    const exerciseRef = doc(db, `users/${userId}/exercises`, 'presentation');
    await updateDoc(exerciseRef, {
      status: 'evaluated',
      totalScore: score,
      trainerComment: comment,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: evaluatorId,
      updatedAt: new Date().toISOString()
    });
  },

  async evaluateWithAI(userId: string): Promise<void> {
    if (!userId) throw new Error('User ID is required');

    const exercise = await this.getExercise(userId);
    if (!exercise) throw new Error('Exercise not found');

    const aiService = new AIService();
    const evaluation = await aiService.evaluatePresentation(exercise.content);

    await this.updateExercise(userId, {
      aiEvaluation: evaluation,
      updatedAt: new Date().toISOString()
    });
  }
};
