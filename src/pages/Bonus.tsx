import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bonusService, BonusExercise } from '../features/bonus/services/bonusService';
import { ExerciseTemplate } from '../components/ExerciseTemplate';

const Bonus = () => {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentId = searchParams.get('userId');
  const [exercise, setExercise] = useState<BonusExercise | null>(null);
  const [loading, setLoading] = useState(false);

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const isViewMode = !!studentId;
  const targetUserId = studentId || currentUser?.uid;

  useEffect(() => {
    if (!targetUserId) return;

    const loadExercise = async () => {
      try {
        const loadedExercise = await bonusService.getExercise(targetUserId);
        setExercise(loadedExercise);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'exercice:', err);
      }
    };

    loadExercise();

    const unsubscribe = bonusService.subscribeToExercise(targetUserId, (updatedExercise) => {
      setExercise(updatedExercise);
    });

    return () => unsubscribe();
  }, [targetUserId]);

  const handleTaskChange = (index: number, completed: boolean) => {
    if (!exercise || !targetUserId || isViewMode) return;

    const updatedExercise = { ...exercise };
    updatedExercise.tasks[index].completed = completed;
    
    setExercise(updatedExercise);
    bonusService.updateExercise(targetUserId, updatedExercise);
  };

  const handleScoreChange = (index: number, score: number) => {
    if (!exercise || !targetUserId || !isFormateur) return;

    const updatedExercise = { ...exercise };
    updatedExercise.tasks[index].score = score;
    updatedExercise.totalScore = updatedExercise.tasks.reduce((total, task) => total + (task.score || 0), 0);
    
    setExercise(updatedExercise);
    bonusService.updateExercise(targetUserId, updatedExercise);
  };

  const handleSubmit = async () => {
    if (!targetUserId || isViewMode) return;

    try {
      setLoading(true);
      await bonusService.submitExercise(targetUserId);
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
      await bonusService.evaluateExercise(targetUserId, exercise.tasks, currentUser.uid);
    } catch (err) {
      console.error('Erreur lors de la publication:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!exercise) {
    return (
      <ExerciseTemplate
        title="Bonus"
        description="Faites partie de la communauté BrightBiz et des tops vendeurs => connectez-vous!"
      >
        <div className="p-4">Chargement de l'exercice...</div>
      </ExerciseTemplate>
    );
  }

  return (
    <ExerciseTemplate
      title="Bonus"
      description="Faites partie de la communauté BrightBiz et des tops vendeurs => connectez-vous!"
    >
      <div className="w-full">
        <div className="bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/90 p-6 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-purple-800">Votre score</h3>
              {exercise?.totalScore !== undefined ? (
                <p className="text-2xl font-bold text-purple-900">{exercise.totalScore}/20</p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-purple-900">-</p>
                  <p className="text-sm text-purple-600">(max 20 points)</p>
                </>
              )}
            </div>
            
            <div className="bg-white/90 p-6 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-teal-800">Statut de l'exercice</h3>
              <p className="text-2xl font-bold text-teal-900">
                {exercise?.status === 'not_started' && 'À débuter'}
                {exercise?.status === 'in_progress' && 'En cours'}
                {exercise?.status === 'submitted' && 'En attente de correction'}
                {exercise?.status === 'evaluated' && 'Corrigé'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-4 px-6 font-medium text-gray-700">Action à réaliser</th>
                {isFormateur && (
                  <th className="text-center py-4 px-6 font-medium text-gray-700 w-24">Score</th>
                )}
                <th className="text-center py-4 px-6 font-medium text-gray-700 w-48">
                  {isFormateur ? 'Fait' : 'Cochez quand cela a été fait'}
                </th>
              </tr>
            </thead>
            <tbody>
              {exercise.tasks.map((task, index) => (
                <tr key={index} className="border-t">
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-gray-800">{task.text}</p>
                      <a href={task.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm mt-1 block">
                        {task.url}
                      </a>
                    </div>
                  </td>
                  {isFormateur && (
                    <td className="py-4 px-6">
                      <select
                        value={task.score || 0}
                        onChange={(e) => handleScoreChange(index, Number(e.target.value))}
                        disabled={exercise.status === 'evaluated'}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                      </select>
                    </td>
                  )}
                  <td className="py-4 px-6 text-center">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={(e) => handleTaskChange(index, e.target.checked)}
                      disabled={isViewMode || exercise.status === 'submitted' || exercise.status === 'evaluated'}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isFormateur ? (
          (exercise.status === 'submitted' || exercise.status === 'in_progress') && (
            <div className="flex justify-end mt-6">
              <button
                onClick={handlePublishEvaluation}
                disabled={loading || !exercise.tasks.some(task => task.score !== undefined)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Publication...' : 'Publier la correction'}
              </button>
            </div>
          )
        ) : (
          <div className="flex justify-end gap-4 mt-8">
            {exercise.status !== 'submitted' && exercise.status !== 'evaluated' && !isViewMode && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? 'Soumission...' : 'Soumettre'}
              </button>
            )}
          </div>
        )}
      </div>
    </ExerciseTemplate>
  );
};

export default Bonus;
