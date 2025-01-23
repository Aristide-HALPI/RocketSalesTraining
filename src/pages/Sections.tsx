import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sectionsService, SectionsExercise } from '../features/sections/services/sectionsService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AIService } from '../features/sections/services/AIService';

export default function Sections() {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentId = searchParams.get('userId');
  const [exercise, setExercise] = useState<SectionsExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [localFeedbacks, setLocalFeedbacks] = useState<{[key: string]: string}>({});
  const [debouncedUpdate, setDebouncedUpdate] = useState<NodeJS.Timeout | null>(null);

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const isViewMode = !!studentId;
  const targetUserId = studentId || currentUser?.uid;

  useEffect(() => {
    if (!targetUserId) return;

    const loadExercise = async () => {
      try {
        const exercise = await sectionsService.getExercise(targetUserId);
        setExercise(exercise);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'exercice:', err);
      }
    };

    loadExercise();

    const unsubscribe = sectionsService.subscribeToExercise(targetUserId, (updatedExercise) => {
      setExercise(updatedExercise);
    });

    return () => unsubscribe();
  }, [targetUserId]);

  const handleAnswerChange = (sectionIndex: number, answerIndex: number, value: string) => {
    if (!exercise || !targetUserId || isViewMode) return;

    const updatedExercise = { ...exercise };
    updatedExercise.sections[sectionIndex].answers[answerIndex].text = value;
    updatedExercise.updatedAt = new Date().toISOString();

    setExercise(updatedExercise);

    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    const timeoutId = setTimeout(() => {
      sectionsService.updateExercise(targetUserId, updatedExercise);
    }, 1000);

    setDebouncedUpdate(timeoutId);
  };

  const handleFeedbackChange = (sectionIndex: number, answerIndex: number, value: string) => {
    if (!exercise || !targetUserId || isViewMode) return;

    const key = `${sectionIndex}-${answerIndex}`;
    setLocalFeedbacks(prev => ({ ...prev, [key]: value }));

    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    const timeoutId = setTimeout(() => {
      const updatedExercise = { ...exercise };
      updatedExercise.sections[sectionIndex].answers[answerIndex].feedback = value;
      updatedExercise.updatedAt = new Date().toISOString();

      sectionsService.updateExercise(targetUserId, updatedExercise);
    }, 1000);

    setDebouncedUpdate(timeoutId);
  };

  const handleSubmit = async () => {
    if (!targetUserId || isViewMode) return;

    try {
      setLoading(true);
      await sectionsService.submitExercise(targetUserId);
      
      // Mettre à jour l'état local
      if (exercise) {
        setExercise({
          ...exercise,
          status: 'pending_validation',
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvaluation = async () => {
    if (!exercise || !targetUserId || !currentUser?.uid || isViewMode) return;

    try {
      setLoading(true);
      
      // Calculer la note finale sur 30 avec la règle de trois
      const updatedExercise = { ...exercise };
      updatedExercise.totalScore = calculateTotalScore(updatedExercise.sections);
      
      await sectionsService.evaluateExercise(targetUserId, updatedExercise.sections, currentUser.uid);
      setExercise(updatedExercise);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishEvaluation = async () => {
    if (!exercise || !targetUserId || !currentUser?.uid || !isFormateur) return;

    try {
      setLoading(true);
      
      // S'assurer que la note finale est à jour
      const updatedExercise = { ...exercise };
      updatedExercise.totalScore = calculateTotalScore(updatedExercise.sections);
      
      await updateDoc(doc(db, `users/${targetUserId}/exercises/sections`), {
        status: 'evaluated',
        totalScore: updatedExercise.totalScore,
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: currentUser.uid
      });
      
      setExercise(updatedExercise);
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
      
      // Préparer les réponses pour l'évaluation IA
      const answers = exercise.sections.flatMap(section => 
        section.answers.map(answer => ({
          question: section.title,
          answer: answer.text,
          sectionType: section.type
        }))
      );

      // Obtenir l'évaluation de l'IA
      const aiEvaluation = await AIService.evaluateAnswers(answers);
      
      // Mettre à jour les notes et feedbacks basés sur l'évaluation IA
      const updatedExercise = { ...exercise };
      let currentAnswerIndex = 0;

      updatedExercise.sections.forEach(section => {
        section.answers.forEach(answer => {
          const criterion = aiEvaluation.criteria[currentAnswerIndex];
          if (criterion) {
            answer.score = criterion.score;
            answer.feedback = criterion.feedback;
          }
          currentAnswerIndex++;
        });
      });

      updatedExercise.totalScore = aiEvaluation.score;

      // Sauvegarder l'évaluation
      await sectionsService.updateExercise(targetUserId, updatedExercise);
      await AIService.updateAIEvaluation(targetUserId, aiEvaluation);
      
      setExercise(updatedExercise);
    } catch (error) {
      console.error('Erreur lors de l\'évaluation IA:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalScore = (sections: SectionsExercise['sections']) => {
    return sections.reduce((total, section) => {
      return total + section.answers.reduce((sectionTotal, answer) => {
        return sectionTotal + (answer.score || 0);
      }, 0);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
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
                {exercise?.totalScore !== undefined ? `${exercise.totalScore}/30` : '-'}
              </p>
              <p className="text-xs text-purple-600 mt-1">(max 30 points)</p>
            </div>
            
            <div className="bg-white bg-opacity-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-teal-800">Statut de l'exercice</h3>
              <p className="text-2xl font-bold text-teal-900">
                {exercise?.status === 'not_started' && 'Non commencé'}
                {exercise?.status === 'in_progress' && 'En cours'}
                {exercise?.status === 'pending_validation' && 'En attente de validation'}
                {exercise?.status === 'evaluated' && 'Évalué'}
              </p>
            </div>
          </div>
        </div>

        {isFormateur && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-blue-900">Mode Formateur</h2>
                <p className="text-sm text-blue-600">
                  {exercise?.status === 'pending_validation' && "L'exercice est en attente de correction"}
                  {exercise?.status === 'evaluated' && "L'exercice a été évalué"}
                </p>
              </div>
              
              <div className="flex gap-4">
                {exercise?.status === 'pending_validation' && (
                  <button
                    onClick={handleAIEvaluation}
                    disabled={loading}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z" fill="currentColor"/>
                    </svg>
                    Correction IA
                  </button>
                )}

                {exercise?.status === 'pending_validation' && exercise?.totalScore !== undefined && (
                  <button
                    onClick={handlePublishEvaluation}
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 4V6H19V4H5ZM5 14H9V20H15V14H19L12 7L5 14ZM13 12V18H11V12H9.83L12 9.83L14.17 12H13Z" fill="currentColor"/>
                    </svg>
                    Publier l'évaluation
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {exercise && (
          <div>
            {exercise.sections.map((section, sectionIndex) => (
              <div key={section.id} className="mb-8">
                <div className={`p-6 rounded-lg mb-4 ${
                  section.id === 'motivateurs' ? 'bg-purple-600' :
                  section.id === 'caracteristiques' ? 'bg-green-600' :
                  'bg-blue-600'
                } text-white`}>
                  <h3 className="text-lg font-bold mb-2">{section.title}</h3>
                  {section.description && (
                    <p className="text-white/90">{section.description}</p>
                  )}
                </div>

                <div className="space-y-4">
                  {section.answers.map((answer, answerIndex) => (
                    <div key={answerIndex} className="flex gap-4">
                      <div className="w-8 flex-shrink-0 text-gray-500">{answerIndex + 1}.</div>
                      <div className="w-full md:w-[62%] flex-shrink-0">
                        <textarea
                          className={`w-full p-3 border rounded-lg resize-y min-h-[80px] ${
                            isFormateur ? 'bg-gray-50' : 'bg-white'
                          }`}
                          placeholder={isFormateur ? "Réponse de l'apprenant" : "Écrivez votre réponse ici..."}
                          value={answer.text}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                            handleAnswerChange(sectionIndex, answerIndex, e.target.value);
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          disabled={isFormateur || exercise.status === 'submitted' || exercise.status === 'evaluated' || isViewMode}
                          style={{ height: 'auto', minHeight: '80px' }}
                        />
                      </div>
                      <div className="w-full md:w-[32%] flex-shrink-0">
                        {isFormateur ? (
                          <div className="space-y-2">
                            <textarea
                              className="w-full p-3 border-2 border-teal-200 rounded-lg resize-y min-h-[80px] bg-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                              placeholder="Ajoutez vos commentaires ici..."
                              value={localFeedbacks[`${sectionIndex}-${answerIndex}`] || answer.feedback || ''}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                                handleFeedbackChange(sectionIndex, answerIndex, e.target.value);
                              }}
                              onFocus={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                              }}
                              style={{ height: 'auto', minHeight: '80px' }}
                            />
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-600">Note :</label>
                              <select
                                className="p-1 border rounded"
                                value={answer.score || 0}
                                onChange={(e) => {
                                  const updatedExercise = { ...exercise };
                                  updatedExercise.sections[sectionIndex].answers[answerIndex].score = parseInt(e.target.value);
                                  
                                  updatedExercise.totalScore = calculateTotalScore(updatedExercise.sections);
                                  
                                  setExercise(updatedExercise);
                                  if (targetUserId) {
                                    sectionsService.updateExercise(targetUserId, updatedExercise);
                                  }
                                }}
                              >
                                <option value="0">0 - Incorrect</option>
                                <option value="1">1 - Correct</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full p-3 border border-gray-200 rounded-lg text-sm text-gray-500 min-h-[80px] whitespace-pre-wrap">
                            {answer.feedback || 'Les commentaires et la note apparaîtront ici après la soumission'}
                            {answer.score !== undefined && (
                              <div className="mt-2 font-semibold">
                                Note : {answer.score}/1
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-4 mt-8">
              {!isFormateur && exercise.status === 'in_progress' && !isViewMode && (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {loading ? 'Soumission...' : 'Soumettre'}
                </button>
              )}
              
              {isFormateur && exercise.status !== 'evaluated' && (
                <button
                  onClick={handleSaveEvaluation}
                  disabled={loading}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
