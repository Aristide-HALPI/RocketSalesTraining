import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { ExerciseTemplate } from '../../../components/ExerciseTemplate';
import { presentationService, type PresentationExercise } from '../services/presentationService';
import { toast } from 'react-hot-toast';

export default function Presentation() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const studentIdParam = searchParams.get('userId');

  const [currentExercise, setCurrentExercise] = useState<PresentationExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainerScore, setTrainerScore] = useState<number>(0);
  const [trainerComment, setTrainerComment] = useState<string>('');

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const isStudent = !!studentIdParam;
  const canEdit = !isStudent && currentExercise?.status !== 'evaluated';
  const canEvaluate = isFormateur && currentExercise?.status !== 'evaluated';
  const targetUserId = studentIdParam || currentUser?.uid || '';

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!targetUserId && !isFormateur) {
      navigate('/');
      return;
    }
  }, [currentUser, targetUserId, isFormateur, navigate]);

  useEffect(() => {
    if (authLoading || !targetUserId) return;

    const unsubscribe = presentationService.subscribeToExercise(targetUserId, (exercise) => {
      setCurrentExercise(exercise);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [targetUserId, authLoading]);

  const handleContentChange = useCallback(async (content: string) => {
    if (!currentExercise || !canEdit) return;

    try {
      await presentationService.updateExercise(targetUserId, {
        content,
        status: 'in_progress'
      });
      toast.success('Sauvegarde réussie');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  }, [currentExercise, canEdit, targetUserId]);

  const handleSubmit = async () => {
    if (!currentExercise || !targetUserId || isStudent) return;

    try {
      await presentationService.submitExercise(targetUserId);
      toast.success('Exercice soumis avec succès');
    } catch (error) {
      console.error('Error submitting exercise:', error);
      toast.error('Erreur lors de la soumission');
    }
  };

  const handleEvaluate = async () => {
    if (!canEvaluate || !targetUserId) return;

    try {
      await presentationService.evaluateExercise(targetUserId, trainerScore, trainerComment, currentUser?.uid || '');
      toast.success('Évaluation enregistrée');
    } catch (error) {
      console.error('Error evaluating exercise:', error);
      toast.error('Erreur lors de l\'évaluation');
    }
  };

  const handleAIEvaluation = async () => {
    if (!isFormateur || !targetUserId) return;

    try {
      await presentationService.evaluateWithAI(targetUserId);
      toast.success('Évaluation IA effectuée');
    } catch (error) {
      console.error('Error during AI evaluation:', error);
      toast.error('Erreur lors de l\'évaluation IA');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Chargement de l'exercice...</div>
        </div>
      </div>
    );
  }

  if (!currentExercise) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center text-red-600">
          <div className="text-lg">Une erreur est survenue lors du chargement de l'exercice.</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Présentation de votre société</h1>

      {/* Score et Statut */}
      <div className="flex justify-between items-start mb-8">
        <div className="bg-purple-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-900">Votre score</h3>
          <div className="text-3xl font-bold text-purple-700">
            {currentExercise?.totalScore || 0}/{currentExercise?.maxScore || 20}
          </div>
          <div className="text-sm text-purple-600">
            (max {currentExercise?.maxScore || 20} points)
          </div>
        </div>
        <div className="bg-blue-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900">Statut de l'exercice</h3>
          <div className="text-xl font-semibold text-blue-700">
            {currentExercise?.status === 'not_started' && 'Non commencé'}
            {currentExercise?.status === 'in_progress' && 'En cours'}
            {currentExercise?.status === 'submitted' && 'Soumis'}
            {currentExercise?.status === 'evaluated' && 'Évalué'}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-emerald-800 text-white rounded-lg p-6 mb-8">
        <p className="text-lg">
          Présentez votre société afin d'impressionner votre client! Cette présentation doit durer entre 2 et 3 minutes
          (assurez-vous que les valeurs profondes ou au moins la mission de votre société s'y trouvent!).
          Ne tombez pas dans le piège de commencer à vendre vos solutions! Ce n'est pas le but ici!
        </p>
      </div>

      {/* Zone de réponse */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <textarea
          value={currentExercise?.content || ''}
          onChange={(e) => handleContentChange(e.target.value)}
          disabled={!canEdit}
          placeholder="Écrivez votre présentation ici..."
          className="w-full h-64 p-4 border rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
        />
      </div>

      {/* Zone Formateur */}
      {isFormateur && (
        <div className="bg-gray-100 rounded-lg p-6 space-y-4 mb-8">
          <h3 className="text-lg font-semibold text-gray-900">Mode Formateur</h3>
          
          {/* Note et Commentaire */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Note (sur 20)</label>
              <input
                type="number"
                min="0"
                max="20"
                value={trainerScore}
                onChange={(e) => setTrainerScore(Math.min(20, Math.max(0, parseInt(e.target.value) || 0)))}
                disabled={!canEvaluate}
                className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Commentaire</label>
              <textarea
                value={trainerComment}
                onChange={(e) => setTrainerComment(e.target.value)}
                disabled={!canEvaluate}
                placeholder="Votre commentaire..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 h-32"
              />
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex space-x-4">
            <button
              onClick={handleAIEvaluation}
              disabled={!isFormateur || currentExercise?.status === 'evaluated'}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-md hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
            >
              Correction IA
            </button>
            <button
              onClick={handleEvaluate}
              disabled={!canEvaluate}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Valider l'évaluation
            </button>
          </div>
        </div>
      )}

      {/* Affichage du commentaire pour l'étudiant */}
      {!isFormateur && currentExercise?.trainerComment && currentExercise?.status === 'evaluated' && (
        <div className="bg-gray-100 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Commentaire du formateur</h3>
          <div className="text-gray-700 whitespace-pre-wrap">
            {currentExercise.trainerComment}
          </div>
        </div>
      )}

      {/* Bouton de soumission pour l'étudiant */}
      {!isFormateur && currentExercise?.status !== 'evaluated' && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={currentExercise?.status === 'submitted'}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            Soumettre
          </button>
        </div>
      )}
    </div>
  );
}
