import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { eombusPafiService, calculateTotalScore } from '../features/eombus-pafi/services/eombusPafiService';
import type { TimeContext } from '../features/eombus-pafi/services/eombusPafiService';
import { EombusPafiExercise } from '../features/eombus-pafi/services/eombusPafiService';
import { ExerciseTemplate } from '../components/ExerciseTemplate';
import { toast } from 'react-toastify';

export default function EombusPafi() {
  console.log('==========================================');
  console.log('CHARGEMENT DU COMPOSANT EOMBUS-PAF-I');
  console.log('==========================================');

  const [searchParams] = useSearchParams();
  const studentUserId = searchParams.get('userId');
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const [exercise, setExercise] = useState<EombusPafiExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiEvaluationLoading, setAiEvaluationLoading] = useState(false);

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const isViewingStudent = !!studentUserId;
  const targetUserId = studentUserId || currentUser?.uid || '';
  const isLearner = !isViewingStudent;

  // Déterminer si l'utilisateur peut modifier l'exercice
  const canEdit = useMemo(() => {
    if (!exercise) return false;
    // Ne peut pas modifier si l'exercice est soumis, évalué ou publié
    if (['submitted', 'evaluated', 'published'].includes(exercise.status)) return false;
    return isLearner;
  }, [exercise, isLearner]);

  // Déterminer si l'utilisateur peut soumettre l'exercice
  const canSubmit = useMemo(() => {
    if (!exercise) return false;
    // Ne peut pas soumettre si l'exercice est déjà soumis, évalué ou publié
    if (['submitted', 'evaluated', 'published'].includes(exercise.status)) return false;
    return isLearner && exercise.status === 'in_progress';
  }, [exercise, isLearner]);

  // Déterminer si l'utilisateur peut évaluer l'exercice
  const canEvaluate = useMemo(() => {
    return isFormateur && isViewingStudent && exercise?.status !== 'not_started' && exercise?.status !== 'published';
  }, [isFormateur, isViewingStudent, exercise]);

  // Déterminer si les champs d'évaluation sont désactivés
  const isEvaluationDisabled = useMemo(() => {
    return !canEvaluate || exercise?.status === 'published';
  }, [canEvaluate, exercise?.status]);

  useEffect(() => {
    console.log('EombusPafi - useEffect:', JSON.stringify({
      authLoading,
      currentUserId: currentUser?.uid,
      studentUserId,
      targetUserId,
      isFormateur,
      isViewingStudent,
      exerciseStatus: exercise?.status,
      canEvaluate
    }, null, 2));

    if (authLoading || !currentUser?.uid || !targetUserId) {
      console.log('EombusPafi - Cannot load exercise yet');
      return;
    }

    setLoading(true);
    console.log('EombusPafi - Loading exercise for user:', targetUserId);
    
    const unsubscribe = eombusPafiService.subscribeToExercise(targetUserId, (exerciseData) => {
      console.log('EombusPafi - Exercise data received:', exerciseData);
      setExercise(exerciseData);
      setLoading(false);
    });

    return () => {
      console.log('EombusPafi - Unsubscribing from exercise updates');
      unsubscribe();
    };
  }, [currentUser?.uid, targetUserId, authLoading]);

  // Fonction pour l'évaluation par l'IA
  const handleAIEvaluation = async (startIndex: number, endIndex: number, sectionName: string) => {
    if (!exercise || !canEvaluate || !targetUserId || !userProfile?.organizationId) {
      console.log('Cannot evaluate:', { exercise: !!exercise, canEvaluate, targetUserId });
      return;
    }
    
    try {
      setAiEvaluationLoading(true);
      await eombusPafiService.evaluateWithAI(
        targetUserId,
        userProfile.organizationId,
        startIndex,
        endIndex
      );
      toast.success(`Évaluation ${sectionName} terminée`);
    } catch (error) {
      console.error('Erreur lors de l\'évaluation:', error);
      toast.error('Erreur lors de l\'évaluation');
    } finally {
      setAiEvaluationLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!exercise || !targetUserId) return;
    
    try {
      await eombusPafiService.submitExercise(targetUserId);
      toast.success('Exercice soumis avec succès');
    } catch (error) {
      console.error('Error submitting exercise:', error);
      toast.error('Erreur lors de la soumission de l\'exercice');
    }
  };

  if (!exercise || loading || authLoading) {
    return (
      <ExerciseTemplate
        title="EOMBUS PAF I"
        description="Exercice d'évaluation EOMBUS PAF I"
        maxScore={100}
        hideScore={true}
      >
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
          <button
            onClick={async () => {
              if (!currentUser?.uid) return;
              try {
                await eombusPafiService.resetExercise(currentUser.uid);
                toast.success('Exercice réinitialisé avec succès');
                window.location.reload();
              } catch (error) {
                console.error('Erreur lors de la réinitialisation:', error);
                toast.error('Erreur lors de la réinitialisation');
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Réinitialiser l'exercice
          </button>
        </div>
      </ExerciseTemplate>
    );
  }

  return (
    <ExerciseTemplate
      title="EOMBUS PAF I"
      description="Exercice d'évaluation EOMBUS PAF I"
      currentScore={exercise.totalScore}
      maxScore={100}
      hideScore={true}
      status={exercise.status === 'published' ? 'evaluated' : exercise.status}
      onSubmit={handleSubmit}
      canSubmit={canSubmit}
      aiEvaluation={exercise.aiEvaluation}
    >
      <div className="space-y-8 p-6">
        {exercise.status === 'submitted' && exercise.submittedAt && (
          <div className="text-gray-600 bg-gray-100 p-4 rounded-lg">
            Exercice soumis le {new Date(exercise.submittedAt).toLocaleDateString()} à {new Date(exercise.submittedAt).toLocaleTimeString()}
          </div>
        )}
        {isFormateur && exercise.status === 'submitted' && (
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => handleAIEvaluation(0, 2, "Entreprise et Organisation")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
            >
              {aiEvaluationLoading ? 'Évaluation en cours...' : 'Évaluer Entreprise et Organisation'}
            </button>

            <button
              onClick={() => handleAIEvaluation(2, 4, "Moyens et Budget")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
            >
              {aiEvaluationLoading ? 'Évaluation en cours...' : 'Évaluer Moyens et Budget'}
            </button>

            <button
              onClick={() => handleAIEvaluation(4, 6, "Usage et Situation")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
            >
              {aiEvaluationLoading ? 'Évaluation en cours...' : 'Évaluer Usage et Situation'}
            </button>
          </div>
        )}
        
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                  <h2 className="text-sm font-medium text-gray-600">Votre score</h2>
                  <div className="mt-1">
                    <span className="text-2xl font-bold text-purple-600">
                      {Math.round((exercise.totalScore || 0) / (exercise.maxScore || 1) * 100)}
                    </span>
                    <span className="text-lg font-medium text-purple-600">/100</span>
                  </div>
                </div>

                <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                  <h2 className="text-sm font-medium text-gray-600">Statut de l'exercice</h2>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    {exercise.status === 'not_started' && 'À débuter'}
                    {exercise.status === 'in_progress' && 'En cours'}
                    {exercise.status === 'submitted' && 'Soumis'}
                    {exercise.status === 'evaluated' && 'Évalué'}
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Formateur - visible uniquement quand on consulte l'exercice d'un étudiant */}
            {isFormateur && isViewingStudent && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="text-blue-700 font-medium">Mode Formateur</div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleAIEvaluation(0, 2, "Entreprise et Organisation")}
                      disabled={aiEvaluationLoading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
                    >
                      {aiEvaluationLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Évaluation en cours...</span>
                        </>
                      ) : (
                        "Évaluer Entreprise et Organisation"
                      )}
                    </button>
                    <button
                      onClick={() => handleAIEvaluation(2, 4, "Moyens et Budget")}
                      disabled={aiEvaluationLoading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
                    >
                      {aiEvaluationLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Évaluation en cours...</span>
                        </>
                      ) : (
                        "Évaluer Moyens et Budget"
                      )}
                    </button>
                    <button
                      onClick={() => handleAIEvaluation(4, 6, "Usage et Situation")}
                      disabled={aiEvaluationLoading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
                    >
                      {aiEvaluationLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Évaluation en cours...</span>
                        </>
                      ) : (
                        "Évaluer Usage et Situation"
                      )}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading || !isFormateur || exercise.status === 'published'}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      Publier
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sections de l'exercice */}
            <div className="space-y-4">
              {exercise.sections.map((section, index) => (
                <div key={section.id} className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
                  <p className="text-gray-600 mb-6">{section.description}</p>
                  <div className="space-y-6">
                    {section.questions.map((question, qIndex) => (
                      <div key={qIndex} className="border-b pb-4 last:border-b-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium">Question {qIndex + 1} ({question.type})</p>
                            {isFormateur ? (
                              <>
                                <p className="text-gray-700">{question.text}</p>
                                {/* Zone de notation et commentaires pour les formateurs */}
                                <div className="mt-4 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700">Note :</label>
                                    <input
                                      type="text"
                                      value={question.score?.points || 0}
                                      onChange={(e) => {
                                        const maxPoints = question.type === 'fermee' || question.type === 'fermee_importance' ? 2 : 4;
                                        const points = Math.min(Math.max(parseFloat(e.target.value) || 0, 0), maxPoints);
                                        const updatedSections = [...exercise.sections];
                                        updatedSections[index].questions[qIndex].score = {
                                          points,
                                          maxPoints,
                                          percentage: (points / maxPoints) * 100
                                        };
                                        
                                        // Recalculer le score total
                                        const { finalScore, maxScore } = calculateTotalScore(updatedSections);
                                        
                                        // Mettre à jour l'exercice avec les nouvelles sections et le nouveau score
                                        eombusPafiService.updateExercise(targetUserId, {
                                          sections: updatedSections,
                                          totalScore: finalScore,
                                          maxScore
                                        });
                                      }}
                                      className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                      disabled={isEvaluationDisabled}
                                    />
                                    <span className="text-sm text-gray-500">
                                      /{question.type === 'fermee' || question.type === 'fermee_importance' ? 2 : 4}
                                    </span>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Commentaire :</label>
                                    <textarea
                                      value={question.trainerComment || ''}
                                      onChange={(e) => {
                                        const updatedSections = [...exercise.sections];
                                        updatedSections[index].questions[qIndex].trainerComment = e.target.value;
                                        eombusPafiService.updateExercise(targetUserId, {
                                          sections: updatedSections
                                        });
                                      }}
                                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                      rows={3}
                                      disabled={isEvaluationDisabled}
                                    />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="mt-2">
                                <textarea
                                  value={question.text}
                                  onChange={(e) => {
                                    if (!canEdit) return;
                                    const updatedSections = [...exercise.sections];
                                    updatedSections[index].questions[qIndex].text = e.target.value;
                                    
                                    // Vérifier si au moins une question est remplie
                                    const hasContent = updatedSections.some(section =>
                                      section.questions.some(q => q.text.trim().length > 0)
                                    );

                                    // Mettre à jour l'exercice avec le nouveau statut si nécessaire
                                    eombusPafiService.updateExercise(targetUserId, {
                                      sections: updatedSections,
                                      status: hasContent ? 'in_progress' : 'not_started'
                                    });
                                    
                                    // Ajuster la hauteur automatiquement
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                  }}
                                  ref={(el) => {
                                    if (el) {
                                      el.style.height = 'auto';
                                      el.style.height = el.scrollHeight + 'px';
                                    }
                                  }}
                                  placeholder="Écrivez votre question ici..."
                                  disabled={!canEdit}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 resize-none overflow-hidden min-h-[40px]"
                                  rows={1}
                                />
                                <div className="mt-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sélectionnez le contexte temporel
                                  </label>
                                  <select
                                    value={question.timeContext || 'présent'}
                                    onChange={(e) => {
                                      if (!canEdit) return;
                                      const updatedSections = [...exercise.sections];
                                      updatedSections[index].questions[qIndex].timeContext = e.target.value as TimeContext;
                                      eombusPafiService.updateExercise(targetUserId, {
                                        sections: updatedSections
                                      });
                                    }}
                                    disabled={!canEdit || isEvaluationDisabled}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                  >
                                    <option value="présent">Présent</option>
                                    <option value="passé">Passé</option>
                                    <option value="futur">Futur</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Commentaire final */}
            {isFormateur ? (
              <div className="bg-white shadow rounded-lg p-6 mt-6">
                <label className="block text-xl font-bold text-gray-900 mb-2">
                  Commentaire final
                </label>
                <textarea
                  value={exercise.trainerFinalComment || ''}
                  onChange={(e) => {
                    if (isEvaluationDisabled) return;
                    eombusPafiService.updateExercise(targetUserId, {
                      trainerFinalComment: e.target.value
                    });
                  }}
                  placeholder="Commentaire final..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  disabled={isEvaluationDisabled}
                />
              </div>
            ) : exercise.trainerFinalComment && (
              <div className="bg-gray-50 shadow rounded-lg p-6 mt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Commentaire final</h3>
                <p className="text-gray-700">{exercise.trainerFinalComment}</p>
              </div>
            )}
          </div>

          {/* Bouton Soumettre en bas à droite */}
          {!isViewingStudent && exercise.status !== 'evaluated' && (
            <div className="flex justify-end mt-8">
              <button
                onClick={handleSubmit}
                disabled={loading || exercise.status === 'not_started'}
                className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Soumettre
              </button>
            </div>
          )}
          {canEvaluate && exercise.status === 'submitted' && (
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex gap-4">
                <button
                  onClick={() => handleAIEvaluation(0, 2, "Entreprise et Organisation")}
                  disabled={aiEvaluationLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  {aiEvaluationLoading ? "Évaluation en cours..." : "Évaluer Entreprise et Organisation"}
                </button>
                <button
                  onClick={() => handleAIEvaluation(2, 4, "Moyens et Budget")}
                  disabled={aiEvaluationLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  {aiEvaluationLoading ? "Évaluation en cours..." : "Évaluer Moyens et Budget"}
                </button>
                <button
                  onClick={() => handleAIEvaluation(4, 6, "Usage et Situation")}
                  disabled={aiEvaluationLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  {aiEvaluationLoading ? "Évaluation en cours..." : "Évaluer Usage et Situation"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ExerciseTemplate>
  );
}
