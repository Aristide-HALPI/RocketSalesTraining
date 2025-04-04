import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Evaluation, 
  EvaluationWorkflow,
  EvaluationStatus,
  AIEvaluation,
  TrainerReview 
} from '../types/evaluation';

interface UseExerciseEvaluationProps {
  exerciseId: string;
  initialEvaluation?: Evaluation;
}

export const useExerciseEvaluation = ({ exerciseId, initialEvaluation }: UseExerciseEvaluationProps) => {
  const { userProfile } = useAuth();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(initialEvaluation || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';

  // Charger l'évaluation depuis Firestore
  const loadEvaluation = async () => {
    if (!userProfile?.uid) return;
    
    try {
      setLoading(true);
      // Si l'exerciceId contient un chemin complet, l'utiliser directement
      const docRef = exerciseId.includes('users/') 
        ? doc(db, exerciseId)
        : doc(db, `users/${userProfile.uid}/exercises/${exerciseId}`);
        
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const exerciseData = docSnap.data();
        if (exerciseData.evaluation) {
          setEvaluation(exerciseData.evaluation);
        } else if (initialEvaluation) {
          setEvaluation(initialEvaluation);
        }
      } else if (initialEvaluation) {
        setEvaluation(initialEvaluation);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur lors du chargement de l\'évaluation'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour l'évaluation
  const updateEvaluation = async (newEvaluation: Evaluation) => {
    if (!userProfile?.uid || !isFormateur) {
      setError(new Error('Only trainers can modify the evaluation'));
      return;
    }

    try {
      setLoading(true);
      const docRef = exerciseId.includes('users/') 
        ? doc(db, exerciseId)
        : doc(db, `users/${userProfile.uid}/exercises/${exerciseId}`);
        
      await updateDoc(docRef, {
        evaluation: newEvaluation,
        evaluatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setEvaluation(newEvaluation);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur lors de la mise à jour de l\'évaluation'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateWorkflow = async (workflow: EvaluationWorkflow) => {
    if (!evaluation || !isFormateur) {
      throw new Error('Permission denied or no evaluation exists');
    }

    const updatedEvaluation = {
      ...evaluation,
      workflow
    };

    await updateEvaluation(updatedEvaluation);
  };

  const saveAIEvaluation = async (aiEvaluation: AIEvaluation) => {
    if (!evaluation || !isFormateur) {
      throw new Error('Permission denied or no evaluation exists');
    }

    const updatedEvaluation = {
      ...evaluation,
      aiEvaluation,
      status: 'ai_evaluated' as EvaluationStatus
    };

    await updateEvaluation(updatedEvaluation);
  };

  const saveTrainerReview = async (trainerReview: TrainerReview) => {
    if (!evaluation || !isFormateur) {
      throw new Error('Permission denied or no evaluation exists');
    }

    const updatedEvaluation = {
      ...evaluation,
      trainerReview,
      status: 'published' as EvaluationStatus
    };

    await updateEvaluation(updatedEvaluation);
  };

  useEffect(() => {
    loadEvaluation();
  }, [exerciseId]);

  return {
    evaluation,
    loading,
    error,
    isFormateur,
    updateEvaluation,
    updateWorkflow,
    saveAIEvaluation,
    saveTrainerReview,
    loadEvaluation
  };
};
