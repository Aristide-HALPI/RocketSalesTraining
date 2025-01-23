import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { DialogueSection } from '../components/DialogueSection';
import { EvaluationGrid } from '../components/EvaluationGrid';
import { GoalkeeperExercise as GoalkeeperExerciseType } from '../types';
import { goalkeeperService } from '../services/goalkeeperService';
import { AIService } from '../../../services/AIService'; // Correction du chemin d'importation

const GoalkeeperExercise: React.FC = () => {
  const { userProfile } = useAuth();
  const { studentId: pathStudentId } = useParams();
  const [searchParams] = useSearchParams();
  const queryStudentId = searchParams.get('studentId');
  
  const studentId = pathStudentId || queryStudentId;
  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const userId = studentId || userProfile?.uid || '';

  const [exercise, setExercise] = useState<GoalkeeperExerciseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [debouncedUpdate, setDebouncedUpdate] = useState<NodeJS.Timeout | null>(null);

  const [localFeedbacks, setLocalFeedbacks] = useState<{[key: string]: string}>({});
  const [localEvaluation, setLocalEvaluation] = useState<any>(null);

  // Sauvegarde des commentaires et évaluations en local
  const saveToLocalStorage = (userId: string, data: any) => {
    localStorage.setItem(`goalkeeper_feedback_${userId}`, JSON.stringify(data));
  };

  // Chargement des commentaires et évaluations depuis le stockage local
  useEffect(() => {
    if (userId) {
      const savedData = localStorage.getItem(`goalkeeper_feedback_${userId}`);
      if (savedData) {
        const data = JSON.parse(savedData);
        setLocalFeedbacks(data.feedbacks || {});
        setLocalEvaluation(data.evaluation);
      }
    }
  }, [userId]);

  // Sauvegarde manuelle des commentaires et de l'évaluation
  const handleSaveEvaluation = async () => {
    if (!exercise || !userId || !isFormateur) return;
    
    try {
      const updatedExercise = {
        ...exercise,
        firstCall: {
          ...exercise.firstCall,
          lines: exercise.firstCall.lines.map((line, i) => ({
            ...line,
            feedback: localFeedbacks[`firstCall_${i}`] || line.feedback
          }))
        },
        secondCall: {
          ...exercise.secondCall,
          lines: exercise.secondCall.lines.map((line, i) => ({
            ...line,
            feedback: localFeedbacks[`secondCall_${i}`] || line.feedback
          }))
        },
        evaluation: localEvaluation || exercise.evaluation
      };

      await updateDoc(doc(db, `users/${userId}/exercises`, 'goalkeeper'), updatedExercise);
      console.log('Évaluation sauvegardée avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'évaluation:', error);
    }
  };

  // Publication de l'évaluation
  const handlePublishEvaluation = async () => {
    if (!exercise || !userId || !isFormateur || !userProfile) return;

    try {
      await updateDoc(doc(db, `users/${userId}/exercises`, 'goalkeeper'), {
        status: 'evaluated',
        evaluation: {
          ...exercise.evaluation,
          evaluatedBy: userProfile.email || 'Unknown',
          evaluatedAt: new Date().toISOString()
        }
      });
      console.log('Correction publiée avec succès');
    } catch (error) {
      console.error('Erreur lors de la publication de la correction:', error);
    }
  };

  // Mise à jour du score d'un critère
  const handleUpdateScore = (criterionId: string, subCriterionId: string, score: number) => {
    if (!exercise || !exercise.evaluation) return;

    const updatedCriteria = exercise.evaluation.criteria.map(criterion => {
      if (criterion.id === criterionId) {
        return {
          ...criterion,
          subCriteria: criterion.subCriteria.map(sub => {
            if (sub.id === subCriterionId) {
              return { ...sub, score };
            }
            return sub;
          })
        };
      }
      return criterion;
    });

    const totalScore = updatedCriteria.reduce((total, criterion) => {
      return total + criterion.subCriteria.reduce((subTotal, sub) => subTotal + (sub.score || 0), 0);
    }, 0);

    setLocalEvaluation({
      criteria: updatedCriteria,
      totalScore
    });

    saveToLocalStorage(userId, {
      feedbacks: localFeedbacks,
      evaluation: {
        criteria: updatedCriteria,
        totalScore
      }
    });
  };

  // Mise à jour du feedback d'un critère
  const handleUpdateFeedback = (criterionId: string, subCriterionId: string, feedback: string) => {
    if (!exercise || !exercise.evaluation) return;

    const updatedCriteria = exercise.evaluation.criteria.map(criterion => {
      if (criterion.id === criterionId) {
        return {
          ...criterion,
          subCriteria: criterion.subCriteria.map(sub => {
            if (sub.id === subCriterionId) {
              return { ...sub, feedback };
            }
            return sub;
          })
        };
      }
      return criterion;
    });

    setLocalEvaluation({
      ...localEvaluation,
      criteria: updatedCriteria
    });

    saveToLocalStorage(userId, {
      feedbacks: localFeedbacks,
      evaluation: {
        ...localEvaluation,
        criteria: updatedCriteria
      }
    });
  };

  // Soumission de l'exercice
  const handleSubmit = async () => {
    if (!exercise) return;
    await goalkeeperService.submitExercise(userId);
    console.log('Exercice soumis avec succès');
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

  const handleFeedbackUpdate = (section: 'firstCall' | 'secondCall', index: number, feedback: string) => {
    if (!exercise || !userId || !isFormateur) return;
    
    const feedbackKey = `${section}_${index}`;
    setLocalFeedbacks(prev => ({
      ...prev,
      [feedbackKey]: feedback
    }));
    
    saveToLocalStorage(userId, {
      feedbacks: {
        ...localFeedbacks,
        [feedbackKey]: feedback
      },
      evaluation: localEvaluation
    });
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
        }
        
        // Ensuite, on s'abonne aux mises à jour
        const unsubscribe = goalkeeperService.subscribeToExercise(userId, (updatedExercise) => {
          console.log('Exercise updated:', updatedExercise);
          setExercise(updatedExercise);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error loading exercise:', error);
        setLoading(false);
      }
    };

    loadExercise().then(unsubscribe => {
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
        if (debouncedUpdate) {
          clearTimeout(debouncedUpdate);
        }
      };
    });
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
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Corriger avec l'IA
          </button>
        </div>
      )}

      <div className="flex justify-between items-start mb-6">
        <div className="bg-purple-100 p-4 rounded-lg flex-grow mr-4">
          <h2 className="text-lg font-semibold text-purple-800">Votre score</h2>
          <p className="text-purple-600">(max 20 points)</p>
          <p className="text-3xl font-bold text-purple-800 mt-2">{exercise.evaluation?.totalScore || 0}</p>
        </div>
        
        {exercise.status !== 'in_progress' && (
          <div className={`p-4 rounded-lg flex-grow ${exercise.status === 'evaluated' ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <h2 className={`text-lg font-semibold ${exercise.status === 'evaluated' ? 'text-green-800' : 'text-yellow-800'}`}>
              Statut de l'exercice
            </h2>
            <p className={`mt-2 ${exercise.status === 'evaluated' ? 'text-green-600' : 'text-yellow-600'}`}>
              {exercise.status === 'evaluated' 
                ? 'Exercice corrigé' 
                : 'En attente de correction'}
            </p>
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
          {console.log('First Call Data:', exercise.firstCall)}
          <DialogueSection
            title="Premier appel"
            section={{
              ...exercise.firstCall,
              lines: exercise.firstCall.lines.map((line, i) => ({
                ...line,
                feedback: localFeedbacks[`firstCall_${i}`] || line.feedback
              }))
            }}
            isFormateur={isFormateur}
            isSubmitted={exercise.status === 'submitted'}
            onAddLine={(speaker) => handleAddLine('firstCall', speaker)}
            onRemoveLine={() => handleRemoveLine('firstCall')}
            onUpdateLine={(index, text) => handleLineUpdate('firstCall', index, text)}
            onUpdateFeedback={(index, feedback) => handleFeedbackUpdate('firstCall', index, feedback)}
          />
        </>
      )}

      {exercise.secondCall && (
        <>
          {console.log('Second Call Data:', exercise.secondCall)}
          <DialogueSection
            title="Deuxième appel"
            section={{
              ...exercise.secondCall,
              lines: exercise.secondCall.lines.map((line, i) => ({
                ...line,
                feedback: localFeedbacks[`secondCall_${i}`] || line.feedback
              }))
            }}
            isFormateur={isFormateur}
            isSubmitted={exercise.status === 'submitted'}
            onAddLine={(speaker) => handleAddLine('secondCall', speaker)}
            onRemoveLine={() => handleRemoveLine('secondCall')}
            onUpdateLine={(index, text) => handleLineUpdate('secondCall', index, text)}
            onUpdateFeedback={(index, feedback) => handleFeedbackUpdate('secondCall', index, feedback)}
          />
        </>
      )}

      {!isFormateur && exercise.status !== 'submitted' && (
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Soumettre
          </button>
        </div>
      )}

      {showEvaluationGrid && exercise.evaluation && (
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
            evaluation={localEvaluation || exercise.evaluation}
            onUpdateScore={handleUpdateScore}
            onUpdateFeedback={handleUpdateFeedback}
          />
          {isFormateur && (
            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={handleSaveEvaluation}
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
                  <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm10 0H6v12h8V4z" />
                </svg>
                Sauvegarder
              </button>
              <button
                onClick={handlePublishEvaluation}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Publier la correction
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoalkeeperExercise;
