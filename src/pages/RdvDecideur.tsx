import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rdvDecideurService, RdvDecideurExercise, RdvSection, DialogueEntry, Score } from '../features/rdv-decideur/services/rdvDecideurService';
import { DialogueSection } from '../features/rdv-decideur/components/DialogueSection';
import { ExerciseHeader } from '../features/rdv-decideur/components/ExerciseHeader';
import { ExerciseStatus } from '../types/exercises';

export default function RdvDecideur() {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentId = searchParams.get('userId');
  const [exercise, setExercise] = useState<RdvDecideurExercise | null>(null);
  const [localExercise, setLocalExercise] = useState<RdvDecideurExercise | null>(null);
  const [debouncedUpdate, setDebouncedUpdate] = useState<NodeJS.Timeout | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const targetUserId = isFormateur ? studentId : currentUser?.uid;
  const isViewMode = Boolean(studentId && currentUser?.uid !== studentId && !isFormateur);

  // Rediriger si pas d'ID cible
  useEffect(() => {
    if (!targetUserId) {
      console.error('No target user ID available');
      // TODO: Rediriger vers une page d'erreur ou la liste des exercices
    }
  }, [targetUserId]);

  // Debug logs
  useEffect(() => {
    console.log('Component State:', {
      currentUser: currentUser?.email,
      userProfile,
      isFormateur,
      role: userProfile?.role,
      studentIdFromURL: studentId,
      targetUserId,
      mode: isFormateur ? 'formateur' : isViewMode ? 'view' : 'student',
      exerciseStatus: exercise?.status,
      viewingOwnExercise: targetUserId === currentUser?.uid
    });
  }, [currentUser, userProfile, isFormateur, studentId, targetUserId, exercise]);

  useEffect(() => {
    if (!targetUserId) {
      console.log('No targetUserId available');
      return;
    }

    console.log('Loading exercise for:', {
      targetUserId,
      mode: isFormateur ? 'formateur' : isViewMode ? 'view' : 'student'
    });

    const loadExercise = async () => {
      try {
        const exercise = await rdvDecideurService.getExercise(targetUserId);
        console.log('Exercise loaded successfully:', {
          id: exercise.id,
          status: exercise.status,
          userId: exercise.userId,
          hasResponses: exercise.sections.some((section: RdvSection) => 
            section.dialogues.some((dialogue: DialogueEntry) => 
              dialogue.text && dialogue.text.trim() !== ''
            )
          ),
          sectionsCount: exercise.sections.length,
          responses: exercise.sections.map(s => ({
            sectionId: s.id,
            hasResponses: s.dialogues.some(d => d.text && d.text.trim() !== '')
          }))
        });
        setExercise(exercise);
      } catch (err) {
        console.error('Error loading exercise:', err);
      }
    };

    loadExercise();

    console.log('Setting up subscription for:', {
      targetUserId,
      mode: isFormateur ? 'formateur' : isViewMode ? 'view' : 'student'
    });

    const unsubscribe = rdvDecideurService.subscribeToExercise(targetUserId, (updatedExercise) => {
      console.log('Exercise update received:', {
        id: updatedExercise.id,
        status: updatedExercise.status,
        userId: updatedExercise.userId,
        hasResponses: updatedExercise.sections.some((section: RdvSection) => 
          section.dialogues.some((dialogue: DialogueEntry) => 
            dialogue.text && dialogue.text.trim() !== ''
          )
        )
      });
      setExercise(updatedExercise);
    });

    return () => {
      console.log('Cleaning up subscription');
      unsubscribe();
    };
  }, [targetUserId, isFormateur, isViewMode]);

  useEffect(() => {
    if (exercise) {
      setLocalExercise(exercise);
    }
  }, [exercise]);

  const handleDialogueChange = (sectionIndex: number, dialogueIndex: number, value: string) => {
    if (!exercise || !targetUserId || isViewMode) return;

    const updatedExercise = { ...exercise };
    updatedExercise.sections[sectionIndex].dialogues[dialogueIndex].text = value;
    
    // Mettre à jour le statut si c'est la première modification
    if (updatedExercise.status === ExerciseStatus.NotStarted) {
      updatedExercise.status = ExerciseStatus.InProgress;
    }
    
    setExercise(updatedExercise);

    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    const timeoutId = setTimeout(() => {
      rdvDecideurService.updateExercise(targetUserId, updatedExercise);
    }, 500);

    setDebouncedUpdate(timeoutId);
  };

  const handleScoreChange = (sectionIndex: number, dialogueIndex: number, score: Score) => {
    if (!localExercise || !targetUserId || !isFormateur) return;

    const updatedExercise = { ...localExercise };
    updatedExercise.sections[sectionIndex].dialogues[dialogueIndex].score = score;

    // Calculer le nouveau score total
    let totalScore = 0;
    const maxPossibleScore = 25.75; // 12 réponses commercial (24 points) + 7 réponses client (1.75 points)

    updatedExercise.sections.forEach(section => {
      section.dialogues.forEach(dialogue => {
        if (dialogue.score !== undefined) {
          totalScore += Number(dialogue.score);
        }
      });
    });

    // Convertir le score sur 40 points
    const finalScore = Math.round((totalScore / maxPossibleScore) * 40 * 100) / 100;
    updatedExercise.totalScore = finalScore;

    // Mettre à jour l'état local
    setLocalExercise(updatedExercise);

    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    const timeoutId = setTimeout(() => {
      rdvDecideurService.updateExercise(targetUserId, updatedExercise);
    }, 500);

    setDebouncedUpdate(timeoutId);
  };

  const handleTrainerCommentChange = (sectionIndex: number, dialogueIndex: number, comment: string) => {
    if (!localExercise || !targetUserId || !isFormateur) return;

    const updatedExercise = { ...localExercise };
    updatedExercise.sections[sectionIndex].dialogues[dialogueIndex].trainerComment = comment;
    setLocalExercise(updatedExercise);

    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    const timeoutId = setTimeout(() => {
      rdvDecideurService.updateExercise(targetUserId, updatedExercise);
    }, 500);

    setDebouncedUpdate(timeoutId);
  };

  const handleSubmit = async () => {
    if (!targetUserId || isViewMode) return;
    await rdvDecideurService.submitExercise(targetUserId);
  };

  const canEvaluate = isFormateur && exercise?.status !== ExerciseStatus.NotStarted && exercise?.status !== ExerciseStatus.Published;

  const handleAIEvaluation = async () => {
    const organizationId = userProfile?.organizationId || import.meta.env.VITE_FABRILE_ORG_ID;
    
    console.log('handleAIEvaluation called', {
      targetUserId,
      organizationId,
      isFormateur,
      exercise,
      userProfile
    });

    if (!exercise || !targetUserId || !organizationId || !canEvaluate) {
      console.error('Cannot evaluate exercise:', { 
        hasExercise: !!exercise, 
        targetUserId, 
        organizationId,
        canEvaluate,
        status: exercise?.status 
      });
      return;
    }
    
    setIsEvaluating(true);
    setEvaluationError(null);
    
    try {
      console.log('Calling evaluateWithAI service with:', {
        targetUserId,
        organizationId,
        dialoguesCount: exercise.sections.reduce((acc, section) => acc + section.dialogues.length, 0)
      });

      const updatedExercise = await rdvDecideurService.evaluateWithAI(
        targetUserId,
        organizationId
      );
      console.log('Evaluation completed:', updatedExercise);
      setExercise(updatedExercise);
    } catch (error) {
      console.error('Erreur lors de l\'évaluation IA:', error);
      setEvaluationError(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'évaluation IA');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handlePublishEvaluation = async () => {
    if (!exercise || !targetUserId || !isFormateur) return;

    const updatedExercise = {
      ...exercise,
      status: ExerciseStatus.Evaluated,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: currentUser?.uid
    };

    await rdvDecideurService.updateExercise(targetUserId, updatedExercise);
    setExercise(updatedExercise);
  };

  if (!exercise) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-2xl font-bold mb-2">RDV avec le Décideur</h1>
        <p className="text-gray-600 mb-8">Simulation d'un rendez-vous avec un décideur</p>
        <div className="p-4">Chargement de l'exercice...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ExerciseHeader
        score={exercise?.totalScore || 0}
        maxScore={40}
        status={exercise?.status || ExerciseStatus.NotStarted}
        isFormateur={isFormateur}
      />

      {isFormateur && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-blue-800">Zone Formateur</h3>
            <div className="flex gap-4">
              <button
                onClick={handleAIEvaluation}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                disabled={isEvaluating}
              >
                {isEvaluating ? 'Évaluation en cours...' : 'Correction avec l\'IA'}
              </button>
              <button
                onClick={handlePublishEvaluation}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Publier l'évaluation
              </button>
            </div>
          </div>
          {evaluationError && (
            <p className="mt-2 text-red-600">{evaluationError}</p>
          )}
        </div>
      )}

      {exercise && (
        <div className="space-y-8">
          {exercise.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
              <DialogueSection
                dialogues={section.dialogues}
                onDialogueChange={(dialogueIndex, value) =>
                  handleDialogueChange(sectionIndex, dialogueIndex, value)
                }
                onScoreChange={(dialogueIndex, score) =>
                  handleScoreChange(sectionIndex, dialogueIndex, score)
                }
                onTrainerCommentChange={(dialogueIndex, comment) =>
                  handleTrainerCommentChange(sectionIndex, dialogueIndex, comment)
                }
                isViewMode={!isFormateur && exercise.status === ExerciseStatus.Evaluated}
                isFormateur={isFormateur}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Bouton de soumission pour les apprenants */}
      {!isFormateur && exercise && exercise.status === ExerciseStatus.InProgress && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={isViewMode}
          >
            Soumettre l'exercice
          </button>
        </div>
      )}
    </div>
  );
}
