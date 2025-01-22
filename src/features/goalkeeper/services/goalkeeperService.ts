import { db } from '../../../lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { GoalkeeperExercise, GOALKEEPER_EVALUATION_CRITERIA } from '../types';

// Fonction utilitaire pour nettoyer les undefined
function cleanUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

export const goalkeeperService = {
  async getExercise(userId: string): Promise<GoalkeeperExercise | null> {
    console.log('Loading exercise for user:', userId);
    const exerciseRef = doc(db, `users/${userId}/exercises/goalkeeper`);
    
    try {
      const exerciseDoc = await getDoc(exerciseRef);
      console.log('Exercise doc exists:', exerciseDoc.exists(), 'Data:', exerciseDoc.data());

      if (!exerciseDoc.exists()) {
        console.warn('Exercise not found for user:', userId);
        return null;
      }

      const exerciseData = exerciseDoc.data();
      console.log('Exercise data from Firestore:', exerciseData);

      const exercise: GoalkeeperExercise = {
        id: userId,
        userId,
        status: exerciseData.status || 'in_progress',
        firstCall: {
          lines: exerciseData.firstCall?.lines || []
        },
        secondCall: {
          lines: exerciseData.secondCall?.lines || []
        },
        evaluation: exerciseData.evaluation || {
          criteria: GOALKEEPER_EVALUATION_CRITERIA.map(criterion => ({
            ...criterion,
            subCriteria: (criterion.subCriteria || []).map(sub => ({
              ...sub,
              score: 0,
              feedback: ''
            }))
          })),
          totalScore: 0
        },
        createdAt: exerciseData.createdAt || new Date().toISOString(),
        updatedAt: exerciseData.updatedAt || new Date().toISOString()
      };

      console.log('Normalized exercise data:', exercise);
      return exercise;

    } catch (error) {
      console.error('Error in getExercise:', error);
      return null;
    }
  },

  subscribeToExercise(userId: string, onChange: (exercise: GoalkeeperExercise) => void) {
    console.log('Subscribing to exercise updates for user:', userId);
    const exerciseRef = doc(db, `users/${userId}/exercises/goalkeeper`);
    
    return onSnapshot(exerciseRef, (doc) => {
      if (doc.exists()) {
        const exerciseData = doc.data();
        console.log('Received exercise update:', exerciseData);
        
        // Normalize the data
        const exercise: GoalkeeperExercise = {
          id: userId,
          userId,
          status: exerciseData.status || 'in_progress',
          firstCall: {
            lines: exerciseData.firstCall?.lines || []
          },
          secondCall: {
            lines: exerciseData.secondCall?.lines || []
          },
          evaluation: exerciseData.evaluation || {
            criteria: GOALKEEPER_EVALUATION_CRITERIA.map(criterion => ({
              ...criterion,
              subCriteria: (criterion.subCriteria || []).map(sub => ({
                ...sub,
                score: 0,
                feedback: ''
              }))
            })),
            totalScore: 0
          },
          createdAt: exerciseData.createdAt || new Date().toISOString(),
          updatedAt: exerciseData.updatedAt || new Date().toISOString()
        };
        
        console.log('Normalized exercise data:', exercise);
        onChange(exercise);
      } else {
        console.warn('Exercise document does not exist for user:', userId);
      }
    }, error => {
      console.error('Error in onSnapshot:', error);
    });
  },

  async updateExercise(userId: string, exercise: GoalkeeperExercise): Promise<void> {
    console.log('Updating exercise for user:', userId, exercise);
    const exerciseRef = doc(db, `users/${userId}/exercises/goalkeeper`);
    
    try {
      await updateDoc(exerciseRef, {
        ...cleanUndefined(exercise),
        updatedAt: new Date().toISOString()
      });
      console.log('Exercise updated successfully');
    } catch (error) {
      console.error('Error updating exercise:', error);
      throw error;
    }
  },

  async submitExercise(userId: string): Promise<void> {
    console.log('Soumission de l\'exercice pour l\'utilisateur:', userId);
    const exerciseRef = doc(db, `users/${userId}/exercises/goalkeeper`);
    
    try {
      await updateDoc(exerciseRef, {
        status: 'submitted',
        updatedAt: new Date().toISOString()
      });
      console.log('Exercice soumis avec succès');
    } catch (error) {
      console.error('Erreur lors de la soumission de l\'exercice:', error);
      throw error;
    }
  },

  async updateEvaluation(userId: string, evaluation: GoalkeeperExercise['evaluation']): Promise<void> {
    console.log('Mise à jour de l\'évaluation pour l\'utilisateur:', userId, evaluation);
    const exerciseRef = doc(db, `users/${userId}/exercises/goalkeeper`);
    
    try {
      await updateDoc(exerciseRef, {
        evaluation: cleanUndefined(evaluation),
        updatedAt: new Date().toISOString()
      });
      console.log('Évaluation mise à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'évaluation:', error);
      throw error;
    }
  }
};
