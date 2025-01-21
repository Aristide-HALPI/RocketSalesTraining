import { FC, useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BackButton } from '../components/BackButton';
import { useExercisePersistence } from '../hooks/useExercisePersistence';
import { useAuth } from '../contexts/AuthContext';
import { DialogueLine, EvaluationCriterion as GoalkeeperScoringCriteria, SubCriterion } from '../types/goalkeeper';
import { AIService } from '../services/AIService';
import { useLocation, useSearchParams, useParams } from 'react-router-dom';

// Définition des critères d'évaluation
const evaluationCriteria: GoalkeeperScoringCriteria[] = [
  {
    id: 'criterion1',
    name: "1. Attitude générale",
    description: "Évaluation du professionnalisme et de la politesse",
    maxPoints: 3,
    scoreOptions: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    subCriteria: [
      { id: 'sub1_1', name: "Ton chaleureux et professionnel tout au long de l'appel", score: 0, maxPoints: 2 },
      { id: 'sub1_2', name: "Salutation initiale polie et adaptée (exemple : \"Bonjour\")", score: 0, maxPoints: 1 }
    ]
  },
  {
    id: 'criterion2',
    name: "2. Demande à parler au décideur",
    description: "Formulation de la demande pour parler au décideur",
    maxPoints: 3,
    scoreOptions: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    subCriteria: [
      { id: 'sub2_1', name: "Formulation claire et polie, incluant le prénom, puis prénom et nom du décideur", score: 0, maxPoints: 3 }
    ]
  },
  {
    id: 'criterion3',
    name: "3. Réponse à la question \"Qui êtes-vous ?\"",
    description: "Qualité et pertinence de la présentation",
    maxPoints: 5,
    scoreOptions: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
    subCriteria: [
      { id: 'sub3_1', name: "Présentation concise incluant le prénom et éventuellement le nom de famille", score: 0, maxPoints: 2 },
      { id: 'sub3_2', name: "Absence de mention de la société", score: 0, maxPoints: 2 },
      { id: 'sub3_3', name: "Aucune tentative de vente ou allusion commerciale", score: 0, maxPoints: 1 }
    ]
  },
  {
    id: 'criterion4',
    name: "4. Réponse à \"Connaissez-vous le décideur ?\"",
    description: "Honnêteté et clarté de la réponse",
    maxPoints: 2,
    scoreOptions: [0, 0.5, 1, 1.5, 2],
    subCriteria: [
      { id: 'sub4_1', name: "Réponse honnête et claire (exemple : \"Non, pas encore. C'est justement la raison de mon appel.\")", score: 0, maxPoints: 2 }
    ]
  },
  {
    id: 'criterion5',
    name: "5. Réponse à \"Pourquoi appelez-vous ?\"",
    description: "Qualité et pertinence de la raison donnée",
    maxPoints: 10,
    scoreOptions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    subCriteria: [
      { id: 'sub5_1', name: "Raison complexe et détaillée (plus de 10 mots)", score: 0, maxPoints: 5 },
      { id: 'sub5_2', name: "Absence de termes commerciaux interdits (produit, solution, présentation, vendre, proposer, etc.)", score: 0, maxPoints: 5 }
    ]
  },
  {
    id: 'criterion6',
    name: "6. Gestion des indisponibilités du décideur",
    description: "Gestion appropriée de l'indisponibilité",
    maxPoints: 7,
    scoreOptions: [0, 1, 2, 3, 4, 5, 6, 7],
    subCriteria: [
      { id: 'sub6_1', name: "Demande du meilleur moment pour rappeler", score: 0, maxPoints: 5 },
      { id: 'sub6_2', name: "Formulation ouverte sans proposer un créneau précis OU demande du numéro si en voiture", score: 0, maxPoints: 2 }
    ]
  },
  {
    id: 'criterion7',
    name: "7. Interaction avec le Goalkeeper",
    description: "Qualité de l'interaction personnelle",
    maxPoints: 3,
    scoreOptions: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    subCriteria: [
      { id: 'sub7_1', name: "Demande du prénom du Goalkeeper avant la fin du premier appel", score: 0, maxPoints: 2 },
      { id: 'sub7_2', name: "Utilisation du prénom du Goalkeeper lors du rappel", score: 0, maxPoints: 1 }
    ]
  },
  {
    id: 'criterion8',
    name: "8. Comportement du Goalkeeper",
    description: "Professionnalisme dans le rôle",
    maxPoints: 3,
    scoreOptions: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    subCriteria: [
      { id: 'sub8_1', name: "Adopte une attitude logique et professionnelle dans son rôle de filtrage", score: 0, maxPoints: 3 }
    ]
  }
];

const firstCallTemplate: DialogueLine[] = Array.from({ length: 18 }, (_, index) => ({
  id: (index + 1).toString(),
  speaker: index % 2 === 0 ? 'goalkeeper' : 'commercial',
  text: '',
  feedback: '',
  required: true
}));

const secondCallTemplate: DialogueLine[] = Array.from({ length: 5 }, (_, index) => ({
  id: (index + 19).toString(),
  speaker: index % 2 === 0 ? 'commercial' : 'goalkeeper',
  text: '',
  feedback: '',
  isSecondCall: true,
  required: true
}));

// Calcul du score sur 20
const calculateFinalScore = (criteria: GoalkeeperScoringCriteria[]): { raw: number, total: number, scaled: number } => {
  const raw = criteria.reduce((total, c) => total + (c.score || 0), 0);
  const total = 43; // Score total possible selon le barème
  // Conversion en note sur 20 avec la règle de 3
  const scaled = Math.round((raw / total) * 20 * 10) / 10; // Arrondi à 1 décimale
  return { raw, total, scaled };
};

export default function GoalkeeperExercise() {
  const { currentUser } = useAuth();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const isEvaluationMode = mode === 'evaluation';

  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [firstCallLines, setFirstCallLines] = useState<DialogueLine[]>([]);
  const [secondCallLines, setSecondCallLines] = useState<DialogueLine[]>([]);
  const [feedbacks, setFeedbacks] = useState<{ [key: string]: string }>({});
  const [globalFeedback, setGlobalFeedback] = useState('');
  const [criteria, setCriteria] = useState<GoalkeeperScoringCriteria[]>(evaluationCriteria);
  const [criteriaFeedbacks, setCriteriaFeedbacks] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEvaluated, setIsEvaluated] = useState(false);

  const handleExerciseData = (data: any) => {
    console.log('Processing exercise data:', data);

    // Mise à jour des dialogues
    if (data.firstCallLines) {
      console.log('Setting first call lines:', data.firstCallLines);
      setFirstCallLines(data.firstCallLines);
    } else if (data.dialogues?.firstCall) {
      console.log('Setting first call lines from dialogues:', data.dialogues.firstCall);
      setFirstCallLines(data.dialogues.firstCall);
    }

    if (data.secondCallLines) {
      console.log('Setting second call lines:', data.secondCallLines);
      setSecondCallLines(data.secondCallLines);
    } else if (data.dialogues?.secondCall) {
      console.log('Setting second call lines from dialogues:', data.dialogues.secondCall);
      setSecondCallLines(data.secondCallLines);
    }

    // Chargement des feedbacks existants
    if (data.lineFeedbacks) {
      console.log('Setting feedbacks from root:', data.lineFeedbacks);
      setFeedbacks(data.lineFeedbacks);
    } else if (data.evaluation?.lineFeedbacks) {
      console.log('Setting feedbacks from evaluation:', data.evaluation.lineFeedbacks);
      setFeedbacks(data.evaluation.lineFeedbacks);
    }

    // Chargement du feedback global
    if (data.feedback) {
      console.log('Setting global feedback from root:', data.feedback);
      setGlobalFeedback(data.feedback);
    } else if (data.evaluation?.feedback) {
      console.log('Setting global feedback from evaluation:', data.evaluation.feedback);
      setGlobalFeedback(data.evaluation.feedback);
    }

    // Chargement des critères et des notes
    if (data.criteria) {
      console.log('Setting criteria from root:', data.criteria);
      setCriteria(data.criteria);
    } else if (data.evaluation?.criteria) {
      console.log('Setting criteria from evaluation:', data.evaluation.criteria);
      setCriteria(data.evaluation.criteria);
    }

    // Chargement des feedbacks des critères
    if (data.criteriaFeedbacks) {
      console.log('Setting criteria feedbacks from root:', data.criteriaFeedbacks);
      setCriteriaFeedbacks(data.criteriaFeedbacks);
    } else if (data.evaluation?.criteriaFeedbacks) {
      console.log('Setting criteria feedbacks from evaluation:', data.evaluation.criteriaFeedbacks);
      setCriteriaFeedbacks(data.evaluation.criteriaFeedbacks);
    }

    // Mise à jour des états
    const isSubmittedState = data.status === 'submitted' || data.status === 'evaluated' || data.isSubmitted;
    const isEvaluatedState = data.status === 'evaluated' || data.isEvaluated;
    
    console.log('Setting submission state:', { isSubmitted: isSubmittedState, isEvaluated: isEvaluatedState });
    setIsSubmitted(isSubmittedState);
    setIsEvaluated(isEvaluatedState);
  };

  useEffect(() => {
    const loadExerciseData = async () => {
      try {
        setLoading(true);
        setError(null);

        const targetUserId = userId || currentUser?.uid;
        if (!targetUserId) {
          throw new Error('User ID not found');
        }

        console.log('Loading exercise for userId:', targetUserId);

        // Essayons d'abord le chemin alternatif dans la collection exercises
        const altExerciseRef = doc(db, 'exercises', `goalkeeper_${targetUserId}`);
        const altExerciseDoc = await getDoc(altExerciseRef);
        
        if (altExerciseDoc.exists()) {
          console.log('Found exercise in exercises collection:', altExerciseDoc.data());
          handleExerciseData(altExerciseDoc.data());
          return;
        }

        // Si non trouvé, essayons dans la collection users
        const exerciseRef = doc(db, 'users', targetUserId, 'exercises', 'goalkeeper');
        const exerciseDoc = await getDoc(exerciseRef);
        
        if (exerciseDoc.exists()) {
          console.log('Found exercise in users collection:', exerciseDoc.data());
          handleExerciseData(exerciseDoc.data());
          return;
        }

        // Si l'exercice n'existe pas, créons-en un nouveau
        if (!isEvaluationMode) {
          const newExercise = {
            firstCallLines: firstCallTemplate,
            secondCallLines: secondCallTemplate,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: targetUserId
          };

          await Promise.all([
            setDoc(exerciseRef, newExercise),
            setDoc(altExerciseRef, newExercise)
          ]);

          handleExerciseData(newExercise);
          return;
        }

        throw new Error('Exercise not found in any location');

      } catch (err) {
        console.error('Error loading exercise:', err);
        setError(err instanceof Error ? err.message : 'Failed to load exercise');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadExerciseData();
    }
  }, [userId, currentUser]);

  const handleSaveEvaluation = async () => {
    try {
      if (!userId || !currentUser) {
        throw new Error('User ID and current user are required');
      }

      setSaving(true);
      setError(null);

      const evaluationData = {
        evaluation: {
          lineFeedbacks: feedbacks,
          feedback: globalFeedback,
          criteria,
          criteriaFeedbacks,
          status: 'evaluated',
          evaluatedAt: new Date().toISOString(),
          evaluatedBy: currentUser.uid,
          score: calculateFinalScore(criteria).scaled
        },
        status: 'evaluated'
      };

      // Sauvegarder dans les deux emplacements possibles
      const exerciseRef = doc(db, 'users', userId, 'exercises', 'goalkeeper');
      const altExerciseRef = doc(db, 'exercises', `goalkeeper_${userId}`);

      await Promise.all([
        updateDoc(exerciseRef, evaluationData).catch(err => 
          console.log('Could not save to primary path:', err)
        ),
        updateDoc(altExerciseRef, evaluationData).catch(err => 
          console.log('Could not save to alternative path:', err)
        )
      ]);

      setSuccess('Évaluation enregistrée avec succès');
      setIsEvaluated(true);
    } catch (err) {
      console.error('Error saving evaluation:', err);
      setError(err instanceof Error ? err.message : 'Failed to save evaluation');
    } finally {
      setSaving(false);
    }
  };

  const handleAIEvaluation = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting AI evaluation with dialogues:', {
        firstCall: firstCallLines,
        secondCall: secondCallLines
      });

      const evaluation = await AIService.evaluateGoalkeeperExercise(
        firstCallLines,
        secondCallLines
      );

      console.log('Received AI evaluation:', evaluation);

      // Mettre à jour les feedbacks avec les commentaires de l'IA
      const newFeedbacks = { ...feedbacks };
      evaluation.lineComments.forEach(({ lineId, comment }) => {
        const numericLineId = parseInt(lineId.toString());
        if (numericLineId < firstCallLines.length) {
          newFeedbacks[`first_${numericLineId}`] = comment;
        } else {
          const secondCallIndex = numericLineId - firstCallLines.length;
          newFeedbacks[`second_${secondCallIndex}`] = comment;
        }
      });
      setFeedbacks(newFeedbacks);

      // Mettre à jour les critères avec l'évaluation de l'IA
      const newCriteriaFeedbacks = { ...criteriaFeedbacks };
      evaluation.criteria.forEach((criterion, index) => {
        newCriteriaFeedbacks[`criterion_${index}`] = criterion.feedback || '';
      });
      setCriteriaFeedbacks(newCriteriaFeedbacks);

      // Mettre à jour les scores
      const newCriteria = criteria.map((criterion, index) => ({
        ...criterion,
        score: evaluation.criteria[index].score || 0
      }));
      setCriteria(newCriteria);

      // Mettre à jour le feedback global
      setGlobalFeedback(evaluation.feedback);

      setSuccess("L'IA a terminé son évaluation. Vous pouvez maintenant revoir et ajuster ses commentaires.");
    } catch (err) {
      console.error('Error during AI evaluation:', err);
      setError("Une erreur est survenue lors de l'évaluation par l'IA");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (index: number, score: number) => {
    const newCriteria = [...criteria];
    newCriteria[index] = {
      ...newCriteria[index],
      score
    };
    setCriteria(newCriteria);
  };

  const handleCriterionFeedbackChange = (index: number, feedback: string) => {
    setCriteriaFeedbacks({
      ...criteriaFeedbacks,
      [`criterion_${index}`]: feedback
    });
  };

  const handleFeedbackChange = (isSecondCall: boolean, index: number, feedback: string) => {
    setFeedbacks({
      ...feedbacks,
      [`${isSecondCall ? 'second' : 'first'}_${index}`]: feedback
    });
  };

  const handleSubCriteriaScoreChange = (criterionIndex: number, subIndex: number, score: number) => {
    const newCriteria = [...criteria];
    if (newCriteria[criterionIndex].subCriteria) {
      newCriteria[criterionIndex].subCriteria![subIndex].score = score;
      // Mettre à jour le score du critère principal
      const totalSubScore = newCriteria[criterionIndex].subCriteria!.reduce(
        (total, sub) => total + (sub.score || 0), 
        0
      );
      newCriteria[criterionIndex].score = totalSubScore;
    }
    setCriteria(newCriteria);
  };

  const handleDialogueFeedbackChange = (index: number, feedback: string) => {
    const newDialogueLines = [...firstCallLines, ...secondCallLines];
    const lineId = parseInt(newDialogueLines[index].id);
    if (lineId <= firstCallTemplate.length + secondCallTemplate.length) {
      newDialogueLines[index] = {
        ...newDialogueLines[index],
        feedback
      };
      setFirstCallLines(newDialogueLines.slice(0, firstCallTemplate.length));
      setSecondCallLines(newDialogueLines.slice(firstCallTemplate.length));
    }
  };

  const handleDialogueTextChange = (index: number, text: string) => {
    const newDialogueLines = [...firstCallLines, ...secondCallLines];
    const lineId = parseInt(newDialogueLines[index].id);
    if (lineId <= firstCallTemplate.length + secondCallTemplate.length) {
      newDialogueLines[index] = {
        ...newDialogueLines[index],
        text
      };
      setFirstCallLines(newDialogueLines.slice(0, firstCallTemplate.length));
      setSecondCallLines(newDialogueLines.slice(firstCallTemplate.length));
    }
  };

  const renderSubCriteria = (criterion: GoalkeeperScoringCriteria, index: number) => {
    if (!criterion.subCriteria) return null;
    
    return (
      <div className="ml-6 space-y-2">
        {criterion.subCriteria.map((sub: SubCriterion, subIndex: number) => (
          <div key={`${criterion.id}_${sub.id}`} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{sub.name}</span>
            <input
              type="number"
              min="0"
              max={sub.maxPoints}
              value={sub.score}
              onChange={(e) => handleSubCriteriaScoreChange(index, subIndex, Number(e.target.value))}
              className="w-16 p-1 border rounded"
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton />
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Statut de correction */}
      {isSubmitted && (
        <div className={`mb-4 p-4 rounded-lg ${
          isEvaluated ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <p className={`text-lg font-medium ${
            isEvaluated ? 'text-green-800' : 'text-yellow-800'
          }`}>
            {isEvaluated 
              ? "✓ Votre exercice a été corrigé par le formateur" 
              : "⏳ Votre exercice a été soumis et est en attente de correction"}
          </p>
        </div>
      )}

      {/* Boutons d'action pour le formateur */}
      {isEvaluationMode && (
        <div className="flex justify-end space-x-4 mb-6">
          <button
            onClick={handleAIEvaluation}
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Évaluation en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                Évaluer avec l'IA
              </>
            )}
          </button>
          <button
            onClick={handleSaveEvaluation}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer l\'évaluation'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Premier appel */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Premier appel</h2>
            <div className="space-y-4">
              {firstCallLines.map((line, index) => (
                <div key={`first_${index}`} className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <div className={`text-sm font-medium ${
                      line.speaker === 'goalkeeper' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {line.speaker === 'goalkeeper' ? 'Goalkeeper' : 'Commercial'}
                    </div>
                    <span className="text-sm text-gray-500">
                      Ligne {index + 1}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="p-2 bg-gray-50 rounded-md">{line.text}</p>
                    </div>
                    <div>
                      {isEvaluationMode ? (
                        <textarea
                          value={feedbacks[`first_${index}`] || ''}
                          onChange={(e) => handleFeedbackChange(false, index, e.target.value)}
                          placeholder="Commentaires du formateur..."
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-yellow-50"
                          rows={3}
                        />
                      ) : (
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-md min-h-[80px]">
                          {feedbacks[`first_${index}`] ? (
                            <>
                              <p className="text-sm font-medium text-gray-700 mb-1">Commentaire du formateur :</p>
                              <p className="text-gray-600">{feedbacks[`first_${index}`]}</p>
                            </>
                          ) : (
                            <p className="text-gray-400 italic">En attente du commentaire du formateur</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deuxième appel */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Deuxième appel</h2>
            <div className="space-y-4">
              {secondCallLines.map((line, index) => (
                <div key={`second_${index}`} className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <div className={`text-sm font-medium ${
                      line.speaker === 'goalkeeper' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {line.speaker === 'goalkeeper' ? 'Goalkeeper' : 'Commercial'}
                    </div>
                    <span className="text-sm text-gray-500">
                      Ligne {index + 1}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="p-2 bg-gray-50 rounded-md">{line.text}</p>
                    </div>
                    <div>
                      {isEvaluationMode ? (
                        <textarea
                          value={feedbacks[`second_${index}`] || ''}
                          onChange={(e) => handleFeedbackChange(true, index, e.target.value)}
                          placeholder="Commentaires du formateur..."
                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-yellow-50"
                          rows={3}
                        />
                      ) : (
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-md min-h-[80px]">
                          {feedbacks[`second_${index}`] ? (
                            <>
                              <p className="text-sm font-medium text-gray-700 mb-1">Commentaire du formateur :</p>
                              <p className="text-gray-600">{feedbacks[`second_${index}`]}</p>
                            </>
                          ) : (
                            <p className="text-gray-400 italic">En attente du commentaire du formateur</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grille d'évaluation */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Critères d'évaluation</h2>
            <div className="space-y-6">
              {criteria.map((criterion, index) => (
                <div key={index} className="border-b pb-4">
                  <h3 className="font-medium text-lg mb-2">{criterion.name}</h3>
                  <p className="text-gray-600 mb-2">{criterion.description}</p>
                  
                  {/* Sous-critères */}
                  <div className="mb-4 pl-4 border-l-2 border-gray-200">
                    {criterion.subCriteria && renderSubCriteria(criterion, index)}
                    <p className="text-sm text-gray-500 mt-2">
                      Total maximum : {criterion.maxPoints} points
                    </p>
                  </div>

                  {isEvaluationMode ? (
                    <>
                      <div className="flex items-center gap-4 mb-2">
                        <label className="text-sm font-medium">Score :</label>
                        <input
                          type="number"
                          value={criterion.score || 0}
                          onChange={(e) => handleScoreChange(index, Number(e.target.value))}
                          min="0"
                          max={criterion.maxPoints}
                          step="0.5"
                          className="w-20 p-1 border rounded"
                        />
                        <span className="text-sm text-gray-500">/ {criterion.maxPoints} points</span>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Commentaires :</label>
                        <textarea
                          value={criteriaFeedbacks[`criterion_${index}`] || ''}
                          onChange={(e) => handleCriterionFeedbackChange(index, e.target.value)}
                          placeholder="Ajouter un commentaire..."
                          className="w-full mt-1 p-2 border rounded-md"
                          rows={2}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 mb-2">
                        <label className="text-sm font-medium">Score obtenu :</label>
                        <span className="text-lg font-medium">
                          {criterion.score !== undefined ? criterion.score : '-'} / {criterion.maxPoints} points
                        </span>
                      </div>
                      <div className="p-2 bg-gray-50 border border-gray-200 rounded-md min-h-[60px]">
                        {criteriaFeedbacks[`criterion_${index}`] ? (
                          <>
                            <p className="text-sm font-medium text-gray-700 mb-1">Commentaire du formateur :</p>
                            <p className="text-gray-600">{criteriaFeedbacks[`criterion_${index}`]}</p>
                          </>
                        ) : (
                          <p className="text-gray-400 italic">En attente du commentaire du formateur</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Feedback global */}
            <div className="mt-6">
              <h3 className="font-medium text-lg mb-2">Feedback global</h3>
              {isEvaluationMode ? (
                <textarea
                  value={globalFeedback}
                  onChange={(e) => setGlobalFeedback(e.target.value)}
                  placeholder="Ajouter un feedback global..."
                  className="w-full p-2 border rounded-md"
                  rows={4}
                />
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-md min-h-[100px]">
                  {globalFeedback ? (
                    <p className="text-gray-600">{globalFeedback}</p>
                  ) : (
                    <p className="text-gray-400 italic">En attente du feedback global du formateur</p>
                  )}
                </div>
              )}
            </div>

            {/* Score total */}
            <div className="mt-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="font-medium text-lg mb-2">Score total</h3>
                <p className="text-xl font-medium text-blue-800">
                  {criteria.some(c => c.score !== undefined) 
                    ? `${calculateFinalScore(criteria).scaled.toFixed(2)} / 20`
                    : "En attente de l'évaluation"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
