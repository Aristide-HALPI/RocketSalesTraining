import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ExerciseTemplate } from '../components/ExerciseTemplate';
import { eombusPafiService, EombusPafiExercise, TimeContext } from '../features/eombus-pafi/services/eombusPafiService';
import { toast } from 'react-toastify';

export default function EombusPafi() {
  console.log('==========================================');
  console.log('CHARGEMENT DU COMPOSANT EOMBUS-PAF-I');
  console.log('==========================================');

  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentIdParam = searchParams.get('userId');
  const [exercise, setExercise] = useState<EombusPafiExercise | null>(null);
  const [loading, setLoading] = useState(false);

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const isStudent = !!studentIdParam;
  const canEdit = !isStudent && exercise?.status !== 'evaluated';
  const canEvaluate = isFormateur;
  const targetUserId = studentIdParam || currentUser?.uid || '';

  const debugState = {
    currentUser: currentUser?.uid,
    userProfile,
    studentId: studentIdParam,
    targetUserId,
    isFormateur,
    role: userProfile?.role,
    authLoading,
    userProfileFull: userProfile
  };

  console.log('EombusPafi - État initial:', JSON.stringify(debugState, null, 2));

  useEffect(() => {
    console.log('EombusPafi - useEffect:', JSON.stringify({
      authLoading,
      currentUserId: currentUser?.uid,
      targetUserId,
      canLoad: !authLoading && currentUser?.uid && targetUserId
    }, null, 2));

    if (authLoading || !currentUser?.uid || !targetUserId) {
      console.log('EombusPafi - Cannot load exercise yet');
      return;
    }

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

  const calculatePercentage = (points: number) => {
    return (points / 2) * 100;
  };

  const handleQuestionChange = (sectionIndex: number, questionIndex: number, value: string) => {
    if (!exercise || !canEdit) return;

    const updatedSections = [...exercise.sections];
    updatedSections[sectionIndex].questions[questionIndex].text = value;

    // Vérifier si c'est la première réponse
    const hasAnyAnswer = updatedSections.some(section =>
      section.questions.some(question => question.text.trim() !== '')
    );

    eombusPafiService.updateExercise(targetUserId, {
      sections: updatedSections,
      status: hasAnyAnswer ? 'in_progress' : 'not_started'
    });
  };

  const handleTrainerCommentChange = (sectionIndex: number, questionIndex: number, value: string) => {
    if (!exercise || !canEvaluate) return;

    const updatedSections = [...exercise.sections];
    updatedSections[sectionIndex].questions[questionIndex].trainerComment = value;

    eombusPafiService.updateExercise(targetUserId, {
      sections: updatedSections
    });
  };

  const handleSectionCommentChange = (sectionIndex: number, value: string) => {
    if (!exercise || !canEvaluate) return;

    const updatedSections = [...exercise.sections];
    updatedSections[sectionIndex].trainerGeneralComment = value;

    eombusPafiService.updateExercise(targetUserId, {
      sections: updatedSections
    });
  };

  const handleSubmit = async () => {
    if (!exercise || !targetUserId || isStudent) return;

    try {
      setLoading(true);
      await eombusPafiService.submitExercise(targetUserId);
      toast.success('Exercice soumis avec succès');
    } catch (error) {
      console.error('Error submitting exercise:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading || !exercise) {
    return <div>Chargement...</div>;
  }

  return (
    <ExerciseTemplate
      title="EOMBUS - Exercice"
      description="Apprenez à structurer votre approche commerciale avec la méthode EOMBUS"
      maxScore={100}
    >
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                <h2 className="text-sm font-medium text-gray-600">Votre score</h2>
                <div className="mt-1">
                  <span className="text-2xl font-bold text-purple-600">{exercise?.totalScore || 0}</span>
                  <span className="text-lg font-medium text-purple-600">/100</span>
                </div>
              </div>

              <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                <h2 className="text-sm font-medium text-gray-600">Statut de l'exercice</h2>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {exercise?.status === 'not_started' && 'À débuter'}
                  {exercise?.status === 'in_progress' && 'En cours'}
                  {exercise?.status === 'submitted' && 'Soumis'}
                  {exercise?.status === 'evaluated' && 'Évalué'}
                </p>
              </div>
            </div>
          </div>

          {/* Mode Formateur - visible uniquement quand on consulte l'exercice d'un étudiant */}
          {isFormateur && isStudent && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="text-blue-700 font-medium">Mode Formateur</div>
                <div className="flex gap-4">
                  <button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await eombusPafiService.evaluateWithAI(targetUserId);
                        toast.success('Évaluation IA terminée avec succès');
                      } catch (error) {
                        console.error('Error during AI evaluation:', error);
                        toast.error('Erreur lors de l\'évaluation IA');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || exercise?.status !== 'submitted'}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    Correction IA
                  </button>
                  {exercise?.status === 'submitted' && (
                    <button
                      onClick={async () => {
                        if (!currentUser?.uid || !exercise) return;
                        try {
                          setLoading(true);
                          await eombusPafiService.evaluateExercise(targetUserId, exercise.sections, currentUser.uid);
                          toast.success('Évaluation publiée avec succès');
                        } catch (error) {
                          console.error('Error publishing evaluation:', error);
                          toast.error('Erreur lors de la publication');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      Publier
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sections de l'exercice */}
          {exercise.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-8">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-semibold text-emerald-600 mb-2">{section.title}</h2>
                {section.description && (
                  <p className="text-gray-600 text-sm">{section.description}</p>
                )}
              </div>

              <div className="space-y-6">
                {section.questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="space-y-4">
                    <div className={`flex flex-col gap-3 p-4 rounded-lg border ${getQuestionColors(question)}`}>
                      {/* Type de question */}
                      <div className="text-sm font-medium text-gray-500">
                        {question.type === 'ouverte' && 'Question ouverte'}
                        {question.type === 'ouverte_importance' && 'Question ouverte d\'importance'}
                        {question.type === 'fermee' && 'Question fermée'}
                        {question.type === 'fermee_importance' && 'Question fermée d\'importance'}
                      </div>

                      {/* Menu déroulant */}
                      <div className="flex items-center gap-2">
                        <select
                          value={question.timeContext || 'présent'}
                          onChange={(e) => {
                            const updatedSections = [...exercise.sections];
                            updatedSections[sectionIndex].questions[questionIndex].timeContext = e.target.value as TimeContext;
                            eombusPafiService.updateExercise(targetUserId, {
                              sections: updatedSections,
                              status: 'in_progress'
                            });
                          }}
                          disabled={true}
                          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100"
                        >
                          <option value="présent">Présent</option>
                          <option value="passé">Passé</option>
                          <option value="futur">Futur</option>
                        </select>
                      </div>

                      {/* Zone de texte */}
                      <textarea
                        value={question.text}
                        onChange={(e) =>
                          handleQuestionChange(sectionIndex, questionIndex, e.target.value)
                        }
                        readOnly={isFormateur}
                        disabled={isFormateur}
                        placeholder="Votre réponse..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100"
                      />

                      {/* Zone formateur (note et commentaire) */}
                      {isFormateur && (
                        <div className="mt-2 space-y-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Note :</label>
                            <input
                              type="text"
                              pattern="[0-2](\.[0-9])?"
                              value={question.score?.points || 0}
                              onChange={(e) => {
                                const value = e.target.value;
                                const points = Math.min(Math.max(parseFloat(value) || 0, 0), 2);
                                const updatedSections = [...exercise.sections];
                                updatedSections[sectionIndex].questions[questionIndex].score = {
                                  points,
                                  maxPoints: 2,
                                  percentage: calculatePercentage(points)
                                };
                                eombusPafiService.updateExercise(targetUserId, {
                                  sections: updatedSections
                                });
                              }}
                              disabled={!canEvaluate}
                              className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100"
                            />
                            <span className="text-sm text-gray-500">/2</span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Commentaire formateur :</label>
                            <textarea
                              value={question.trainerComment || ''}
                              onChange={(e) => handleTrainerCommentChange(sectionIndex, questionIndex, e.target.value)}
                              placeholder="Votre commentaire..."
                              disabled={!canEvaluate}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 min-h-[80px] resize-y disabled:bg-gray-100"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Commentaire général sur la section */}
                    {isFormateur && (
                      <div className="mt-8 pt-4 border-t border-gray-200">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Commentaire général sur la section :</label>
                          <textarea
                            value={section.trainerGeneralComment || ''}
                            onChange={(e) => handleSectionCommentChange(sectionIndex, e.target.value)}
                            placeholder="Votre commentaire général..."
                            disabled={!canEvaluate}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 min-h-[80px] resize-y disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Bouton Soumettre en bas à droite */}
          {!isStudent && exercise?.status !== 'evaluated' && (
            <div className="flex justify-end mt-8">
              <button
                onClick={handleSubmit}
                disabled={loading || exercise?.status === 'not_started'}
                className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Soumettre
              </button>
            </div>
          )}
        </div>
      </div>
    </ExerciseTemplate>
  );
}

const getQuestionColors = (question: { type: string }) => {
  switch (question.type) {
    case 'ouverte_importance':
      return 'bg-amber-50 border-amber-200';
    case 'fermee':
      return 'bg-blue-50 border-blue-200';
    case 'fermee_importance':
      return 'bg-purple-50 border-purple-200';
    default:
      return 'bg-white border-gray-200';
  }
};
