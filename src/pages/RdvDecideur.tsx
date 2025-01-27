import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rdvDecideurService, RdvDecideurExercise, DialogueEntry } from '../features/rdv-decideur/services/rdvDecideurService';
import { AIService } from '../services/AIService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { ExerciseTemplate } from '../components/ExerciseTemplate';

export default function RdvDecideur() {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentId = searchParams.get('userId');
  const [exercise, setExercise] = useState<RdvDecideurExercise | null>(null);
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
        const exercise = await rdvDecideurService.getExercise(targetUserId);
        setExercise(exercise);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'exercice:', err);
      }
    };

    loadExercise();

    const unsubscribe = rdvDecideurService.subscribeToExercise(targetUserId, (updatedExercise) => {
      setExercise(updatedExercise);
    });

    return () => unsubscribe();
  }, [targetUserId]);

  const handleDialogueChange = (sectionIndex: number, dialogueIndex: number, value: string) => {
    if (!exercise || !targetUserId || isViewMode) return;

    const updatedExercise = { ...exercise };
    updatedExercise.sections[sectionIndex].dialogues[dialogueIndex].text = value;
    updatedExercise.updatedAt = new Date().toISOString();

    setExercise(updatedExercise);

    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    const timeoutId = setTimeout(() => {
      rdvDecideurService.updateExercise(targetUserId, updatedExercise);
    }, 1000);

    setDebouncedUpdate(timeoutId);
  };

  const handleFeedbackChange = (sectionIndex: number, dialogueIndex: number, value: string) => {
    if (!exercise || !targetUserId || !isFormateur) return;

    const key = `${sectionIndex}-${dialogueIndex}`;
    setLocalFeedbacks(prev => ({ ...prev, [key]: value }));

    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    const timeoutId = setTimeout(() => {
      const updatedExercise = { ...exercise };
      updatedExercise.sections[sectionIndex].dialogues[dialogueIndex].feedback = value;
      updatedExercise.updatedAt = new Date().toISOString();

      rdvDecideurService.updateExercise(targetUserId, updatedExercise);
    }, 1000);

    setDebouncedUpdate(timeoutId);
  };

  const handleSubmit = async () => {
    if (!targetUserId || isViewMode) return;

    try {
      setLoading(true);
      await rdvDecideurService.submitExercise(targetUserId);
      
      if (exercise) {
        setExercise({
          ...exercise,
          status: 'submitted',
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
    if (!exercise || !targetUserId || !currentUser?.uid || !isFormateur) return;

    try {
      setLoading(true);
      
      const updatedExercise = { ...exercise };
      updatedExercise.totalScore = calculateTotalScore(updatedExercise.sections);
      
      await rdvDecideurService.evaluateExercise(targetUserId, updatedExercise.sections, currentUser.uid);
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
      
      const updatedExercise = { ...exercise };
      updatedExercise.totalScore = calculateTotalScore(updatedExercise.sections);
      
      await updateDoc(doc(db, `users/${targetUserId}/exercises/rdv_decideur`), {
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
      await rdvDecideurService.evaluateWithAI(targetUserId);
    } catch (error) {
      console.error('Erreur lors de l\'évaluation IA:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalScore = (sections: RdvDecideurExercise['sections']) => {
    return sections.reduce((total, section) => {
      const sectionScore = section.dialogues.reduce((sum, dialogue) => sum + (dialogue.score || 0), 0);
      return total + sectionScore;
    }, 0);
  };

  const handleAddDialogue = (sectionIndex: number, role: DialogueRole) => {
    if (!exercise || !targetUserId || isViewMode) return;

    const updatedExercise = { ...exercise };
    updatedExercise.sections[sectionIndex].dialogues.push({
      role,
      text: '',
      description: ''
    });

    setExercise(updatedExercise);
    rdvDecideurService.updateExercise(targetUserId, updatedExercise);
  };

  const handleRemoveLastDialogue = (sectionIndex: number) => {
    if (!exercise || !targetUserId || isViewMode) return;

    const updatedExercise = { ...exercise };
    if (updatedExercise.sections[sectionIndex].dialogues.length > 0) {
      updatedExercise.sections[sectionIndex].dialogues.pop();
      setExercise(updatedExercise);
      rdvDecideurService.updateExercise(targetUserId, updatedExercise);
    }
  };

  if (!exercise) {
    return (
      <ExerciseTemplate
        title="RDV avec le Décideur"
        description="Simulation d'un rendez-vous avec un décideur"
      >
        <div className="p-4">Chargement de l'exercice...</div>
      </ExerciseTemplate>
    );
  }

  return (
    <ExerciseTemplate
      title="RDV avec le Décideur"
      description="Simulation d'un rendez-vous avec un décideur"
    >
      <div className="w-full">
        <div className="w-full px-8 py-4">
          <div className="bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg p-6 mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">RDV avec le Décideur</h2>
              <p className="text-gray-600">
                Simulez un appel téléphonique pour obtenir un rendez-vous avec un décideur. Remplissez chaque section avec vos réponses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">Votre score</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {exercise?.totalScore !== undefined ? `${exercise.totalScore}/${exercise.maxScore}` : '-'}
                </p>
                <p className="text-xs text-purple-600 mt-1">(max {exercise?.maxScore || 40} points)</p>
              </div>
              
              <div className="bg-white bg-opacity-50 p-4 rounded-lg">
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

          {isFormateur && (
            <div className="bg-blue-50 p-4 mb-6 rounded-lg">
              <div className="flex items-center">
                <h2 className="text-blue-700 font-medium">Mode Formateur</h2>
                <div className="ml-2 text-sm text-blue-600">
                  {exercise.status === 'submitted' ? "L'exercice est en attente de correction" : ''}
                </div>
                <div className="flex-grow"></div>
                <button
                  onClick={handleAIEvaluation}
                  className="text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center gap-2"
                  disabled={exercise.status === 'evaluated'}
                >
                  <span>Correction IA</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {exercise.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-8">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                    <p className="text-gray-600 mt-1">{section.description}</p>
                  </div>

                  <div className="p-4">
                    {section.dialogues.map((dialogue, dialogueIndex) => (
                      <div key={`${sectionIndex}-${dialogueIndex}`} className="grid grid-cols-[300px,1fr,300px] bg-white">
                        <div className={`${dialogue.role === 'commercial' ? 'bg-blue-50' : 'bg-pink-50'} p-4`}>
                          <div className="text-sm">
                            <div className="font-medium mb-2">
                              {dialogue.role === 'commercial' ? 'Vous (commercial):' : 'Le client:'}
                            </div>
                            {dialogue.description && (
                              <div className="text-gray-600">{dialogue.description}</div>
                            )}
                          </div>
                        </div>

                        <div className="p-4">
                          <textarea
                            value={dialogue.text}
                            onChange={(e) => handleDialogueChange(sectionIndex, dialogueIndex, e.target.value)}
                            disabled={isViewMode || exercise.status === 'evaluated' || exercise.status === 'submitted' || isFormateur}
                            className="w-full p-2 border rounded-md resize-y min-h-[100px]"
                            style={{ height: 'auto', overflow: 'hidden' }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                            placeholder="Votre réponse..."
                          />
                          
                          {(isFormateur || exercise.status === 'evaluated') && dialogue.role === 'commercial' && (
                            <div className="mt-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm">Score:</span>
                                <select
                                  value={dialogue.score || 0}
                                  onChange={(e) => {
                                    const updatedExercise = { ...exercise };
                                    updatedExercise.sections[sectionIndex].dialogues[dialogueIndex].score = parseInt(e.target.value) as Score;
                                    setExercise(updatedExercise);
                                    rdvDecideurService.updateExercise(targetUserId, updatedExercise);
                                  }}
                                  className="w-20 p-1 border rounded"
                                  disabled={!isFormateur || exercise.status === 'evaluated'}
                                >
                                  <option value={0}>0</option>
                                  <option value={1}>1</option>
                                  <option value={2}>2</option>
                                </select>
                                <span className="text-sm text-gray-500">points</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-4 bg-gray-50">
                          {isFormateur ? (
                            <textarea
                              value={dialogue.trainerComment || ''}
                              onChange={(e) => {
                                const updatedExercise = { ...exercise };
                                updatedExercise.sections[sectionIndex].dialogues[dialogueIndex].trainerComment = e.target.value;
                                setExercise(updatedExercise);
                                rdvDecideurService.updateExercise(targetUserId, updatedExercise);
                              }}
                              disabled={!isFormateur || exercise.status === 'evaluated'}
                              placeholder="Pas encore de commentaire"
                              className="w-full p-2 border rounded-md bg-white resize-y min-h-[100px]"
                              style={{ height: 'auto', overflow: 'hidden' }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = target.scrollHeight + 'px';
                              }}
                              rows={4}
                            />
                          ) : exercise.status === 'evaluated' || exercise.status === 'submitted' ? (
                            <div className="text-sm whitespace-pre-wrap">
                              {dialogue.trainerComment || 'Pas encore de commentaire'}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">
                              Les commentaires du formateur seront disponibles après la correction
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {!isViewMode && !isFormateur && exercise.status !== 'evaluated' && exercise.status !== 'submitted' && (
                      <div className="flex justify-end space-x-3 mt-4">
                        <button
                          onClick={() => handleAddDialogue(sectionIndex, 'commercial')}
                          className="px-3 py-1 text-sm text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                        >
                          + Commercial
                        </button>
                        <button
                          onClick={() => handleAddDialogue(sectionIndex, 'client')}
                          className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                        >
                          + Client
                        </button>
                        <button
                          onClick={() => handleRemoveLastDialogue(sectionIndex)}
                          className="px-3 py-1 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                          disabled={exercise.sections[sectionIndex].dialogues.length === 0}
                        >
                          Supprimer dernier message
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isFormateur && (
            <>
              <div className="mt-8 bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Commentaire final du formateur:</h3>
                <textarea
                  value={exercise.trainerFinalComment || ''}
                  onChange={(e) => {
                    const updatedExercise = { ...exercise };
                    updatedExercise.trainerFinalComment = e.target.value;
                    setExercise(updatedExercise);
                    rdvDecideurService.updateExercise(targetUserId, updatedExercise);
                  }}
                  placeholder="Pas encore de commentaire"
                  className="w-full p-4 border rounded-md resize-y min-h-[100px]"
                  rows={4}
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handlePublishEvaluation}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center gap-2"
                  disabled={exercise.status === 'evaluated'}
                >
                  <span>Publier la correction</span>
                </button>
              </div>
            </>
          )}
          {!isFormateur && (
            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="mr-3">
                  {exercise.status === 'not_started' && (
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                  {exercise.status === 'in_progress' && (
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  )}
                  {exercise.status === 'submitted' && (
                    <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {exercise.status === 'evaluated' && (
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {exercise.status === 'not_started' && "À débuter"}
                    {exercise.status === 'in_progress' && "En cours"}
                    {exercise.status === 'submitted' && "En attente de correction"}
                    {exercise.status === 'evaluated' && "Corrigé"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {exercise.status === 'not_started' && "Commencez à remplir les réponses pour démarrer l'exercice"}
                    {exercise.status === 'in_progress' && "Continuez à remplir vos réponses"}
                    {exercise.status === 'submitted' && "Votre formateur va bientôt corriger votre exercice"}
                    {exercise.status === 'evaluated' && "Consultez vos résultats et les commentaires du formateur"}
                  </p>
                </div>
              </div>
            </div>
          )}
          {exercise.status === 'evaluated' && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Score final</h3>
              <p className="text-2xl font-bold text-green-600">{exercise.totalScore} / {exercise.maxScore}</p>
            </div>
          )}
        </div>
      </div>
      {!isFormateur && (
        <div className="flex justify-end gap-4 mt-8">
          {exercise.status === 'in_progress' && !isViewMode && (
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
    </ExerciseTemplate>
  );
}
