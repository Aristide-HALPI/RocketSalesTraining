import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Exercise, 
  EvaluationWorkflow, 
  EvaluationState, 
  AIEvaluation, 
  TrainerReview 
} from '../types/evaluation';

interface UseExerciseEvaluationProps {
  exerciseId: string;
  initialEvaluation?: EvaluationState;
}

export const useExerciseEvaluation = ({ exerciseId, initialEvaluation }: UseExerciseEvaluationProps) => {
  const { userProfile } = useAuth();
  const [evaluation, setEvaluation] = useState<EvaluationState | null>(initialEvaluation || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormateur = userProfile?.role === 'formateur' || userProfile?.role === 'admin';

  // Charger l'évaluation depuis Firestore
  const loadEvaluation = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'exercises', exerciseId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const exerciseData = docSnap.data() as Exercise;
        setEvaluation(exerciseData.evaluation);
      }
    } catch (err) {
      setError('Erreur lors du chargement de l\'évaluation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour le workflow d'évaluation
  const updateWorkflow = async (workflow: EvaluationWorkflow) => {
    if (!isFormateur) {
      setError('Seuls les formateurs peuvent modifier le workflow d\'évaluation');
      return;
    }

    try {
      setLoading(true);
      const docRef = doc(db, 'exercises', exerciseId);
      await updateDoc(docRef, {
        'evaluation.workflow': workflow,
        'evaluation.updatedAt': new Date().toISOString(),
        'evaluation.updatedBy': userProfile?.uid
      });

      setEvaluation(prev => prev ? { ...prev, workflow } : null);
    } catch (err) {
      setError('Erreur lors de la mise à jour du workflow');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder l'évaluation de l'IA
  const saveAIEvaluation = async (aiEvaluation: AIEvaluation) => {
    try {
      setLoading(true);
      const docRef = doc(db, 'exercises', exerciseId);
      
      const updates: Partial<EvaluationState> = {
        status: evaluation?.workflow === 'ai_auto_publish' ? 'published' : 'ai_evaluated',
        aiEvaluation,
      };

      if (evaluation?.workflow === 'ai_auto_publish') {
        updates.publishedAt = new Date().toISOString();
        updates.publishedBy = 'AI';
      }

      await updateDoc(docRef, {
        'evaluation': { ...evaluation, ...updates }
      });

      setEvaluation(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      setError('Erreur lors de la sauvegarde de l\'évaluation IA');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder la revue du formateur
  const saveTrainerReview = async (trainerReview: TrainerReview) => {
    if (!isFormateur) {
      setError('Seuls les formateurs peuvent soumettre une revue');
      return;
    }

    try {
      setLoading(true);
      const docRef = doc(db, 'exercises', exerciseId);
      
      const updates: Partial<EvaluationState> = {
        status: 'published',
        trainerReview,
        publishedAt: new Date().toISOString(),
        publishedBy: userProfile?.uid
      };

      await updateDoc(docRef, {
        'evaluation': { ...evaluation, ...updates }
      });

      setEvaluation(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      setError('Erreur lors de la sauvegarde de la revue');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (exerciseId && !initialEvaluation) {
      loadEvaluation();
    }
  }, [exerciseId]);

  return {
    evaluation,
    loading,
    error,
    isFormateur,
    updateWorkflow,
    saveAIEvaluation,
    saveTrainerReview,
  };
};
