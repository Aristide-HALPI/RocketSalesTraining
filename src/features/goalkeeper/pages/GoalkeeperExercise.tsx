import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { DialogueSection } from '../components/DialogueSection';
import { EvaluationGrid } from '../components/EvaluationGrid';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { AIService } from '../../../services/AIService';
import { goalkeeperService } from '../services/goalkeeperService';
import type { GoalkeeperExercise } from '../types';
import { EvaluationCriterion, SubCriterion, GOALKEEPER_EVALUATION_CRITERIA } from '../types';
import { toast } from 'react-toastify';

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

  // Mise à jour du score d'un critère
  const handleUpdateScore = (criterionId: string, subCriterionId: string, score: number) => {
    if (!exercise || !exercise.evaluation) return;

    // S'assurer que nous avons une évaluation locale initialisée
    const currentEvaluation: LocalEvaluation = localEvaluation;

    // Mettre à jour le score du sous-critère spécifique
    const updatedCriteria = currentEvaluation.criteria.map((criterion: EvaluationCriterion) => {
      if (criterion.id === criterionId) {
        return {
          ...criterion,
          subCriteria: criterion.subCriteria.map((sub: SubCriterion) => {
            if (sub.id === subCriterionId) {
              return { ...sub, score };
            }
            return sub;
          })
        };
      }
      return criterion;
    });

    // Calculer le nouveau score total
    const totalScore = updatedCriteria.reduce((total: number, criterion: EvaluationCriterion) => 
      total + criterion.subCriteria.reduce((subTotal: number, sub: SubCriterion) => 
        subTotal + (Number(sub.score) || 0), 0
      ), 0
    );

    // Créer la nouvelle évaluation
    const updatedEvaluation: LocalEvaluation = {
      ...currentEvaluation,
      criteria: updatedCriteria,
      totalScore
    };

    // Mettre à jour l'état local
    setLocalEvaluation(updatedEvaluation);
    saveToLocalStorage(userId, {
      feedbacks: localFeedbacks,
      evaluation: updatedEvaluation
    });
  };

  // Mise à jour du feedback d'un critère dans la grille
  const handleUpdateCriterionFeedback = (criterionId: string, subCriterionId: string, feedback: string) => {
    if (!exercise || !exercise.evaluation) return;

    // S'assurer que nous avons une évaluation locale initialisée
    const currentEvaluation: LocalEvaluation = localEvaluation;

    // Mettre à jour le feedback du sous-critère spécifique
    const updatedCriteria = currentEvaluation.criteria.map((criterion: EvaluationCriterion) => {
      if (criterion.id === criterionId) {
        return {
          ...criterion,
          subCriteria: criterion.subCriteria.map((sub: SubCriterion) => {
            if (sub.id === subCriterionId) {
              return { ...sub, feedback };
            }
            return sub;
          })
        };
      }
      return criterion;
    });

    // Créer la nouvelle évaluation
    const updatedEvaluation: LocalEvaluation = {
      ...currentEvaluation,
      criteria: updatedCriteria
    };

    // Mettre à jour l'état local
    setLocalEvaluation(updatedEvaluation);
    saveToLocalStorage(userId, {
      feedbacks: localFeedbacks,
      evaluation: updatedEvaluation
    });
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
    
    try {
      // Évaluation du premier appel
      const firstCallEvaluation = await AIService.evaluateDialogue(exercise.firstCall.lines);
      
      // Évaluation du deuxième appel
      const secondCallEvaluation = await AIService.evaluateDialogue(exercise.secondCall.lines);
      
      // Combiner les évaluations
      const combinedEvaluation = {
        score: (firstCallEvaluation.score + secondCallEvaluation.score) / 2,
        feedback: `Premier appel:\n${firstCallEvaluation.feedback}\n\nDeuxième appel:\n${secondCallEvaluation.feedback}`,
        strengths: [...firstCallEvaluation.strengths, ...secondCallEvaluation.strengths],
        improvements: [...firstCallEvaluation.improvements, ...secondCallEvaluation.improvements],
        criteria: firstCallEvaluation.criteria.map((criterion, index) => ({
          ...criterion,
          score: (criterion.score + secondCallEvaluation.criteria[index].score) / 2,
          feedback: `Premier appel: ${criterion.feedback}\nDeuxième appel: ${secondCallEvaluation.criteria[index].feedback}`
        }))
      };

      // Mise à jour de l'évaluation dans la base de données
      await AIService.updateAIEvaluation(userId, combinedEvaluation);
      
      console.log('Évaluation IA terminée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'évaluation IA:', error);
      alert('Une erreur est survenue lors de l\'évaluation par l\'IA. Veuillez réessayer plus tard.');
    }
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
  const showEvaluationGrid = isFormateur || exercise?.status === 'submitted';
  console.log('Debug - Evaluation Grid:', {
    isFormateur,
    status: exercise?.status,
    showEvaluationGrid,
    hasEvaluation: !!exercise?.evaluation
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 rounded-lg p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Goalkeeper</h1>
        <p className="text-gray-600 mb-4">
          Mettez-vous dans la peau d'un commercial qui appelle une entreprise pour la première fois. Votre objectif est d'obtenir un rendez-vous avec le décideur.
        </p>

        {/* Zone de score et statut en deux colonnes égales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white bg-opacity-50 rounded p-4">
            <div className="text-purple-700">Votre score</div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-purple-900 mr-2">
                {exercise?.totalScore || '-'}
              </span>
              <span className="text-sm text-purple-600">
                (max {exercise?.maxScore || 30} points)
              </span>
            </div>
          </div>

          <div className="bg-white bg-opacity-50 rounded p-4">
            <div className="text-blue-700">Statut de l'exercice</div>
            <div className="text-2xl font-bold text-blue-900">
              {exercise?.status === 'not_started' && 'Non commencé'}
              {exercise?.status === 'in_progress' && 'En cours'}
              {exercise?.status === 'submitted' && 'Soumis'}
              {exercise?.status === 'evaluated' && 'Évalué'}
            </div>
          </div>
        </div>
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
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
            </svg>
            Corriger avec l'IA
          </button>
        </div>
      )}

      <div className="flex gap-4 mb-8">
        {exercise.status === 'evaluated' && (
          <ScoreDisplay 
            totalScore={exercise.evaluation?.totalScore || 0} 
            maxScore={GOALKEEPER_EVALUATION_CRITERIA.reduce((sum, criterion) => sum + criterion.maxPoints, 0)}
          />
        )}
        
        {exercise.status !== 'in_progress' && (
          <div className={`p-4 rounded-lg flex-grow ${exercise.status === 'evaluated' ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <h2 className={`text-lg font-semibold ${exercise.status === 'evaluated' ? 'text-green-800' : 'text-yellow-800'}`}>
              Statut de l'exercice
            </h2>
            <div className="text-sm text-gray-600">
              {exercise?.status === 'not_started' && 'À débuter'}
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

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">Passer le Goalkeeper</h1>
        <p className="text-gray-700 mb-6">
          Écrivez un dialogue complet d'une conversation téléphonique avec le/la "goalkeeper" dans le but qu'il/elle vous passe le décideur
          (en utilisant les techniques apprises pendant la formation)
        </p>
      </div>

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

      {(showEvaluationGrid || exercise.status === 'evaluated') && exercise.evaluation && (
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
            onUpdateScore={handleUpdateScore}
            onUpdateFeedback={handleUpdateCriterionFeedback}
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
