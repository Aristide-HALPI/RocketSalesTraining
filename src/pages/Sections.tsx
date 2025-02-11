import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sectionsService, type SectionsExercise, type Section } from '../features/sections/services/sectionsService';
import { ExerciseStatus } from '../types/exercises';
import { toast } from 'react-toastify';

export default function Sections() {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentId = searchParams.get('userId');
  const [exercise, setExercise] = useState<SectionsExercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const isViewMode = !!studentId;
  const targetUserId = studentId || currentUser?.uid;
  const defaultOrgId = import.meta.env.VITE_FABRILE_ORG_ID;

  const canEvaluate = isFormateur && exercise?.status !== ExerciseStatus.NotStarted && exercise?.status !== ExerciseStatus.Published;

  useEffect(() => {
    if (!targetUserId) return;

    const loadExercise = async () => {
      try {
        const exercise = await sectionsService.getExercise(targetUserId);
        if (exercise) {
          setExercise(exercise);
        }
      } catch (err) {
        console.error('Erreur lors du chargement de l\'exercice:', err);
        toast.error('Erreur lors du chargement de l\'exercice');
      } finally {
        setIsLoading(false);
      }
    };

    loadExercise();
  }, [targetUserId]);

  const handleScoreChange = (sectionIndex: number, answerIndex: number, newScore: number) => {
    if (!exercise || !targetUserId) return;
    
    // Ne pas permettre la modification si l'exercice est publié
    if (exercise.status === ExerciseStatus.Published) {
      toast.warning("L'exercice a déjà été publié et ne peut plus être modifié");
      return;
    }

    const score = Math.min(4, Math.max(0, newScore));
    const updatedExercise = { ...exercise };
    updatedExercise.sections[sectionIndex].answers[answerIndex].score = score;

    // Calculer le nouveau score total
    const rawScore = updatedExercise.sections.reduce((total, section) => {
      return total + section.answers.reduce((sectionTotal, answer) => {
        return sectionTotal + (answer.score || 0);
      }, 0);
    }, 0);

    // Convertir le score sur 30 avec une règle de trois (48 est le score maximum possible)
    const totalScore = Math.round((rawScore * 30) / 48);
    updatedExercise.totalScore = totalScore;

    // Mettre à jour l'état local
    setExercise(updatedExercise);

    // Mettre à jour dans Firestore
    sectionsService.updateExercise(targetUserId, {
      sections: updatedExercise.sections,
      totalScore: totalScore
    });
  };

  const handleFeedbackChange = (sectionIndex: number, answerIndex: number, newFeedback: string) => {
    if (!exercise || !targetUserId) return;

    // Ne pas permettre la modification si l'exercice est publié
    if (exercise.status === ExerciseStatus.Published) {
      toast.warning("L'exercice a déjà été publié et ne peut plus être modifié");
      return;
    }

    const updatedExercise = { ...exercise };
    updatedExercise.sections[sectionIndex].answers[answerIndex].feedback = newFeedback;

    setExercise(updatedExercise);
    sectionsService.updateExercise(targetUserId, {
      sections: updatedExercise.sections
    });
  };

  const handleAnswerChange = (sectionIndex: number, answerIndex: number, newText: string) => {
    if (!exercise || !targetUserId || exercise.status !== ExerciseStatus.InProgress) return;

    const updatedExercise = { ...exercise };
    updatedExercise.sections[sectionIndex].answers[answerIndex].text = newText;

    setExercise(updatedExercise);
    sectionsService.updateExercise(targetUserId, {
      sections: updatedExercise.sections
    });
  };

  const handleSubmit = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setIsLoading(true);
      await sectionsService.submitExercise(currentUser.uid);
      toast.success('Exercice soumis avec succès');
      
      const updatedExercise = await sectionsService.getExercise(currentUser.uid);
      if (updatedExercise) {
        setExercise(updatedExercise);
      }
    } catch (error) {
      console.error('Error submitting exercise:', error);
      toast.error("Erreur lors de la soumission de l'exercice");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishEvaluation = async () => {
    if (!exercise || !targetUserId) return;

    try {
      await sectionsService.updateExercise(targetUserId, {
        status: ExerciseStatus.Published
      });
      toast.success("L'évaluation a été publiée avec succès");
    } catch (error) {
      console.error('Erreur lors de la publication:', error);
      toast.error("Erreur lors de la publication de l'évaluation");
    }
  };

  const handleAIEvaluation = async () => {
    if (!targetUserId || !defaultOrgId || !canEvaluate) {
      console.error('Cannot evaluate exercise:', {
        targetUserId,
        defaultOrgId,
        canEvaluate,
        status: exercise?.status
      });
      return;
    }

    try {
      setIsLoading(true);
      await sectionsService.evaluateWithAI(targetUserId, defaultOrgId);
      
      const updatedExercise = await sectionsService.getExercise(targetUserId);
      if (updatedExercise) {
        setExercise(updatedExercise);
        toast.success("L'exercice a été évalué par l'IA");
      }
    } catch (error) {
      console.error('Erreur lors de l\'évaluation IA:', error);
      toast.error("Erreur lors de l'évaluation par l'IA");
    } finally {
      setIsLoading(false);
    }
  };

  const autoResizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(() => {
    // Redimensionner toutes les zones de texte au chargement
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      autoResizeTextarea(textarea as HTMLTextAreaElement);
    });
  }, [exercise]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Exercice - Sections de vente</h2>
            {exercise && (
              <div className="mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  exercise.status === ExerciseStatus.InProgress ? 'bg-blue-100 text-blue-800' :
                  exercise.status === ExerciseStatus.Submitted ? 'bg-yellow-100 text-yellow-800' :
                  exercise.status === ExerciseStatus.Evaluated ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {exercise.status === ExerciseStatus.InProgress ? 'En cours' :
                   exercise.status === ExerciseStatus.Submitted ? 'À évaluer' :
                   exercise.status === ExerciseStatus.Evaluated ? 'Évalué' :
                   'Statut inconnu'}
                </span>
              </div>
            )}
          </div>
          {isFormateur && exercise && exercise.status === ExerciseStatus.Submitted && (
            <div className="flex gap-4">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAIEvaluation}
                disabled={isLoading}
              >
                {isLoading ? 'Correction en cours...' : 'Correction IA'}
              </button>
              <button
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePublishEvaluation}
                disabled={isLoading}
              >
                {isLoading ? 'Publication...' : "Publier l'évaluation"}
              </button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <Link to="/" className="text-teal-600 hover:text-teal-700">
            ← Retour au tableau de bord
          </Link>
        </div>

        <div className="bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg p-6 mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Les 3 sections</h2>
            <p className="text-sm text-gray-600">
              Veuillez remplir les 3 sections : 5 réponses pour les Motivateurs Personnels, 5 réponses pour les Caractéristiques Uniques de Vente et 2 Concepts Uniques de Vente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white bg-opacity-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-800">Votre score</h3>
              <p className="text-2xl font-bold text-purple-900">
                {exercise?.totalScore !== undefined ? `${exercise.totalScore}/${exercise.maxScore}` : '-'}
              </p>
              <p className="text-xs text-purple-600 mt-1">(max {exercise?.maxScore || 48} points)</p>
            </div>
            
            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Statut de l'exercice
              </h3>
              <p className="text-2xl font-bold text-teal-900">
                {exercise?.status === ExerciseStatus.InProgress && 'En cours'}
                {exercise?.status === ExerciseStatus.Submitted && 'À évaluer'}
                {exercise?.status === ExerciseStatus.Evaluated && 'Évalué'}
                {exercise?.status === ExerciseStatus.Published && 'Publié'}
              </p>
            </div>
          </div>
        </div>

        {exercise && (
          <>
            <div className="space-y-8">
              {isFormateur && exercise.status !== ExerciseStatus.Published && (
                <div className="flex justify-end mb-4">
                  <button
                    className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleAIEvaluation}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Correction en cours...' : 'Correction IA'}
                  </button>
                </div>
              )}

              {exercise.sections.map((section: Section, sectionIndex: number) => (
                <div key={section.id} className={`rounded-lg shadow ${
                  section.id === 'motivateurs' ? 'bg-purple-50 border-purple-200' :
                  section.id === 'caracteristiques' ? 'bg-green-50 border-green-200' :
                  'bg-blue-50 border-blue-200'
                } border-2`}>
                  <div className={`p-6 rounded-t-lg ${
                    section.id === 'motivateurs' ? 'bg-purple-600' :
                    section.id === 'caracteristiques' ? 'bg-green-600' :
                    'bg-blue-600'
                  } text-white`}>
                    <h3 className="text-xl font-semibold mb-2">{section.title}</h3>
                    <p className="text-white/90">{section.description}</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {section.answers.map((answer, answerIndex: number) => (
                      <div key={answerIndex} className="space-y-2">
                        <div className="flex gap-4">
                          <div className="w-8 flex-shrink-0 text-gray-500">{answerIndex + 1}.</div>
                          <div className="w-full md:w-[62%] flex-shrink-0">
                            <textarea
                              className={`w-full p-3 border rounded-lg resize-none overflow-hidden min-h-[80px] ${
                                isFormateur || exercise.status !== ExerciseStatus.InProgress ? 'bg-gray-50' : 'bg-white'
                              }`}
                              placeholder={isFormateur ? "Réponse de l'apprenant" : "Écrivez votre réponse ici..."}
                              value={answer.text}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                autoResizeTextarea(e.target);
                                handleAnswerChange(sectionIndex, answerIndex, e.target.value);
                              }}
                              onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                                autoResizeTextarea(e.currentTarget);
                              }}
                              disabled={isFormateur || exercise.status !== ExerciseStatus.InProgress || isViewMode}
                            />
                          </div>
                          <div className="w-full md:w-[32%] flex-shrink-0">
                            {isFormateur ? (
                              <div className="space-y-2">
                                <textarea
                                  className="w-full p-3 border-2 border-teal-200 rounded-lg resize-none overflow-hidden min-h-[80px] bg-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                                  placeholder="Ajoutez vos commentaires ici..."
                                  value={answer.feedback || ''}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                    autoResizeTextarea(e.target);
                                    handleFeedbackChange(sectionIndex, answerIndex, e.target.value);
                                  }}
                                  onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                                    autoResizeTextarea(e.currentTarget);
                                  }}
                                  disabled={!isFormateur || exercise.status === ExerciseStatus.Published}
                                />
                                <div className="flex items-center gap-2">
                                  <label className="text-sm text-gray-600">Note (0-4) :</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="4"
                                    step="1"
                                    className="w-20 p-2 border rounded-lg"
                                    value={answer.score || 0}
                                    onChange={(e) => handleScoreChange(sectionIndex, answerIndex, parseInt(e.target.value, 10))}
                                    disabled={!isFormateur || exercise.status === ExerciseStatus.Published}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="w-full p-3 border border-gray-200 rounded-lg text-sm text-gray-500 min-h-[80px] whitespace-pre-wrap">
                                {answer.feedback || 'Les commentaires et la note apparaîtront ici après la soumission'}
                                {answer.score !== undefined && (
                                  <div className="mt-2 font-semibold">
                                    Note : {answer.score}/4
                                  </div>
                                )}
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

            <div className="flex justify-end gap-4 mt-8">
              {!isFormateur ? (
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSubmit}
                  disabled={isLoading || exercise.status !== ExerciseStatus.InProgress}
                >
                  {exercise.status === ExerciseStatus.Submitted ? 'À évaluer' : isLoading ? 'Soumission...' : 'Soumettre'}
                </button>
              ) : (
                <>
                  {exercise.status !== ExerciseStatus.Published && (
                    <button
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handlePublishEvaluation}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Publication...' : "Publier l'évaluation"}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
