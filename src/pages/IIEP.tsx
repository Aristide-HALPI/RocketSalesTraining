import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { iiepService, IIEPExercise } from '../features/iiep/services/iiepService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-toastify';
import { AIService } from '../features/iiep/services/AIService';
import { ExerciseTemplate } from '../components/ExerciseTemplate';
import { Button } from '../components/ui/button';

export default function IIEP() {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentId = searchParams.get('userId');
  const [exercise, setExercise] = useState<IIEPExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [localFeedbacks, setLocalFeedbacks] = useState<{[key: string]: string}>({});
  const [localScores, setLocalScores] = useState<{[key: string]: number}>({});
  const [debouncedUpdate, setDebouncedUpdate] = useState<NodeJS.Timeout | null>(null);

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const isViewMode = !!studentId;
  const targetUserId = studentId || currentUser?.uid;

  useEffect(() => {
    if (!targetUserId) return;

    const loadExercise = async () => {
      try {
        setLoading(true);
        let exercise = await iiepService.getExercise(targetUserId);
        
        // Si l'exercice n'existe pas et que c'est un apprenant qui accède à son propre exercice
        if (!exercise && !isFormateur && !isViewMode) {
          exercise = await iiepService.createExercise(targetUserId);
        }

        if (exercise) {
          setExercise(exercise);
          
          // Initialiser les feedbacks et scores locaux
          const feedbacks: {[key: string]: string} = {};
          const scores: {[key: string]: number} = {};
          exercise.sections.forEach(section => {
            section.dialogues.forEach((dialogue, dialogueIndex) => {
              const key = `${section.id}-${dialogueIndex}`;
              if (dialogue.feedback) feedbacks[key] = dialogue.feedback;
              if (dialogue.score !== undefined) scores[key] = dialogue.score;
            });
          });
          setLocalFeedbacks(feedbacks);
          setLocalScores(scores);
        }
      } catch (err) {
        console.error('Erreur lors du chargement de l\'exercice:', err);
      } finally {
        setLoading(false);
      }
    };

    loadExercise();
  }, [targetUserId]);

  const handleTextChange = (sectionId: string, dialogueIndex: number, value: string) => {
    if (!exercise || !targetUserId || isViewMode) return;

    const updatedExercise = { ...exercise };
    const sectionIndex = updatedExercise.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    updatedExercise.sections[sectionIndex].dialogues[dialogueIndex].text = value;
    setExercise(updatedExercise);

    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    const timeoutId = setTimeout(() => {
      iiepService.updateExercise(targetUserId, updatedExercise);
    }, 1000);

    setDebouncedUpdate(timeoutId);
  };

  const handleFeedbackChange = (sectionId: string, dialogueIndex: number, value: string) => {
    if (!exercise || !targetUserId || !isFormateur) return;

    const key = `${sectionId}-${dialogueIndex}`;
    setLocalFeedbacks(prev => ({ ...prev, [key]: value }));

    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    const timeoutId = setTimeout(() => {
      const updatedExercise = { ...exercise };
      const sectionIndex = updatedExercise.sections.findIndex(s => s.id === sectionId);
      if (sectionIndex === -1) return;

      updatedExercise.sections[sectionIndex].dialogues[dialogueIndex].feedback = value;
      iiepService.updateExercise(targetUserId, updatedExercise);
    }, 1000);

    setDebouncedUpdate(timeoutId);
  };

  const handleScoreChange = (sectionId: string, dialogueIndex: number, score: number) => {
    if (!exercise || !targetUserId || !isFormateur) return;

    const key = `${sectionId}-${dialogueIndex}`;
    setLocalScores(prev => ({ ...prev, [key]: score }));

    const updatedExercise = { ...exercise };
    const sectionIndex = updatedExercise.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    updatedExercise.sections[sectionIndex].dialogues[dialogueIndex].score = score;
    iiepService.updateExercise(targetUserId, updatedExercise);
  };

  const handleSubmit = async () => {
    if (!targetUserId || isViewMode) return;

    try {
      setLoading(true);
      await iiepService.submitExercise(targetUserId, exercise!);
      
      if (exercise) {
        setExercise({
          ...exercise,
          status: 'submitted',
          submittedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvaluation = async () => {
    if (!exercise || !targetUserId || !currentUser?.uid || !isFormateur) return;

    try {
      setLoading(true);
      await iiepService.updateExercise(targetUserId, exercise);
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
      await updateDoc(doc(db, `users/${targetUserId}/exercises/iiep`), {
        status: 'evaluated',
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: currentUser.uid
      });
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
      // TODO: Implémenter l'évaluation IA
    } catch (error) {
      console.error('Erreur lors de l\'évaluation IA:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!exercise) {
    return (
      <ExerciseTemplate
        title="IIEP - Exercice"
        description="Identifiez les indices de l'exercice du pouvoir"
        maxScore={100}
      >
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </ExerciseTemplate>
    );
  }

  return (
    <ExerciseTemplate
      title="IIEP - Exercice"
      description="Identifiez les indices de l'exercice du pouvoir"
      maxScore={100}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white bg-opacity-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-800">Votre score</h3>
              <p className="text-2xl font-bold text-purple-900">
                {exercise.totalScore !== undefined ? `${exercise.totalScore}/30` : '-'}
              </p>
              <p className="text-xs text-purple-600 mt-1">(max 30 points)</p>
            </div>
            
            <div className="bg-white bg-opacity-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-teal-800">Statut de l'exercice</h3>
              <p className="text-2xl font-bold text-teal-900">
                {exercise.status === 'not_started' && 'À débuter'}
                {exercise.status === 'in_progress' && 'En cours'}
                {exercise.status === 'submitted' && 'En attente de correction'}
                {exercise.status === 'evaluated' && 'Corrigé'}
              </p>
            </div>
          </div>
        </div>

        {isFormateur && (
          <div className="bg-blue-50 p-4 rounded-lg mb-8 flex justify-between items-center">
            <span className="text-blue-600 font-medium">Mode Formateur</span>
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
              onClick={async () => {
                if (!targetUserId) return;
                try {
                  setLoading(true);
                  await iiepService.evaluateWithAI(targetUserId);
                  toast.success("L'exercice a été évalué par l'IA");
                } catch (error) {
                  console.error("Erreur lors de l'évaluation IA:", error);
                  toast.error("Erreur lors de l'évaluation par l'IA");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !exercise || exercise.status !== 'submitted'}
            >
              {loading ? 'Évaluation en cours...' : 'Correction IA'}
            </button>
          </div>
        )}
        <div className="space-y-8">
          {exercise.sections.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold text-gray-900">
                  {section.title}
                </h2>
              </div>

              <div className="p-6">
                {section.dialogues.reduce((acc: JSX.Element[], dialogue, dialogueIndex, dialogues) => {
                  // Si c'est le premier dialogue de cette catégorie, afficher le titre
                  if (dialogueIndex === 0 || dialogues[dialogueIndex - 1].category !== dialogue.category) {
                    acc.push(
                      <h3 key={`title-${dialogueIndex}`} className="text-lg font-semibold text-gray-800 mb-6 mt-8">
                        {dialogue.category === 'interroger' && "(s')Interroger"}
                        {dialogue.category === 'investiguer' && "Investiguer"}
                        {dialogue.category === 'empathie' && "Empathie"}
                        {dialogue.category === 'proposer' && "Proposer"}
                      </h3>
                    );
                  }

                  acc.push(
                    <div key={dialogueIndex} className="mb-6 last:mb-0">
                      <div className="grid grid-cols-[2fr,1fr] gap-6">
                        <div>
                          <div className="bg-white rounded-lg shadow-sm">
                            <div className="p-4">
                              <label className="block text-sm font-medium text-gray-600 mb-2">
                                {dialogue.type === 'commercial' ? 'Vous (commercial):' : 'Le client:'}
                              </label>
                              <textarea
                                className={`w-full p-3 rounded-md border-0 focus:ring-2 focus:ring-teal-500 ${
                                  dialogue.type === 'commercial' ? 'bg-blue-50' : 'bg-red-50'
                                }`}
                                rows={4}
                                value={dialogue.text}
                                onChange={(e) => handleTextChange(section.id, dialogueIndex, e.target.value)}
                                disabled={!isFormateur ? (exercise.status === 'submitted' || exercise.status === 'evaluated' || isViewMode) : true}
                                placeholder="Votre réponse..."
                              />
                            </div>
                            
                            {isFormateur && dialogue.type === 'commercial' && (
                              <div className="px-4 py-3 bg-gray-50 border-t">
                                <label className="block text-sm font-medium text-gray-600 mb-1">Score:</label>
                                <div className="flex items-center space-x-2">
                                  <select
                                    className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                                    value={localScores[`${section.id}-${dialogueIndex}`] || 0}
                                    onChange={(e) => handleScoreChange(section.id, dialogueIndex, parseInt(e.target.value))}
                                  >
                                    {[0, 1, 2].map((score) => (
                                      <option key={score} value={score}>{score}</option>
                                    ))}
                                  </select>
                                  <span className="text-sm text-gray-500">points</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="bg-white rounded-lg shadow-sm">
                            <div className="p-4">
                              <label className="block text-sm font-medium text-gray-600 mb-2">
                                Commentaire du formateur
                              </label>
                              {isFormateur ? (
                                <textarea
                                  className="w-full p-3 rounded-md border-gray-300 focus:ring-2 focus:ring-teal-500 bg-gray-50"
                                  rows={4}
                                  value={localFeedbacks[`${section.id}-${dialogueIndex}`] || ''}
                                  onChange={(e) => handleFeedbackChange(section.id, dialogueIndex, e.target.value)}
                                  placeholder="Ajoutez votre commentaire ici..."
                                />
                              ) : (
                                <div className="w-full p-3 rounded-md bg-gray-50 border border-gray-200 min-h-[96px]">
                                  {localFeedbacks[`${section.id}-${dialogueIndex}`] || 'Pas encore de commentaire'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                  return acc;
                }, [])}
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-4 mt-8">
            {!isFormateur ? (
              <button
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                onClick={handleSubmit}
                disabled={loading || exercise?.status === 'submitted' || exercise?.status === 'evaluated'}
              >
                {loading ? 'Envoi en cours...' : 'Soumettre'}
              </button>
            ) : (
              <button
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                onClick={async () => {
                  if (!targetUserId || !exercise) return;
                  try {
                    setLoading(true);
                    await iiepService.evaluateExercise(targetUserId, exercise, currentUser?.uid);
                    toast.success("Les résultats ont été publiés à l'apprenant");
                  } catch (error) {
                    console.error("Erreur lors de la publication:", error);
                    toast.error("Erreur lors de la publication des résultats");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !exercise || exercise.status !== 'submitted'}
              >
                {loading ? 'Publication en cours...' : 'Publier les résultats'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ExerciseTemplate>
  );
}
