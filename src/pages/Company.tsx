import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { companyService, CompanyExercise } from '../features/company/services/companyService';
import { ExerciseTemplate } from '../components/ExerciseTemplate';

const Company = () => {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentId = searchParams.get('userId');
  const [exercise, setExercise] = useState<CompanyExercise | null>(null);
  const [loading, setLoading] = useState(false);

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const isViewMode = !!studentId;
  const targetUserId = studentId || currentUser?.uid;

  useEffect(() => {
    if (!targetUserId) return;

    const loadExercise = async () => {
      try {
        const loadedExercise = await companyService.getExercise(targetUserId);
        setExercise(loadedExercise);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'exercice:', err);
      }
    };

    loadExercise();

    const unsubscribe = companyService.subscribeToExercise(targetUserId, (updatedExercise) => {
      setExercise(updatedExercise);
    });

    return () => unsubscribe();
  }, [targetUserId]);

  const handlePresentationChange = (presentation: string) => {
    if (!exercise || !targetUserId || isViewMode) return;

    const updatedExercise = { ...exercise, presentation };
    setExercise(updatedExercise);
    companyService.updateExercise(targetUserId, updatedExercise);
  };

  const handleScoreChange = (score: number) => {
    if (!exercise || !targetUserId || !isFormateur) return;

    const updatedExercise = { ...exercise, score };
    setExercise(updatedExercise);
    companyService.updateExercise(targetUserId, updatedExercise);
  };

  const handleFeedbackChange = (feedback: string) => {
    if (!exercise || !targetUserId || !isFormateur) return;

    const updatedExercise = { ...exercise, feedback };
    setExercise(updatedExercise);
    companyService.updateExercise(targetUserId, updatedExercise);
  };

  const handleSubmit = async () => {
    if (!targetUserId || isViewMode) return;

    try {
      setLoading(true);
      await companyService.submitExercise(targetUserId);
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishEvaluation = async () => {
    if (!exercise || !targetUserId || !currentUser?.uid || !isFormateur) return;

    try {
      setLoading(true);
      await companyService.evaluateExercise(
        targetUserId,
        exercise.score || 0,
        exercise.feedback || '',
        currentUser.uid
      );
    } catch (err) {
      console.error('Erreur lors de la publication:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAIEvaluation = async () => {
    if (!exercise || !targetUserId || !isFormateur) return;

    try {
      setLoading(true);
      await companyService.evaluateWithAI(targetUserId);
    } catch (err) {
      console.error('Erreur lors de l\'évaluation IA:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!exercise) {
    return (
      <ExerciseTemplate
        title="Présentation de votre société"
        description=""
        maxScore={20}
      >
        <div className="p-4">Chargement de l'exercice...</div>
      </ExerciseTemplate>
    );
  }

  return (
    <ExerciseTemplate
      title="Présentation de votre société"
      description=""
      maxScore={20}
    >
      <div className="w-full">
        <div className="bg-emerald-800 text-white p-4 rounded-lg">
          <p>Présentez votre société afin d'impressionner votre client! Cette présentation doit durer entre 2 et 3 minutes (assurez-vous que les valeurs profondes ou au moins la mission de votre société s'y trouvent!). Ne tombez pas dans le piège de commencer à vendre vos solutions! Ce n'est pas le but ici!</p>
        </div>

        <div className="space-y-6 mt-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <textarea
              value={exercise?.presentation || ''}
              onChange={(e) => handlePresentationChange(e.target.value)}
              disabled={isViewMode || exercise?.status === 'submitted' || exercise?.status === 'evaluated'}
              placeholder="Écrivez votre présentation ici..."
              className="w-full p-4 border rounded-md resize-y min-h-[200px]"
              rows={8}
            />
          </div>

          {isFormateur && exercise?.status === 'submitted' && (
            <>
              <div className="mt-6 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Évaluation</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Score (sur {exercise.maxScore})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={exercise.maxScore}
                      value={exercise.score || 0}
                      onChange={(e) => handleScoreChange(parseInt(e.target.value))}
                      className="w-24 p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Feedback
                    </label>
                    <textarea
                      value={exercise.feedback || ''}
                      onChange={(e) => handleFeedbackChange(e.target.value)}
                      placeholder="Donnez votre feedback..."
                      className="w-full p-4 border rounded-md resize-y min-h-[100px]"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={handleAIEvaluation}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    disabled={loading}
                  >
                    Correction IA
                  </button>
                  <button
                    onClick={handlePublishEvaluation}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    disabled={loading || !exercise.score}
                  >
                    Publier la correction
                  </button>
                </div>
              </div>
            </>
          )}

          {!isFormateur && (
            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="mr-3">
                  {exercise?.status === 'not_started' && (
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                  {exercise?.status === 'in_progress' && (
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  )}
                  {exercise?.status === 'submitted' && (
                    <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {exercise?.status === 'evaluated' && (
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {exercise?.status === 'not_started' && "À débuter"}
                    {exercise?.status === 'in_progress' && "En cours"}
                    {exercise?.status === 'submitted' && "En attente de correction"}
                    {exercise?.status === 'evaluated' && "Corrigé"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {exercise?.status === 'not_started' && "Commencez à écrire votre présentation pour démarrer l'exercice"}
                    {exercise?.status === 'in_progress' && "Continuez à travailler sur votre présentation"}
                    {exercise?.status === 'submitted' && "Votre formateur va bientôt corriger votre exercice"}
                    {exercise?.status === 'evaluated' && "Consultez vos résultats et les commentaires du formateur"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {exercise?.status === 'evaluated' && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Score final</h3>
              <p className="text-2xl font-bold text-green-600">{exercise.score} / {exercise.maxScore}</p>
              {exercise.feedback && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Feedback du formateur</h4>
                  <p className="text-gray-700">{exercise.feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isFormateur && exercise?.status === 'in_progress' && !isViewMode && (
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Soumission...' : 'Soumettre'}
          </button>
        </div>
      )}
    </ExerciseTemplate>
  );
};

export default Company;
