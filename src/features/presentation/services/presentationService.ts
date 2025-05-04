import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { evaluateExercise, AIEvaluationResponse } from '../../../api/ai/routes/evaluation';

export enum ExerciseStatus {
  NotStarted = 'not_started',
  Draft = 'draft',
  InProgress = 'in_progress',
  Submitted = 'submitted',
  Evaluated = 'evaluated',
  Published = 'published'
}

export interface PresentationExercise {
  id: string;
  content: string;
  status: ExerciseStatus;
  totalScore?: number;
  maxScore: number;
  trainerComment?: string;
  trainerId?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  evaluatedAt?: string | null;
  aiEvaluation?: AIEvaluationResponse | null;
}

const cleanUndefined = (obj: any): any => {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
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
          status: ExerciseStatus.NotStarted,
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

  subscribeToExercise: (userId: string, callback: (exercise: PresentationExercise | null) => void) => {
    if (!userId) {
      console.error('No user ID provided for subscription');
      return () => {};
    }

    console.log('Setting up subscription for user:', userId);
    const exerciseRef = doc(db, 'users', userId, 'exercises', 'presentation');

    return onSnapshot(exerciseRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log('Exercise data from Firestore:', data);
        callback({
          id: doc.id,
          content: data.content || '',
          status: data.status || ExerciseStatus.NotStarted,
          totalScore: data.totalScore || 0,
          maxScore: data.maxScore || 20,
          trainerComment: data.trainerComment || '',
          trainerId: data.trainerId || null,
          userId: data.userId || userId,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          submittedAt: data.submittedAt || null,
          evaluatedAt: data.evaluatedAt || null,
          aiEvaluation: data.aiEvaluation || null
        });
      } else {
        console.log('No exercise found for user:', userId);
        // Créer un nouvel exercice si aucun n'existe
        createInitialExercise(userId).then((exercise) => {
          console.log('Created initial exercise:', exercise);
          callback(exercise);
        }).catch(error => {
          console.error('Error creating initial exercise:', error);
          callback(null);
        });
      }
    }, (error) => {
      console.error('Error in exercise subscription:', error);
      callback(null);
    });
  },

  async updateExercise(userId: string, updates: Partial<PresentationExercise>) {
    if (!userId) throw new Error('User ID is required');

    const exerciseRef = doc(db, `users/${userId}/exercises`, 'presentation');
    await updateDoc(exerciseRef, cleanUndefined({
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  },

  async createOrUpdateExercise(userId: string, content: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Creating/Updating exercise for user:', userId);
    
    try {
      const exerciseRef = doc(db, `users/${userId}/exercises`, 'presentation');
      const exerciseDoc = await getDoc(exerciseRef);

      if (!exerciseDoc.exists()) {
        console.log('Creating new exercise for user:', userId);
        // Create new exercise
        await setDoc(exerciseRef, {
          content,
          status: ExerciseStatus.Draft,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          userId,
          maxScore: 20
        });
      } else {
        console.log('Updating existing exercise for user:', userId);
        // Update existing exercise
        await updateDoc(exerciseRef, {
          content,
          status: ExerciseStatus.Draft,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error creating/updating exercise for user:', userId, error);
      throw error;
    }
  },

  async submitExercise(userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Submitting exercise for user:', userId);
    
    try {
      const exerciseRef = doc(db, `users/${userId}/exercises`, 'presentation');
      const exerciseDoc = await getDoc(exerciseRef);

      if (!exerciseDoc.exists()) {
        console.error('No exercise found to submit for user:', userId);
        throw new Error('No exercise found to submit');
      }

      await updateDoc(exerciseRef, {
        status: ExerciseStatus.Submitted,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Exercise submitted successfully for user:', userId);
    } catch (error) {
      console.error('Error submitting exercise for user:', userId, error);
      throw error;
    }
  },

  async evaluateExercise(userId: string, score: number, comment: string, trainerId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Evaluating exercise for user:', userId);
    
    try {
      const exerciseRef = doc(db, `users/${userId}/exercises`, 'presentation');
      const exerciseDoc = await getDoc(exerciseRef);

      if (!exerciseDoc.exists()) {
        console.error('No exercise found to evaluate for user:', userId);
        throw new Error('No exercise found to evaluate');
      }

      await updateDoc(exerciseRef, {
        totalScore: score,
        trainerComment: comment,
        trainerId: trainerId,
        status: ExerciseStatus.Evaluated,
        evaluatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Exercise evaluated successfully for user:', userId);
    } catch (error) {
      console.error('Error evaluating exercise for user:', userId, error);
      throw error;
    }
  },

  async evaluateWithAI(userId: string, organizationId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Starting AI evaluation for user:', userId);
    
    try {
      const exerciseRef = doc(db, `users/${userId}/exercises`, 'presentation');
      const exerciseDoc = await getDoc(exerciseRef);

      if (!exerciseDoc.exists()) {
        console.error('Exercise not found for user:', userId);
        throw new Error('Exercise not found');
      }

      const exerciseData = exerciseDoc.data();
      
      if (!exerciseData.content) {
        console.error('No content found in exercise for user:', userId);
        throw new Error('No content to evaluate');
      }

      console.log('Evaluating content for user:', userId, 'Content:', exerciseData.content);

      // Formater le contenu pour l'IA
      const formattedContent = {
        type: 'presentation',
        exercise: {
          content: exerciseData.content
        }
      };

      // Évaluer avec l'IA
      const response = await evaluateExercise(
        organizationId,
        JSON.stringify(formattedContent),
        'presentation'
      );

      console.log('AI Evaluation received for user:', userId, 'Evaluation:', response);

      const aiEvaluation = typeof response === 'string' ? JSON.parse(response) : response;

      // Mettre à jour le document avec l'évaluation et le score
      await updateDoc(exerciseRef, {
        aiEvaluation,
        totalScore: aiEvaluation.score || 0,
        maxScore: 20,
        updatedAt: serverTimestamp()
      });

      console.log('Exercise updated with AI evaluation for user:', userId);
    } catch (error) {
      console.error('Error in AI evaluation for user:', userId, error);
      throw error;
    }
  },

  /**
   * Permet de réinitialiser l'évaluation d'un exercice déjà évalué pour permettre au formateur de modifier la note et le commentaire
   * @param userId ID de l'utilisateur dont l'exercice doit être réinitialisé
   */
  async resetEvaluation(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Resetting evaluation for user:', userId);
    
    try {
      const exerciseRef = doc(db, `users/${userId}/exercises`, 'presentation');
      const exerciseDoc = await getDoc(exerciseRef);

      if (!exerciseDoc.exists()) {
        console.error('No exercise found to reset evaluation for user:', userId);
        throw new Error('No exercise found to reset evaluation');
      }

      const exerciseData = exerciseDoc.data() as PresentationExercise;
      
      // Vérifier si l'exercice est déjà évalué
      if (exerciseData.status !== ExerciseStatus.Evaluated && exerciseData.status !== ExerciseStatus.Published) {
        console.error('Exercise is not evaluated, cannot reset evaluation for user:', userId);
        throw new Error('Exercise is not evaluated, cannot reset evaluation');
      }

      // Conserver les données existantes mais changer le statut pour permettre l'édition
      await updateDoc(exerciseRef, {
        status: ExerciseStatus.Submitted, // Remettre au statut "Soumis" pour permettre l'édition
        updatedAt: serverTimestamp()
        // Ne pas effacer la note ni le commentaire pour permettre de les modifier
      });

      console.log('Evaluation reset successfully for user:', userId);
    } catch (error) {
      console.error('Error resetting evaluation for user:', userId, error);
      throw error;
    }
  }
};

// Fonction pour créer un nouvel exercice initial
async function createInitialExercise(userId: string): Promise<PresentationExercise> {
  const exerciseRef = doc(db, `users/${userId}/exercises`, 'presentation');
  const exerciseDoc = await getDoc(exerciseRef);

  if (exerciseDoc.exists()) {
    throw new Error('Exercise already exists for user');
  }

  const newExercise: PresentationExercise = {
    id: 'presentation',
    userId,
    status: ExerciseStatus.NotStarted,
    content: '',
    totalScore: 0,
    maxScore: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(exerciseRef, cleanUndefined(newExercise));
  return newExercise;
}
