import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { presentationService } from '../services/presentationService';
import type { PresentationExercise } from '../services/presentationService';

export default function Presentation() {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const urlUserId = urlParams.get('userId');
  const navigate = useNavigate();

  const [currentExercise, setCurrentExercise] = useState<PresentationExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainerScore, setTrainerScore] = useState<number>(0);
  const [trainerComment, setTrainerComment] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const trainerCommentRef = useRef<HTMLTextAreaElement>(null);
  const studentCommentRef = useRef<HTMLTextAreaElement>(null);

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  
  // L'ID de l'utilisateur dont on évalue l'exercice (soit l'étudiant de l'URL, soit l'utilisateur courant)
  const targetUserId = urlUserId || currentUser?.uid;

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!targetUserId) {
      console.error('No target user ID available');
      return;
    }

    const initializeExercise = async () => {
      // Si on est formateur, on doit avoir un userId dans l'URL
      if (isFormateur && !urlUserId) {
        try {
          // Créer un nouvel exercice pour le formateur
          const exercise = await presentationService.getExercise(currentUser.uid);
          if (!exercise) {
            await presentationService.createOrUpdateExercise(currentUser.uid, '');
          }
        } catch (error) {
          console.error('Error initializing exercise:', error);
          toast.error('Erreur lors de l\'initialisation de l\'exercice');
        }
      }

      console.log('Subscribing to exercise for user:', targetUserId);
      const unsubscribe = presentationService.subscribeToExercise(targetUserId, (exercise) => {
        console.log('Exercise data received:', exercise);
        if (exercise) {
          setCurrentExercise(exercise);
          // Initialiser les valeurs du formateur si disponibles
          if (exercise.totalScore !== undefined) {
            setTrainerScore(exercise.totalScore);
          }
          if (exercise.trainerComment) {
            setTrainerComment(exercise.trainerComment);
          }
        }
        setLoading(false);
      });

      return unsubscribe;
    };

    initializeExercise();
  }, [currentUser, targetUserId, navigate, isFormateur, urlUserId]);

  // Effet pour mettre à jour les champs formateur avec l'évaluation IA
  useEffect(() => {
    if (currentExercise?.aiEvaluation && isFormateur) {
      // Mise à jour du score
      setTrainerScore(currentExercise.aiEvaluation.score || 0);

      // Construction du commentaire détaillé
      const commentParts = [
        currentExercise.aiEvaluation.feedback,
        '\n\nPoints forts :',
        ...(currentExercise.aiEvaluation.strengths?.map(s => `- ${s}`) || []),
        '\n\nPoints à améliorer :',
        ...(currentExercise.aiEvaluation.improvements?.map(i => `- ${i}`) || []),
        '\n\nCritères évalués :'
      ];

      // Ajout des critères détaillés
      if (currentExercise.aiEvaluation.criteria) {
        currentExercise.aiEvaluation.criteria.forEach(criterion => {
          commentParts.push(`\n${criterion.name} (${criterion.score}/${criterion.maxPoints}) : ${criterion.feedback}`);
        });
      }

      setTrainerComment(commentParts.join('\n'));
    }
  }, [currentExercise?.aiEvaluation, isFormateur]);

  // Effet pour auto-redimensionner la zone de commentaire
  useEffect(() => {
    const textarea = trainerCommentRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [trainerComment]);

  useEffect(() => {
    const textarea = studentCommentRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [currentExercise?.trainerComment]);

  const handleContentChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    const textarea = event.target;
    
    // Auto-resize
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    
    if (!targetUserId) return;

    try {
      await presentationService.createOrUpdateExercise(targetUserId, newContent);
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Effet pour initialiser la hauteur du textarea
  useEffect(() => {
    const textarea = document.querySelector('textarea');
    if (textarea && currentExercise?.content) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [currentExercise?.content]);

  const handleSubmit = async () => {
    if (!currentExercise?.content) {
      toast.error('Veuillez ajouter du contenu avant de soumettre');
      return;
    }

    if (!targetUserId) {
      toast.error('Erreur: impossible de soumettre l\'exercice');
      return;
    }

    try {
      setLoading(true);
      await presentationService.submitExercise(targetUserId);
      toast.success('Exercice soumis avec succès !');
    } catch (error) {
      console.error('Error submitting exercise:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const handleAIEvaluation = async () => {
    if (!isFormateur || !targetUserId) return;

    setIsEvaluating(true);
    try {
      await presentationService.evaluateWithAI(targetUserId, userProfile?.organizationId || '');
      toast.success('Évaluation IA effectuée');
    } catch (error) {
      console.error('Error during AI evaluation:', error);
      toast.error('Erreur lors de l\'évaluation IA');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleResetEvaluation = async () => {
    if (!isFormateur || !targetUserId) return;

    try {
      await presentationService.resetEvaluation(targetUserId);
      toast.success('Évaluation réinitialisée, vous pouvez maintenant modifier la note et le commentaire');
    } catch (error) {
      console.error('Error during evaluation reset:', error);
      toast.error('Erreur lors de la réinitialisation de l\'évaluation');
    }
  };

  const handleEvaluate = async () => {
    if (!targetUserId || !currentUser?.uid) {
      toast.error('Impossible de publier l\'évaluation');
      return;
    }

    try {
      await presentationService.evaluateExercise(targetUserId, trainerScore, trainerComment, currentUser.uid);
      toast.success('Évaluation publiée avec succès !');
    } catch (error) {
      console.error('Error evaluating exercise:', error);
      toast.error('Erreur lors de la publication de l\'évaluation');
    }
  };

  // Rendu des boutons d'action pour le formateur
  const renderTrainerActions = () => {
    if (!isFormateur || !currentExercise) return null;

    const isEvaluated = currentExercise.status === 'evaluated' || currentExercise.status === 'published';

    return (
      <div className="flex flex-wrap justify-end gap-4 mt-6">
        <button
          onClick={handleAIEvaluation}
          disabled={isEvaluating || isEvaluated}
          className={`px-6 py-2 rounded-md text-white ${
            isEvaluating || isEvaluated
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {isEvaluating ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Évaluation en cours...
            </span>
          ) : (
            "Évaluation IA"
          )}
        </button>
        <button
          onClick={handleEvaluate}
          disabled={isEvaluated}
          className={`bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Publier l'évaluation
        </button>
        {isEvaluated && (
          <button
            onClick={handleResetEvaluation}
            className="bg-yellow-600 text-white px-6 py-2 rounded-md hover:bg-yellow-700"
          >
            Modifier l'évaluation
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Présentation de votre société</h2>

      {/* Score et Statut */}
      <div className="flex justify-between items-start mb-8">
        <div className="bg-purple-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-900">Votre score</h3>
          <div className="text-3xl font-bold text-purple-700">
            {isFormateur ? trainerScore : (currentExercise?.totalScore || 0)}/{currentExercise?.maxScore || 20}
          </div>
          <div className="text-sm text-purple-600">
            (max {currentExercise?.maxScore || 20} points)
          </div>
        </div>
        <div className="bg-blue-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900">Statut de l'exercice</h3>
          <div className="text-xl font-semibold text-blue-700">
            {!currentExercise?.status || currentExercise.status === 'not_started' ? 'À débuter' : 
             currentExercise.status === 'draft' ? 'En cours' :
             currentExercise.status === 'submitted' ? 'En attente d\'évaluation' :
             'Terminé'}
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
        <div className="flex flex-col space-y-4">
          <textarea
            value={currentExercise?.content || ''}
            onChange={handleContentChange}
            disabled={isFormateur || currentExercise?.status === 'submitted' || currentExercise?.status === 'evaluated'}
            placeholder="Écrivez votre présentation ici..."
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-700 min-h-[16rem] resize-none transition-all duration-200 ease-in-out"
            style={{ overflow: 'hidden' }}
          />
          
          {/* Bouton de soumission (visible uniquement pour l'apprenant) */}
          {!isFormateur && currentExercise && currentExercise.status !== 'submitted' && currentExercise.status !== 'evaluated' && (
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={loading || !currentExercise?.content}
                className={`px-6 py-2 rounded-md text-white ${
                  loading || !currentExercise?.content
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {loading ? 'Soumission...' : 'Soumettre'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zone Formateur */}
      {isFormateur && currentExercise && (
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
                disabled={currentExercise.status === 'evaluated'}
                className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Commentaire</label>
              <textarea
                ref={trainerCommentRef}
                value={trainerComment}
                onChange={(e) => setTrainerComment(e.target.value)}
                disabled={currentExercise.status === 'evaluated'}
                placeholder="Votre commentaire..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 min-h-[8rem] resize-none transition-all duration-200 ease-in-out disabled:bg-gray-100"
                style={{ overflow: 'hidden' }}
              />
            </div>
          </div>

          {/* Boutons d'action du formateur */}
          {renderTrainerActions()}
        </div>
      )}

      {/* Affichage du commentaire du formateur pour l'étudiant */}
      {!isFormateur && currentExercise?.trainerComment && currentExercise?.status === 'evaluated' && (
        <div className="bg-gray-100 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Commentaire du formateur</h3>
          <textarea
            ref={studentCommentRef}
            value={currentExercise.trainerComment}
            readOnly
            className="w-full p-4 bg-white rounded-lg border-0 text-gray-700 resize-none"
            style={{ overflow: 'hidden' }}
          />
        </div>
      )}
    </div>
  );
}
