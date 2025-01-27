import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { GoalkeeperExercise, GOALKEEPER_EVALUATION_CRITERIA } from '../types';

type ExerciseStatus = 'in_progress' | 'submitted' | 'evaluated';

const isValidStatus = (status: any): status is ExerciseStatus => {
  return ['in_progress', 'submitted', 'evaluated'].includes(status);
};

// Fonction utilitaire pour nettoyer les undefined
function cleanUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

const initializeNewExercise = (userId: string): GoalkeeperExercise => {
  console.log('Initializing new exercise for user:', userId);
  
  const createInitialLine = (speaker: 'goalkeeper' | 'commercial', text: string = '') => {
    const line = {
      id: Math.random().toString(36).substr(2, 9),
      speaker,
      text,
      feedback: ''
    };
    console.log('Created initial line:', line);
    return line;
  };

  // Créer 18 lignes alternées pour le premier appel
  const firstCallLines = Array.from({ length: 18 }, (_, index) => 
    createInitialLine(index % 2 === 0 ? 'goalkeeper' : 'commercial', '')
  );
  console.log('Created first call lines:', firstCallLines);

  // Créer 5 lignes alternées pour le deuxième appel
  const secondCallLines = Array.from({ length: 5 }, (_, index) => 
    createInitialLine(index % 2 === 0 ? 'commercial' : 'goalkeeper', '')
  );
  console.log('Created second call lines:', secondCallLines);

  const exercise: GoalkeeperExercise = {
    id: userId,
    userId,
    status: 'in_progress' as const,
    firstCall: {
      lines: firstCallLines
    },
    secondCall: {
      lines: secondCallLines
    },
    evaluation: {
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
    maxScore: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('Created new exercise:', exercise);
  return exercise;
};

export const goalkeeperService = {
  async getExercise(userId: string): Promise<GoalkeeperExercise | null> {
    console.log('Loading exercise for user:', userId);
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'goalkeeper');
    
    try {
      const exerciseDoc = await getDoc(exerciseRef);
      console.log('Exercise doc exists:', exerciseDoc.exists(), 'Data:', exerciseDoc.data());

      if (!exerciseDoc.exists()) {
        console.log('Creating new exercise for user:', userId);
        const newExercise: GoalkeeperExercise = {
          id: 'goalkeeper',
          userId,
          status: 'not_started',
          firstCall: { lines: [] },
          secondCall: { lines: [] },
          maxScore: 30,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(exerciseRef, cleanUndefined(newExercise));
        return newExercise;
      }

      const data = exerciseDoc.data();
        
      // Vérifier que le status est valide
      if (!isValidStatus(data.status)) {
        console.error('Invalid status:', data.status);
        return null;
      }

      const exercise: GoalkeeperExercise = {
        id: userId,
        userId,
        status: data.status as 'in_progress' | 'submitted' | 'evaluated',
        firstCall: {
          lines: data.firstCall?.lines || []
        },
        secondCall: {
          lines: data.secondCall?.lines || []
        },
        evaluation: {
          criteria: data.evaluation?.criteria || [],
          totalScore: data.evaluation?.totalScore || 0,
          evaluatedBy: data.evaluation?.evaluatedBy,
          evaluatedAt: data.evaluation?.evaluatedAt
        },
        maxScore: data.maxScore || 30,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };

      return exercise;
    } catch (error) {
      console.error('Error getting goalkeeper exercise:', error);
      return null;
    }
  },

  subscribeToExercise(userId: string, onChange: (exercise: GoalkeeperExercise) => void) {
    console.log('Subscribing to exercise updates for user:', userId);
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'goalkeeper');
    
    // Créer l'exercice s'il n'existe pas
    getDoc(exerciseRef).then(async (doc) => {
      if (!doc.exists()) {
        console.log('Exercise does not exist, creating new one...');
        const newExercise: GoalkeeperExercise = {
          id: 'goalkeeper',
          userId,
          status: 'not_started',
          firstCall: { lines: [] },
          secondCall: { lines: [] },
          maxScore: 30,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(exerciseRef, cleanUndefined(newExercise));
      }
    });

    return onSnapshot(exerciseRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        
        // Vérifier que le status est valide
        if (!isValidStatus(data.status)) {
          console.error('Invalid status:', data.status);
          return;
        }

        const exercise: GoalkeeperExercise = {
          id: userId,
          userId,
          status: data.status as ExerciseStatus,
          firstCall: data.firstCall || { lines: [] },
          secondCall: data.secondCall || { lines: [] },
          evaluation: {
            criteria: data.evaluation?.criteria || GOALKEEPER_EVALUATION_CRITERIA.map(criterion => ({
              ...criterion,
              subCriteria: criterion.subCriteria.map(sub => ({
                ...sub,
                score: 0,
                feedback: ''
              }))
            })),
            totalScore: data.evaluation?.totalScore || 0,
            evaluatedBy: data.evaluation?.evaluatedBy,
            evaluatedAt: data.evaluation?.evaluatedAt
          },
          maxScore: data.maxScore || 30,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };

        onChange(exercise);
      } else {
        console.log('Exercise document does not exist for user:', userId);
      }
    });
  },

  async updateExercise(userId: string, exercise: GoalkeeperExercise): Promise<void> {
    console.log('Updating exercise for user:', userId, exercise);
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'goalkeeper');
    
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
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'goalkeeper');
    
    try {
      // Réinitialiser l'évaluation avec tous les scores à 0
      const resetEvaluation = {
        criteria: GOALKEEPER_EVALUATION_CRITERIA.map(criterion => ({
          ...criterion,
          subCriteria: criterion.subCriteria.map(sub => ({
            ...sub,
            score: 0,
            feedback: ''
          }))
        })),
        totalScore: 0
      };

      await updateDoc(exerciseRef, {
        status: 'submitted',
        updatedAt: new Date().toISOString(),
        evaluation: resetEvaluation
      });
      console.log('Exercice soumis avec succès');
    } catch (error) {
      console.error('Erreur lors de la soumission de l\'exercice:', error);
      throw error;
    }
  },

  async updateEvaluation(userId: string, evaluation: GoalkeeperExercise['evaluation']): Promise<void> {
    console.log('Mise à jour de l\'évaluation pour l\'utilisateur:', userId, evaluation);
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'goalkeeper');
    
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
