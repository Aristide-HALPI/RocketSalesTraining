import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { GoalkeeperExercise, GOALKEEPER_EVALUATION_CRITERIA } from '../types';

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
    createInitialLine(index % 2 === 0 ? 'commercial' : 'goalkeeper', '')
  );
  console.log('Created first call lines:', firstCallLines);

  // Créer 5 lignes alternées pour le deuxième appel
  const secondCallLines = Array.from({ length: 5 }, (_, index) => 
    createInitialLine(index % 2 === 0 ? 'commercial' : 'goalkeeper', '')
  );
  console.log('Created second call lines:', secondCallLines);

  const exercise = {
    id: userId,
    userId,
    status: 'in_progress',
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
        const newExercise = initializeNewExercise(userId);
        console.log('New exercise data:', newExercise);
        await setDoc(exerciseRef, cleanUndefined(newExercise));
        return newExercise;
      }

      const exerciseData = exerciseDoc.data();
      console.log('Exercise data from Firestore:', exerciseData);

      const status = exerciseData.status || 'in_progress';
      
      // Vérifier que le status est valide
      if (status !== 'in_progress' && status !== 'submitted' && status !== 'evaluated') {
        console.error('Invalid status:', status);
        return null;
      }

      const exercise: GoalkeeperExercise = {
        id: userId,
        userId,
        status: status as 'in_progress' | 'submitted' | 'evaluated',
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
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'goalkeeper');
    
    // Créer l'exercice s'il n'existe pas
    getDoc(exerciseRef).then(async (doc) => {
      if (!doc.exists()) {
        console.log('Exercise does not exist, creating new one...');
        const newExercise = initializeNewExercise(userId);
        await setDoc(exerciseRef, cleanUndefined(newExercise));
      }
    });

    return onSnapshot(exerciseRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const status = data.status || 'in_progress';
        
        // Vérifier que le status est valide
        if (status !== 'in_progress' && status !== 'submitted' && status !== 'evaluated') {
          console.error('Invalid status:', status);
          return;
        }

        onChange({
          id: userId,
          userId,
          status: status as 'in_progress' | 'submitted' | 'evaluated',
          firstCall: data.firstCall || { lines: [] },
          secondCall: data.secondCall || { lines: [] },
          evaluation: data.evaluation || {
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
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        });
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
