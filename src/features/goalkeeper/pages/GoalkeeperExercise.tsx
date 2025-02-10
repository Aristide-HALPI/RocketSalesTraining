import { doc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { createThread, createThreadMessage } from "../../../api/ai/routes/thread";
import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../lib/firebase";
import { DialogueSection } from "../components/DialogueSection";
import { EvaluationGrid } from "../components/EvaluationGrid";
import { ScoreDisplay } from "../components/ScoreDisplay";
import { goalkeeperService } from "../services/goalkeeperService";
import type { GoalkeeperExercise } from "../types";
import {
  EvaluationCriterion,
  GOALKEEPER_EVALUATION_CRITERIA,
  SubCriterion,
} from "../types";

interface LocalEvaluation {
  criteria: EvaluationCriterion[];
  totalScore: number;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

interface StorageData {
  feedbacks: {[key: string]: string};
  evaluation: LocalEvaluation;
}

// Évaluation par défaut
const defaultEvaluation: LocalEvaluation = {
  criteria: GOALKEEPER_EVALUATION_CRITERIA.map((criterion: EvaluationCriterion) => ({
    ...criterion,
    subCriteria: criterion.subCriteria.map((sub: SubCriterion) => ({
      ...sub,
      score: 0,
      feedback: ''
    }))
  })),
  totalScore: 0
};

const GoalkeeperExercise: React.FC = () => {
  const { userProfile } = useAuth();
  const { studentId: pathStudentId } = useParams();
  const [searchParams] = useSearchParams();
  const queryStudentId = searchParams.get('studentId');
  
  const studentId = pathStudentId || queryStudentId;
  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const userId = studentId || userProfile?.uid || '';

  const [exercise, setExercise] = useState<GoalkeeperExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [debouncedUpdate, setDebouncedUpdate] = useState<NodeJS.Timeout | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [localFeedbacks, setLocalFeedbacks] = useState<{[key: string]: string}>({});
  const [localEvaluation, setLocalEvaluation] = useState<LocalEvaluation>(defaultEvaluation);

  // Sauvegarde des commentaires et évaluations en local
  const saveToLocalStorage = (userId: string, data: StorageData) => {
    localStorage.setItem(`goalkeeper_feedback_${userId}`, JSON.stringify(data));
  };

  // Chargement des commentaires et évaluations depuis le stockage local
  useEffect(() => {
    if (userId) {
      const savedData = localStorage.getItem(`goalkeeper_feedback_${userId}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setLocalFeedbacks(parsedData.feedbacks || {});
        if (parsedData.evaluation?.totalScore !== undefined) {
          const evaluation: LocalEvaluation = {
            criteria: parsedData.evaluation.criteria.map((criterion: EvaluationCriterion) => ({
              ...criterion,
              subCriteria: criterion.subCriteria.map((sub: SubCriterion) => ({
                ...sub,
                score: Number(sub.score) || 0,
                feedback: sub.feedback || ''
              }))
            })),
            totalScore: Number(parsedData.evaluation.totalScore),
            evaluatedBy: parsedData.evaluation.evaluatedBy,
            evaluatedAt: parsedData.evaluation.evaluatedAt
          };
          setLocalEvaluation(evaluation);
        }
      }
    }
  }, [userId]);

  // Publication de l'évaluation
  const handlePublishEvaluation = async () => {
    if (!exercise || !userId || !isFormateur || !userProfile) return;

    try {
      const updatedEvaluation: LocalEvaluation = {
        ...localEvaluation,
        evaluatedBy: userProfile.email || 'Unknown',
        evaluatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, `users/${userId}/exercises`, 'goalkeeper'), {
        status: 'evaluated',
        evaluation: updatedEvaluation
      });

      // Mettre à jour l'état local immédiatement
      setExercise(prev => prev ? {
        ...prev,
        status: 'evaluated',
        evaluation: updatedEvaluation
      } : prev);

      toast.success('Évaluation publiée avec succès !');
    } catch (error) {
      console.error('Erreur lors de la publication:', error);
      toast.error('Erreur lors de la publication de l\'évaluation');
    }
  };

  // Mise à jour de l'évaluation
  const handleEvaluationUpdate = async (criterionId: string, subCriterionId: string, score: number, feedback: string) => {
    if (!exercise || !userId || !isFormateur) return;

    // Mettre à jour l'évaluation locale
    const updatedEvaluation = {
      ...localEvaluation,
      criteria: localEvaluation.criteria.map(criterion => {
        if (criterion.id === criterionId) {
          return {
            ...criterion,
            subCriteria: criterion.subCriteria.map(sub => {
              if (sub.id === subCriterionId) {
                return { ...sub, score, feedback };
              }
              return sub;
            })
          };
        }
        return criterion;
      })
    };

    // Calculer le nouveau score total
    const totalScore = updatedEvaluation.criteria.reduce((sum, criterion) => 
      sum + criterion.subCriteria.reduce((subSum, sub) => subSum + sub.score, 0), 0);
    updatedEvaluation.totalScore = totalScore;

    // Mettre à jour l'état local immédiatement
    setLocalEvaluation(updatedEvaluation);
    
    // Mettre à jour l'exercice local
    const updatedExercise = {
      ...exercise,
      evaluation: {
        ...exercise.evaluation,
        criteria: updatedEvaluation.criteria,
        totalScore
      }
    };
    setExercise(updatedExercise);

    // Sauvegarder dans le stockage local
    saveToLocalStorage(userId, {
      feedbacks: localFeedbacks,
      evaluation: updatedEvaluation
    });

    // Annuler la mise à jour précédente si elle existe
    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    // Mettre à jour Firestore avec un délai
    const newTimeout = setTimeout(async () => {
      try {
        await goalkeeperService.updateEvaluation(userId, updatedExercise.evaluation);
        console.log('Évaluation mise à jour avec succès:', updatedExercise.evaluation);
      } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'évaluation:', error);
        // En cas d'erreur, revenir à l'état précédent
        setLocalEvaluation(localEvaluation);
        setExercise(exercise);
        toast.error('Erreur lors de la mise à jour de l\'évaluation');
      }
    }, 1000);

    setDebouncedUpdate(newTimeout);
  };

  // Mise à jour du feedback d'une ligne de dialogue
  const handleDialogueFeedbackUpdate = (section: 'firstCall' | 'secondCall', index: number, feedback: string) => {
    if (!exercise || !userId || !isFormateur) return;
    
    const feedbackKey = `${section}_${index}`;
    const updatedFeedbacks = {
      ...localFeedbacks,
      [feedbackKey]: feedback
    };
    
    // Mettre à jour l'état local immédiatement
    setLocalFeedbacks(updatedFeedbacks);
    
    // Sauvegarder dans le stockage local
    saveToLocalStorage(userId, {
      feedbacks: updatedFeedbacks,
      evaluation: localEvaluation
    });

    // Annuler la mise à jour précédente si elle existe
    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    // Créer une copie de l'exercice actuel pour la mise à jour
    const updatedExercise = {
      ...exercise,
      [section]: {
        ...exercise[section],
        lines: exercise[section].lines.map((line, i) => 
          i === index ? { ...line, feedback } : line
        )
      }
    };

    // Mettre à jour l'exercice local immédiatement pour une meilleure réactivité
    setExercise(updatedExercise);

    // Mettre à jour Firestore avec un délai plus long
    const newTimeout = setTimeout(() => {
      goalkeeperService.updateExercise(userId, updatedExercise)
        .catch(error => {
          console.error('Erreur lors de la mise à jour du feedback:', error);
          // En cas d'erreur, on revient à l'état précédent
          setLocalFeedbacks(prev => ({
            ...prev,
            [feedbackKey]: exercise[section].lines[index].feedback || ''
          }));
          setExercise(exercise);
        });
    }, 2000); // Augmenté à 2 secondes

    setDebouncedUpdate(newTimeout);
  };

  // Soumission de l'exercice
  const handleSubmit = async () => {
    if (!exercise || !userId) return;

    try {
      await goalkeeperService.submitExercise(userId);
      // Mettre à jour l'état local immédiatement
      setExercise(prev => prev ? {
        ...prev,
        status: 'submitted'
      } : prev);
      
      toast.success('Exercice soumis avec succès !');
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      toast.error('Erreur lors de la soumission de l\'exercice');
    }
  };

  const handleLineUpdate = (sectionKey: 'firstCall' | 'secondCall', index: number, text: string) => {
    if (!exercise) return;

    const updatedExercise = {
      ...exercise,
      [sectionKey]: {
        ...exercise[sectionKey],
        lines: exercise[sectionKey].lines.map((line, i) => 
          i === index ? { ...line, text } : line
        )
      }
    };

    setExercise(updatedExercise);

    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    const newTimeout = setTimeout(() => {
      goalkeeperService.updateExercise(userId, updatedExercise);
    }, 1000);

    setDebouncedUpdate(newTimeout);
  };

  const handleAddLine = (section: 'firstCall' | 'secondCall', speaker: 'goalkeeper' | 'commercial') => {
    if (!exercise || !userId || exercise.status === 'submitted') return;

    const updatedExercise = {
      ...exercise,
      [section]: {
        ...exercise[section],
        lines: [
          ...exercise[section].lines,
          {
            id: crypto.randomUUID(),
            speaker,
            text: '',
            feedback: ''
          }
        ]
      }
    };

    goalkeeperService.updateExercise(userId, updatedExercise);
  };

  const handleRemoveLine = (section: 'firstCall' | 'secondCall') => {
    if (!exercise || !userId || exercise.status === 'submitted') return;

    const updatedExercise = {
      ...exercise,
      [section]: {
        ...exercise[section],
        lines: exercise[section].lines.slice(0, -1)
      }
    };

    goalkeeperService.updateExercise(userId, updatedExercise);
  };

  // Fonction d'évaluation IA
  const handleAIEvaluation = async () => {
    if (!exercise || !userId) return;

    setAiLoading(true);

    const organizationId = import.meta.env.VITE_FABRILE_ORG_ID;
    const botId = import.meta.env.VITE_GOALKEEPER_BOT_ID;
    const token = import.meta.env.VITE_FABRILE_TOKEN;

    if (!organizationId || !botId || !token) {
      console.error("Missing environment variables for AI evaluation");
      toast.error("Error: Missing configuration for AI evaluation");
      setAiLoading(false);
      return;
    }

    try {
      const thread = await createThread(organizationId, botId);

      // Prepare the dialogue with line numbers for reference
      const firstCallLines = exercise.firstCall.lines.map(
        (line, index) => `[${index + 1}] ${line.speaker}: ${line.text}`
      );
      const secondCallLines = exercise.secondCall.lines.map(
        (line, index) =>
          `[${firstCallLines.length + index + 1}] ${line.speaker}: ${line.text}`
      );

      const dialogue = [...firstCallLines, ...secondCallLines].join("\n");

      const prompt = `Please evaluate this goalkeeper exercise dialogue and provide feedback:
${dialogue}

IMPORTANT: Your response MUST be in valid JSON format with the following structure:
{
  "lineFeedback": {
    "1": "Feedback for line 1",
    "2": "Feedback for line 2",
    // ... for each line
  },
  "evaluation": {
    "criteria": [
      {
        "name": "criteria_name",
        "score": number,
        "maxPoints": number,
        "feedback": "detailed feedback"
      }
      // ... for each criteria
    ]
  }
}

Evaluate based on these criteria:
${GOALKEEPER_EVALUATION_CRITERIA.map((criterion) =>
  criterion.subCriteria
    .map(
      (subCriteria) =>
        `${subCriteria.name}: ${subCriteria.maxPoints} points`
    )
    .join("\n")
).join("\n")}

Remember: Your response MUST be valid JSON that can be parsed with JSON.parse().`;

      const result = await createThreadMessage(
        organizationId,
        thread.id,
        prompt
      );

      if (!result || !result.completion || !result.completion.content) {
        throw new Error("No valid response received from AI");
      }

      const feedbackData = result.completion.content;
      console.log("Raw AI response:", feedbackData);

      // Process the AI feedback
      try {
        const { evaluation: aiEvaluation, lineFeedback } =
          processAIFeedback(feedbackData);
        console.log("Processed evaluation:", aiEvaluation);
        console.log("Processed line feedback:", lineFeedback);

        // Update exercise with line-specific feedback
        const updatedExercise: GoalkeeperExercise = {
          ...exercise,
          status: "evaluated" as const,
          evaluation: aiEvaluation,
          firstCall: {
            ...exercise.firstCall,
            lines: exercise.firstCall.lines.map((line, index) => ({
              ...line,
              feedback: lineFeedback[index + 1] || line.feedback || "",
            })),
          },
          secondCall: {
            ...exercise.secondCall,
            lines: exercise.secondCall.lines.map((line, index) => ({
              ...line,
              feedback:
                lineFeedback[exercise.firstCall.lines.length + index + 1] ||
                line.feedback ||
                "",
            })),
          },
          updatedAt: new Date().toISOString()
        };

        setExercise(updatedExercise);
        // Mettre à jour l'exercice complet avec le nouveau statut et l'évaluation
        await goalkeeperService.updateExercise(userId, updatedExercise);

        setLocalEvaluation(aiEvaluation);
        toast.success("AI evaluation completed successfully!");
      } catch (error) {
        console.error("Error processing AI feedback:", error);
      }
    } catch (error) {
      console.error("Error during AI evaluation:", error);
      toast.error(
        "Error during AI evaluation. Please check the console for more details."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const processAIFeedback = (
    feedback: string
  ): {
    evaluation: LocalEvaluation;
    lineFeedback: { [key: number]: string };
  } => {
    let parsedFeedback;
    try {
      // Strip out markdown code block markers if present
      const cleanedFeedback = feedback.replace(/^```json\n|\n```$/g, '').trim();
      parsedFeedback = JSON.parse(cleanedFeedback);
    } catch (e) {
      console.error("Failed to parse AI feedback JSON:", e);
      throw new Error("Invalid AI response format");
    }

    console.log("Parsed feedback:", parsedFeedback);

    const evaluation: LocalEvaluation = {
      criteria: GOALKEEPER_EVALUATION_CRITERIA.map((criterion) => {
        const criterionSubCriteria = criterion.subCriteria.map(subCriterion => {
          const aiCriterion = parsedFeedback.evaluation.criteria.find(
            (c: any) => c.name === subCriterion.name
          );
          return {
            ...subCriterion,
            score: aiCriterion?.score || 0,
            feedback: aiCriterion?.feedback || ""
          };
        });

        const totalScore = criterionSubCriteria.reduce((acc, sub) => acc + sub.score, 0);

        return {
          ...criterion,
          score: totalScore,
          subCriteria: criterionSubCriteria
        };
      }),
      totalScore: GOALKEEPER_EVALUATION_CRITERIA.reduce((total, criterion) => {
        const subScores = criterion.subCriteria.map(sub => {
          const aiCriterion = parsedFeedback.evaluation.criteria.find(
            (c: any) => c.name === sub.name
          );
          return aiCriterion?.score || 0;
        });
        return total + subScores.reduce((acc, score) => acc + score, 0);
      }, 0),
      evaluatedBy: "AI",
      evaluatedAt: new Date().toISOString(),
    };

    console.log("Processed evaluation:", evaluation);

    // Process line-by-line feedback
    const lineFeedback: { [key: number]: string } = parsedFeedback.lineFeedback || {};

    return { evaluation, lineFeedback };
  };

  // Chargement initial de l'exercice
  useEffect(() => {
    if (!userId) {
      console.log('Aucun identifiant d\'utilisateur disponible');
      return;
    }

    const loadExercise = async () => {
      try {
        // D'abord, on récupère ou crée l'exercice
        const initialExercise = await goalkeeperService.getExercise(userId);
        if (initialExercise) {
          setExercise(initialExercise);
          
          // Initialiser les feedbacks locaux depuis l'exercice
          const initialFeedbacks: {[key: string]: string} = {};
          initialExercise.firstCall.lines.forEach((line: any, index: number) => {
            initialFeedbacks[`firstCall_${index}`] = line.feedback || '';
          });
          initialExercise.secondCall.lines.forEach((line: any, index: number) => {
            initialFeedbacks[`secondCall_${index}`] = line.feedback || '';
          });
          setLocalFeedbacks(initialFeedbacks);
        }
        
        // Ensuite, on s'abonne aux mises à jour, mais on ignore les mises à jour
        // si elles correspondent à notre état local pour éviter les boucles
        const unsubscribe = goalkeeperService.subscribeToExercise(userId, (updatedExercise: GoalkeeperExercise) => {
          console.log('Exercise updated:', updatedExercise);
          setExercise(prev => {
            // Ne pas mettre à jour si c'est notre propre mise à jour
            if (prev && JSON.stringify(prev) === JSON.stringify(updatedExercise)) {
              return prev;
            }
            return updatedExercise;
          });
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error loading exercise:', error);
        setLoading(false);
      }
    };

    loadExercise();
  }, [userId]);

  // Rendu du composant
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>;
  }

  if (!exercise) {
    return <div className="flex justify-center items-center h-screen">Erreur de chargement de l'exercice</div>;
  }

  // Rendu conditionnel de la grille d'évaluation
  const showEvaluationGrid = isFormateur || exercise?.status === 'evaluated' || exercise?.status === 'submitted';
  console.log('Debug - Evaluation Grid:', {
    isFormateur,
    status: exercise?.status,
    showEvaluationGrid,
    hasEvaluation: !!exercise?.evaluation
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">Passer le Goalkeeper</h1>
        <p className="text-gray-700 mb-6">
          Écrivez un dialogue complet d'une conversation téléphonique avec le/la "goalkeeper" dans le but qu'il/elle vous passe le décideur
          (en utilisant les techniques apprises pendant la formation)
        </p>
      </div>

      <div className="flex gap-4 mb-8">
        {exercise.status === 'evaluated' && (
          <ScoreDisplay 
            totalScore={exercise.evaluation?.criteria.reduce((sum, criterion) => 
              sum + criterion.subCriteria.reduce((subSum, sub) => subSum + sub.score, 0), 0) || 0} 
            maxScore={GOALKEEPER_EVALUATION_CRITERIA.reduce((sum, criterion) => 
              sum + criterion.subCriteria.reduce((subSum, sub) => subSum + sub.maxPoints, 0), 0)}
          />
        )}
        
        {exercise.status !== 'not_started' && (
          <div className={`p-4 rounded-lg flex-grow ${exercise.status === 'evaluated' ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <h2 className={`text-lg font-semibold ${exercise.status === 'evaluated' ? 'text-green-800' : 'text-yellow-800'}`}>
              Statut de l'exercice
            </h2>
            <div className="text-sm text-gray-600">
              {exercise?.status === 'in_progress' && 'En cours'}
              {exercise?.status === 'submitted' && 'En attente de correction'}
              {exercise?.status === 'evaluated' && 'Corrigé'}
            </div>
            {exercise.status === 'evaluated' && exercise.evaluation?.evaluatedAt && (
              <p className="text-sm text-green-600 mt-1">
                Corrigé le {new Date(exercise.evaluation.evaluatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      <Link to="/" className="inline-flex items-center text-green-600 hover:text-green-800 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Retour au tableau de bord
      </Link>

      {isFormateur && (
        <div className="bg-blue-100 p-4 mb-6 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800">Mode Formateur</h2>
          <p className="text-blue-600 mb-4">Vous corrigez l'exercice de l'apprenant.</p>
          <button
            onClick={handleAIEvaluation}
            className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
            disabled={aiLoading}
          >
            {aiLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Évaluation en cours...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                Corriger avec l'IA
              </>
            )}
          </button>
        </div>
      )}

      {!isFormateur && exercise.status === 'in_progress' && (
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Soumettre
          </button>
        </div>
      )}

      {exercise.firstCall && (
        <>
          <DialogueSection
            title="Premier appel"
            section={exercise.firstCall}
            isFormateur={isFormateur}
            isSubmitted={exercise.status !== 'in_progress'}
            onAddLine={(speaker) => handleAddLine('firstCall', speaker)}
            onRemoveLine={() => handleRemoveLine('firstCall')}
            onUpdateLine={(index, text) => handleLineUpdate('firstCall', index, text)}
            onUpdateFeedback={(index, feedback) => handleDialogueFeedbackUpdate('firstCall', index, feedback)}
          />
        </>
      )}

      {exercise.secondCall && (
        <>
          <DialogueSection
            title="Deuxième appel"
            section={exercise.secondCall}
            isFormateur={isFormateur}
            isSubmitted={exercise.status !== 'in_progress'}
            onAddLine={(speaker) => handleAddLine('secondCall', speaker)}
            onRemoveLine={() => handleRemoveLine('secondCall')}
            onUpdateLine={(index, text) => handleLineUpdate('secondCall', index, text)}
            onUpdateFeedback={(index, feedback) => handleDialogueFeedbackUpdate('secondCall', index, feedback)}
          />
        </>
      )}

      {(isFormateur || exercise.status === 'evaluated') && exercise.evaluation && (
        <div className="mt-12 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Grille d'évaluation</h2>
            {exercise.status === 'submitted' && (
              <div className="bg-yellow-100 px-4 py-2 rounded-lg">
                <p className="text-yellow-800">
                  En attente de l'évaluation du formateur
                </p>
              </div>
            )}
          </div>
          <EvaluationGrid
            isFormateur={isFormateur}
            evaluation={localEvaluation}
            onUpdateScore={(criterionId, subCriterionId, score) => handleEvaluationUpdate(criterionId, subCriterionId, score, '')}
            onUpdateFeedback={(criterionId, subCriterionId, feedback) => handleEvaluationUpdate(criterionId, subCriterionId, localEvaluation.criteria.find(criterion => criterion.id === criterionId)?.subCriteria.find(sub => sub.id === subCriterionId)?.score || 0, feedback)}
          />
          {isFormateur && (
            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={handlePublishEvaluation}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Publier l'évaluation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoalkeeperExercise;
