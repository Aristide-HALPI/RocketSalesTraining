import { useEffect, useState, useCallback, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  troisClesService, 
  type TroisClesExercise,
  type Score
} from '../features/trois-cles/services/troisClesService';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';

// Types pour les évaluations locales
interface LocalEvaluation {
  score: Score;
  comment: string;
}

interface LocalEvaluations {
  [key: string]: LocalEvaluation;
}

// Composant séparé pour ScoreAndComment
const ScoreAndCommentComponent = memo(({ 
  initialScore = 0 as Score,
  initialComment = '',
  disabled,
  onScoreChange,
  onCommentChange
}: {
  initialScore?: Score;
  initialComment?: string;
  disabled?: boolean;
  onScoreChange: (score: Score) => void;
  onCommentChange: (comment: string) => void;
}) => {
  const [score, setScore] = useState<Score>(initialScore);
  const [comment, setComment] = useState(initialComment);

  // Mettre à jour l'état local si les props changent
  useEffect(() => {
    setScore(initialScore);
    setComment(initialComment);
  }, [initialScore, initialComment]);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center space-x-2">
        <select
          value={score}
          onChange={(e) => {
            const newScore = parseInt(e.target.value) as Score;
            setScore(newScore);
            onScoreChange(newScore);
          }}
          className="block w-24 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-gray-900"
          disabled={disabled}
        >
          <option value={0}>0</option>
          <option value={1}>1</option>
        </select>
      </div>
      <textarea
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          onCommentChange(e.target.value);
        }}
        placeholder="Commentaire..."
        className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        rows={2}
        disabled={disabled}
      />
    </div>
  );
});

ScoreAndCommentComponent.displayName = 'ScoreAndCommentComponent';

export default function Cles() {
  const [searchParams] = useSearchParams();
  const { currentUser, userProfile } = useAuth();
  const [exercise, setExercise] = useState<TroisClesExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [localEvaluations, setLocalEvaluations] = useState<LocalEvaluations>({});
  const [loadingAI, setLoadingAI] = useState<{
    explicite: boolean;
    evocatrice: boolean;
    projective: boolean;
  }>({
    explicite: false,
    evocatrice: false,
    projective: false,
  });

  const targetUserId = searchParams.get('userId') || currentUser?.uid || '';
  const isTrainer = userProfile?.role === 'trainer';
  const isAdmin = userProfile?.role === 'admin';

  const isSubmitted = () => {
    return exercise?.status === 'submitted' || exercise?.status === 'evaluated';
  };

  const canEvaluateWithAI = () => {
    return (isTrainer || isAdmin) && exercise?.status === 'submitted';
  };

  useEffect(() => {
    const loadExercise = async () => {
      try {
        const loadedExercise = await troisClesService.getExercise(targetUserId);
        console.log('Loaded exercise:', loadedExercise);
        console.log('Exercise status:', loadedExercise?.status);
        console.log('Exercise sections:', loadedExercise?.sections);
        console.log('Questions projectives:', loadedExercise?.sections?.[4]?.questionsProjectives);
        setExercise(loadedExercise);

        // Charger les évaluations locales depuis le localStorage
        const savedEvaluation = localStorage.getItem(`evaluation_${targetUserId}`);
        if (savedEvaluation) {
          setLocalEvaluations(JSON.parse(savedEvaluation));
        }
      } catch (error) {
        console.error('Error loading exercise:', error);
      } finally {
        setLoading(false);
      }
    };

    if (targetUserId) {
      loadExercise();
    }
  }, [targetUserId]);

  // Sauvegarder les évaluations locales
  useEffect(() => {
    if (Object.keys(localEvaluations).length > 0) {
      localStorage.setItem(`evaluation_${targetUserId}`, JSON.stringify(localEvaluations));
    }
  }, [localEvaluations, targetUserId]);

  const handleSubmit = async () => {
    if (!exercise) return;
    try {
      await troisClesService.submitExercise(exercise.id);
      const updatedExercise = await troisClesService.getExercise(exercise.id);
      console.log('Exercise after submit:', updatedExercise);
      setExercise(updatedExercise);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Une erreur est survenue lors de la soumission');
      }
    }
  };

  const handlePublishEvaluation = useCallback(async () => {
    if (!exercise) return;

    const updatedExercise = { ...exercise };
    
    Object.entries(localEvaluations).forEach(([key, evaluation]) => {
      const [type, index, subType] = key.split('-');
      const idx = Number(index);

      if (type === 'explicite' && updatedExercise.sections[0]?.questionsExplicites) {
        const question = updatedExercise.sections[0].questionsExplicites[idx];
        if (question) {
          question.score = evaluation.score;
          question.trainerComment = evaluation.comment;
        }
      } else if (type === 'evocatrice' && updatedExercise.sections[1]?.questionsEvocatrices) {
        const question = updatedExercise.sections[1].questionsEvocatrices[idx];
        if (question) {
          if (subType === 'passe') {
            question.scoresPasse = evaluation.score;
            question.commentPasse = evaluation.comment;
          } else if (subType === 'present') {
            question.scoresPresent = evaluation.score;
            question.commentPresent = evaluation.comment;
          } else if (subType === 'futur') {
            question.scoresFutur = evaluation.score;
            question.commentFutur = evaluation.comment;
          }
        }
      } else if (type === 'impacts' && updatedExercise.sections[2]?.impactsTemporels) {
        updatedExercise.sections[2].impactsTemporels.score = evaluation.score;
        updatedExercise.sections[2].impactsTemporels.trainerComment = evaluation.comment;
      } else if (type === 'besoins' && updatedExercise.sections[3]?.besoinsSolution) {
        updatedExercise.sections[3].besoinsSolution.score = evaluation.score;
        updatedExercise.sections[3].besoinsSolution.trainerComment = evaluation.comment;
      } else if (type === 'projective' && updatedExercise.sections[4]?.questionsProjectives) {
        const question = updatedExercise.sections[4].questionsProjectives[idx];
        if (question) {
          // Créer une copie avec les valeurs par défaut
          const updatedQuestion = {
            ...question,
            scores: {
              question: 0 as Score,
              reponseClient: 0 as Score,
              confirmation: 0 as Score,
              impacts: 0 as Score,
              besoinSolution: 0 as Score,
              ...(question.scores || {})
            },
            comments: {
              question: '',
              reponseClient: '',
              confirmation: '',
              impacts: '',
              besoinSolution: '',
              ...(question.comments || {})
            }
          };

          const { score, comment } = evaluation;
          
          if (subType === 'question') {
            updatedQuestion.scores.question = score;
            updatedQuestion.comments.question = comment;
          } else if (subType === 'reponseClient') {
            updatedQuestion.scores.reponseClient = score;
            updatedQuestion.comments.reponseClient = comment;
          } else if (subType === 'confirmation') {
            updatedQuestion.scores.confirmation = score;
            updatedQuestion.comments.confirmation = comment;
          } else if (subType === 'impacts') {
            updatedQuestion.scores.impacts = score;
            updatedQuestion.comments.impacts = comment;
          } else if (subType === 'besoinSolution') {
            updatedQuestion.scores.besoinSolution = score;
            updatedQuestion.comments.besoinSolution = comment;
          }
          
          updatedExercise.sections[4].questionsProjectives[idx] = updatedQuestion;
        }
      }
    });

    try {
      await troisClesService.updateExercise(targetUserId, updatedExercise);
      setLocalEvaluations({});
      localStorage.removeItem(`evaluation_${targetUserId}`);
    } catch (error) {
      console.error('Error publishing evaluation:', error);
    }
  }, [exercise, localEvaluations, targetUserId]);

  const handleAIEvaluation = async (sectionType: 'explicite' | 'evocatrice' | 'projective') => {
    if (!exercise) return;
    
    try {
      setLoadingAI(prev => ({ ...prev, [sectionType]: true }));
      
      // Créer une version modifiée de l'exercice avec uniquement la section demandée
      const evaluationExercise = { ...exercise };
      
      // Filtrer les sections en fonction du type
      switch (sectionType) {
        case 'explicite':
          evaluationExercise.sections = [exercise.sections[0]];
          break;
        case 'evocatrice':
          evaluationExercise.sections = [exercise.sections[1]];
          break;
        case 'projective':
          evaluationExercise.sections = [exercise.sections[4]];
          break;
      }

      // Appeler le service d'évaluation avec la section filtrée
      await troisClesService.evaluateWithAI(targetUserId, evaluationExercise);
      
      // Recharger l'exercice pour obtenir les résultats de l'évaluation
      const updatedExercise = await troisClesService.getExercise(targetUserId);
      setExercise(updatedExercise);
    } catch (error) {
      console.error('Erreur lors de l\'évaluation IA:', error);
      alert('Une erreur est survenue lors de l\'évaluation par l\'IA');
    } finally {
      setLoadingAI(prev => ({ ...prev, [sectionType]: false }));
    }
  };

  const isAnswerDisabled = useCallback(() => {
    if (!exercise) return true;
    if (isTrainer || isAdmin) return true;  // Les formateurs et admins ne peuvent pas modifier les réponses
    return isSubmitted();
  }, [exercise, isTrainer, isAdmin]);

  const isEvaluationDisabled = useCallback(() => {
    if (!exercise) return true;
    return !(isTrainer || isAdmin);  // Les formateurs et admins peuvent toujours évaluer
  }, [exercise, isTrainer, isAdmin]);

  const canSubmit = useCallback(() => {
    if (!exercise) return false;
    if (isSubmitted()) return false;
    
    // Vérifier si au moins une réponse a été donnée dans chaque section
    const hasExplicites = exercise.sections[0]?.questionsExplicites?.some(q => q.text?.trim());
    const hasEvocatrices = exercise.sections[1]?.questionsEvocatrices?.some(q => 
      q.passe?.trim() || q.present?.trim() || q.futur?.trim()
    );
    const hasImpacts = exercise.sections[2]?.impactsTemporels?.text?.trim();
    const hasBesoins = exercise.sections[3]?.besoinsSolution?.text?.trim();
    const hasProjectives = exercise.sections[4]?.questionsProjectives?.some(q => 
      q.question?.trim() || q.reponseClient?.trim() || q.confirmation?.trim() || 
      q.impacts?.trim() || q.besoinSolution?.trim()
    );

    return !!(hasExplicites || hasEvocatrices || hasImpacts || hasBesoins || hasProjectives);
  }, [exercise]);

  const initializeQuestionProjective = (question: any): any => {
    const initializedQuestion = {
      ...question,
      question: question.question || '',
      reponseClient: question.reponseClient || '',
      confirmation: question.confirmation || '',
      impacts: question.impacts || '',
      besoinSolution: question.besoinSolution || '',
      scores: {
        question: 0 as Score,
        reponseClient: 0 as Score,
        confirmation: 0 as Score,
        impacts: 0 as Score,
        besoinSolution: 0 as Score,
        ...(question.scores || {})
      },
      comments: {
        question: '',
        reponseClient: '',
        confirmation: '',
        impacts: '',
        besoinSolution: '',
        ...(question.comments || {})
      }
    };
    return initializedQuestion;
  };

  const handleQuestionProjectiveChange = (index: number, field: string, value: string) => {
    if (!exercise) return;

    const newExercise = { ...exercise };
    const section = newExercise.sections[4] || {
      id: 'questions_projectives',
      title: 'Questions Projectives',
      description: 'Questions projectives pour explorer les possibilités',
      questionsProjectives: []
    };
    
    if (!section.questionsProjectives) {
      section.questionsProjectives = [];
    }

    const emptyQuestion: any = {
      question: '',
      reponseClient: '',
      confirmation: '',
      impacts: '',
      besoinSolution: '',
      scores: {
        question: 0 as Score,
        reponseClient: 0 as Score,
        confirmation: 0 as Score,
        impacts: 0 as Score,
        besoinSolution: 0 as Score
      },
      comments: {
        question: '',
        reponseClient: '',
        confirmation: '',
        impacts: '',
        besoinSolution: ''
      }
    };

    if (!section.questionsProjectives[index]) {
      section.questionsProjectives[index] = emptyQuestion;
    }

    const question = initializeQuestionProjective(section.questionsProjectives[index]);
    question[field] = value;
    section.questionsProjectives[index] = question;
    newExercise.sections[4] = section;

    updateExerciseAndStatus(newExercise);
  };

  const updateExerciseAndStatus = useCallback(async (updatedExercise: TroisClesExercise | null) => {
    if (!updatedExercise) return;
    
    // Mettre à jour le statut en fonction du contenu
    const hasContent = updatedExercise.sections.some(section => {
      const hasExplicites = section.questionsExplicites?.some(q => q.text?.trim());
      const hasEvocatrices = section.questionsEvocatrices?.some(q => 
        q.passe?.trim() || q.present?.trim() || q.futur?.trim()
      );
      const hasImpacts = section.impactsTemporels?.text?.trim();
      const hasBesoins = section.besoinsSolution?.text?.trim();
      const hasProjectives = section.questionsProjectives?.some(q => 
        q.question?.trim() || q.reponseClient?.trim() || q.confirmation?.trim() || 
        q.impacts?.trim() || q.besoinSolution?.trim()
      );
      return !!(hasExplicites || hasEvocatrices || hasImpacts || hasBesoins || hasProjectives);
    });

    const newStatus = hasContent ? 'in_progress' : 'not_started';
    if (updatedExercise.status !== 'submitted' && updatedExercise.status !== 'evaluated') {
      updatedExercise.status = newStatus;
    }
    
    setExercise(updatedExercise);
    
    try {
      await troisClesService.updateExercise(updatedExercise.id, updatedExercise);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'exercice:', error);
    }
  }, []);

  const updateLocalEvaluations = useCallback((type: string, index: number, subType: string | null, evaluation: LocalEvaluation) => {
    const key = `${type}_${index}${subType ? `_${subType}` : ''}`;
    setLocalEvaluations(prev => ({
      ...prev,
      [key]: evaluation
    }));

    if (!exercise) return;
    
    const updatedExercise = { ...exercise };
    if (type === 'projective' && updatedExercise?.sections?.[4]?.questionsProjectives) {
      const idx = parseInt(index.toString());
      if (!isNaN(idx)) {
        const question = updatedExercise.sections[4].questionsProjectives[idx];
        if (question) {
          // Créer une copie avec les valeurs par défaut
          const updatedQuestion = {
            ...question,
            scores: {
              question: 0 as Score,
              reponseClient: 0 as Score,
              confirmation: 0 as Score,
              impacts: 0 as Score,
              besoinSolution: 0 as Score,
              ...(question.scores || {})
            },
            comments: {
              question: '',
              reponseClient: '',
              confirmation: '',
              impacts: '',
              besoinSolution: '',
              ...(question.comments || {})
            }
          };

          const { score, comment } = evaluation;
          
          if (subType === 'question') {
            updatedQuestion.scores.question = score;
            updatedQuestion.comments.question = comment;
          } else if (subType === 'reponseClient') {
            updatedQuestion.scores.reponseClient = score;
            updatedQuestion.comments.reponseClient = comment;
          } else if (subType === 'confirmation') {
            updatedQuestion.scores.confirmation = score;
            updatedQuestion.comments.confirmation = comment;
          } else if (subType === 'impacts') {
            updatedQuestion.scores.impacts = score;
            updatedQuestion.comments.impacts = comment;
          } else if (subType === 'besoinSolution') {
            updatedQuestion.scores.besoinSolution = score;
            updatedQuestion.comments.besoinSolution = comment;
          }
          
          updatedExercise.sections[4].questionsProjectives[idx] = updatedQuestion;
        }
      }
    }
    updateExerciseAndStatus(updatedExercise);
  }, [exercise, updateExerciseAndStatus]);

  const renderScoreAndComment = useCallback((type: string, index: number, subType: string | null, score: Score | undefined, comment: string | undefined) => {
    if (!isTrainer && !isAdmin) return null;  // Ne pas afficher les contrôles d'évaluation pour les non-formateurs/non-admins

    const key = `${type}_${index}${subType ? `_${subType}` : ''}`;
    const evaluation = localEvaluations[key] || { score: score || 0 as Score, comment: comment || '' };

    return (
      <ScoreAndCommentComponent
        key={key}
        initialScore={evaluation.score}
        initialComment={evaluation.comment}
        disabled={isEvaluationDisabled()}
        onScoreChange={(newScore) => updateLocalEvaluations(type, index, subType, { ...evaluation, score: newScore })}
        onCommentChange={(newComment) => updateLocalEvaluations(type, index, subType, { ...evaluation, comment: newComment })}
      />
    );
  }, [isTrainer, isAdmin, localEvaluations, isEvaluationDisabled, updateLocalEvaluations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Impossible de charger l'exercice.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* En-tête */}
        <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Les 3 Clés</h1>
          <p className="text-sm text-gray-600">
            Simulez un appel téléphonique pour obtenir un rendez-vous avec un décideur. Remplissez chaque section avec vos réponses.
          </p>
        </div>

        {/* Score et Statut */}
        <div className="bg-gradient-to-r from-purple-100 via-blue-100 to-green-100 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/80 backdrop-blur rounded-lg p-4">
              <p className="text-sm text-gray-600">Votre score</p>
              <p className="font-semibold">-</p>
              <p className="text-xs text-gray-500">(max 50 points)</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg p-4">
              <p className="text-sm text-gray-600">Statut de l'exercice</p>
              <span className={`px-2 py-1 text-sm font-semibold rounded ${
                exercise?.status === 'not_started' ? 'bg-gray-100 text-gray-600' :
                exercise?.status === 'in_progress' ? 'bg-yellow-100 text-yellow-600' :
                exercise?.status === 'submitted' ? 'bg-blue-100 text-blue-600' :
                exercise?.status === 'evaluated' ? 'bg-green-100 text-green-600' :
                exercise?.status === 'pending_validation' ? 'bg-blue-100 text-blue-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {exercise?.status === 'not_started' ? 'À débuter' :
                 exercise?.status === 'in_progress' ? 'En cours' :
                 exercise?.status === 'submitted' ? 'Soumis' :
                 exercise?.status === 'evaluated' ? 'Évalué' :
                 exercise?.status === 'pending_validation' ? 'En attente de validation' :
                 'À débuter'}
              </span>
            </div>
          </div>
        </div>

        {/* Mode Formateur */}
        {(isTrainer || isAdmin) && (
          <div className="bg-blue-50 shadow-sm rounded-lg p-4 mb-6">
            <div className="flex flex-col space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Mode Formateur</h2>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => handleAIEvaluation('explicite')}
                  className="bg-violet-600 text-white hover:bg-violet-700 relative"
                  disabled={loading || !canEvaluateWithAI() || loadingAI.explicite}
                >
                  {loadingAI.explicite ? (
                    <>
                      <span className="opacity-0">Évaluer Problèmes Explicites</span>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      </div>
                    </>
                  ) : (
                    'Évaluer Problèmes Explicites'
                  )}
                </Button>
                <Button
                  onClick={() => handleAIEvaluation('evocatrice')}
                  className="bg-violet-600 text-white hover:bg-violet-700 relative"
                  disabled={loading || !canEvaluateWithAI() || loadingAI.evocatrice}
                >
                  {loadingAI.evocatrice ? (
                    <>
                      <span className="opacity-0">Évaluer Questions Évocatrices</span>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      </div>
                    </>
                  ) : (
                    'Évaluer Questions Évocatrices'
                  )}
                </Button>
                <Button
                  onClick={() => handleAIEvaluation('projective')}
                  className="bg-violet-600 text-white hover:bg-violet-700 relative"
                  disabled={loading || !canEvaluateWithAI() || loadingAI.projective}
                >
                  {loadingAI.projective ? (
                    <>
                      <span className="opacity-0">Évaluer Questions Projectives</span>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      </div>
                    </>
                  ) : (
                    'Évaluer Questions Projectives'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Contenu principal */}
        <div className="space-y-8">
          {/* Problème Explicite */}
          <section className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-600 mb-4">Problème Explicite</h2>
            <div className="space-y-1 text-sm text-gray-600 mb-6">
              <p>Posez 3 questions ouvertes de Problème Explicites</p>
              <p>2 questions fermées de Problème Explicites</p>
              <p>Posez 1 question d'Impacts</p>
              <p>Posez 1 question de Besoin de Solution</p>
            </div>

            <div className="space-y-4">
              {exercise?.sections[0].questionsExplicites?.map((question, index) => (
                <div key={index} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Question {index < 3 ? 'ouverte' : index < 5 ? 'fermée' : index === 5 ? "d'impacts" : 'de Besoin de Solution'}
                  </label>
                  <Textarea
                    value={question.text || ''}
                    onChange={(e) => {
                      const newExercise = { ...exercise };
                      if (!newExercise.sections) {
                        newExercise.sections = [];
                      }
                      if (!newExercise.sections[0]) {
                        newExercise.sections[0] = {
                          id: 'questions_explicites',
                          title: 'Questions Explicites',
                          description: 'Questions explicites pour comprendre le contexte',
                          questionsExplicites: []
                        };
                      }
                      if (!newExercise.sections[0].questionsExplicites) {
                        newExercise.sections[0].questionsExplicites = [];
                      }
                      if (!newExercise.sections[0].questionsExplicites[index]) {
                        newExercise.sections[0].questionsExplicites[index] = {
                          text: '',
                          score: 0 as Score,
                          trainerComment: ''
                        };
                      }
                      newExercise.sections[0].questionsExplicites[index].text = e.target.value;
                      updateExerciseAndStatus(newExercise);
                    }}
                    className={`w-full min-h-[80px] resize-none rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900`}
                    placeholder="Votre question..."
                    disabled={isAnswerDisabled()}
                  />
                  {renderScoreAndComment('explicite', index, null, question.score, question.trainerComment)}
                </div>
              ))}
            </div>
          </section>

          {/* Problème Évocatrice */}
          <section className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-600 mb-4">Problème Évocatrice</h2>
            <div className="space-y-1 text-sm text-gray-600 mb-6">
              <p>Posez 2 questions de Problème Évocatrices pour chaque colonne: Passé + Actuel + Futur (6 au total)</p>
              <p>Posez 1 question d'Impacts</p>
              <p>Posez 1 question de Besoin de Solution</p>
            </div>

            {exercise?.sections[1].questionsEvocatrices?.map((question, index) => (
              <div key={index} className="mb-8">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Question Évocatrice {index + 1}</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Passé</label>
                    <Textarea
                      value={question?.passe || ''}
                      onChange={(e) => {
                        if (!exercise) return;
                        const newExercise = { ...exercise };
                        if (!newExercise.sections[1]) {
                          newExercise.sections[1] = {
                            id: 'questions_evocatrices',
                            title: 'Questions Évocatrices',
                            description: 'Questions pour évoquer les situations',
                            questionsEvocatrices: []
                          };
                        }
                        if (!newExercise.sections[1].questionsEvocatrices) {
                          newExercise.sections[1].questionsEvocatrices = [];
                        }
                        if (!newExercise.sections[1].questionsEvocatrices[index]) {
                          newExercise.sections[1].questionsEvocatrices[index] = {
                            passe: '',
                            present: '',
                            futur: '',
                            scoresPasse: 0 as Score,
                            scoresPresent: 0 as Score,
                            scoresFutur: 0 as Score,
                            commentPasse: '',
                            commentPresent: '',
                            commentFutur: ''
                          };
                        }
                        newExercise.sections[1].questionsEvocatrices[index].passe = e.target.value;
                        updateExerciseAndStatus(newExercise);
                      }}
                      className={`w-full min-h-[80px] resize-vertical rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900`}
                      placeholder="Question sur le passé..."
                      disabled={isAnswerDisabled()}
                    />
                    {renderScoreAndComment(
                      'evocatrice',
                      index,
                      'passe',
                      question?.scoresPasse || 0 as Score,
                      question?.commentPasse || ''
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Présent</label>
                    <Textarea
                      value={question?.present || ''}
                      onChange={(e) => {
                        if (!exercise) return;
                        const newExercise = { ...exercise };
                        if (!newExercise.sections[1]) {
                          newExercise.sections[1] = {
                            id: 'questions_evocatrices',
                            title: 'Questions Évocatrices',
                            description: 'Questions pour évoquer les situations',
                            questionsEvocatrices: []
                          };
                        }
                        if (!newExercise.sections[1].questionsEvocatrices) {
                          newExercise.sections[1].questionsEvocatrices = [];
                        }
                        if (!newExercise.sections[1].questionsEvocatrices[index]) {
                          newExercise.sections[1].questionsEvocatrices[index] = {
                            passe: '',
                            present: '',
                            futur: '',
                            scoresPasse: 0 as Score,
                            scoresPresent: 0 as Score,
                            scoresFutur: 0 as Score,
                            commentPasse: '',
                            commentPresent: '',
                            commentFutur: ''
                          };
                        }
                        newExercise.sections[1].questionsEvocatrices[index].present = e.target.value;
                        updateExerciseAndStatus(newExercise);
                      }}
                      className={`w-full min-h-[80px] resize-vertical rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900`}
                      placeholder="Question sur le présent..."
                      disabled={isAnswerDisabled()}
                    />
                    {renderScoreAndComment(
                      'evocatrice',
                      index,
                      'present',
                      question?.scoresPresent || 0 as Score,
                      question?.commentPresent || ''
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Futur</label>
                    <Textarea
                      value={question?.futur || ''}
                      onChange={(e) => {
                        if (!exercise) return;
                        const newExercise = { ...exercise };
                        if (!newExercise.sections[1]) {
                          newExercise.sections[1] = {
                            id: 'questions_evocatrices',
                            title: 'Questions Évocatrices',
                            description: 'Questions pour évoquer les situations',
                            questionsEvocatrices: []
                          };
                        }
                        if (!newExercise.sections[1].questionsEvocatrices) {
                          newExercise.sections[1].questionsEvocatrices = [];
                        }
                        if (!newExercise.sections[1].questionsEvocatrices[index]) {
                          newExercise.sections[1].questionsEvocatrices[index] = {
                            passe: '',
                            present: '',
                            futur: '',
                            scoresPasse: 0 as Score,
                            scoresPresent: 0 as Score,
                            scoresFutur: 0 as Score,
                            commentPasse: '',
                            commentPresent: '',
                            commentFutur: ''
                          };
                        }
                        newExercise.sections[1].questionsEvocatrices[index].futur = e.target.value;
                        updateExerciseAndStatus(newExercise);
                      }}
                      className={`w-full min-h-[80px] resize-vertical rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900`}
                      placeholder="Question sur le futur..."
                      disabled={isAnswerDisabled()}
                    />
                    {renderScoreAndComment(
                      'evocatrice',
                      index,
                      'futur',
                      question?.scoresFutur || 0 as Score,
                      question?.commentFutur || ''
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Questions d'impacts */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Question d'Impacts</h3>
              <div>
                <Textarea
                  value={exercise?.sections?.[2]?.impactsTemporels?.text || ''}
                  onChange={(e) => {
                    if (!exercise) return;
                    const newExercise = { ...exercise };
                    if (!newExercise.sections[2]) {
                      newExercise.sections[2] = {
                        id: 'impacts',
                        title: 'Impacts',
                        description: 'Questions sur les impacts',
                        impactsTemporels: {
                          text: '',
                          score: 0 as Score,
                          trainerComment: ''
                        }
                      };
                    }
                    if (!newExercise.sections[2].impactsTemporels) {
                      newExercise.sections[2].impactsTemporels = {
                        text: '',
                        score: 0 as Score,
                        trainerComment: ''
                      };
                    }
                    newExercise.sections[2].impactsTemporels.text = e.target.value;
                    updateExerciseAndStatus(newExercise);
                  }}
                  className={`w-full min-h-[80px] resize-vertical rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900`}
                  placeholder="Décrivez les impacts..."
                  disabled={isAnswerDisabled()}
                />
              </div>
              {renderScoreAndComment(
                'impacts',
                0,
                null,
                exercise?.sections?.[2]?.impactsTemporels?.score || 0 as Score,
                exercise?.sections?.[2]?.impactsTemporels?.trainerComment || ''
              )}
            </div>

            {/* Questions de Besoin de Solution */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Question de Besoin de Solution</h3>
              <div>
                <Textarea
                  value={exercise?.sections?.[3]?.besoinsSolution?.text || ''}
                  onChange={(e) => {
                    if (!exercise) return;
                    const newExercise = { ...exercise };
                    if (!newExercise.sections[3]) {
                      newExercise.sections[3] = {
                        id: 'besoins_solution',
                        title: 'Besoins de Solution',
                        description: 'Questions sur les besoins de solution',
                        besoinsSolution: {
                          text: '',
                          score: 0 as Score,
                          trainerComment: ''
                        }
                      };
                    }
                    if (!newExercise.sections[3].besoinsSolution) {
                      newExercise.sections[3].besoinsSolution = {
                        text: '',
                        score: 0 as Score,
                        trainerComment: ''
                      };
                    }
                    newExercise.sections[3].besoinsSolution.text = e.target.value;
                    updateExerciseAndStatus(newExercise);
                  }}
                  className={`w-full min-h-[80px] resize-vertical rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900`}
                  placeholder="Décrivez les besoins de solution..."
                  disabled={isAnswerDisabled()}
                />
              </div>
              {renderScoreAndComment(
                'besoins',
                0,
                null,
                exercise?.sections?.[3]?.besoinsSolution?.score || 0 as Score,
                exercise?.sections?.[3]?.besoinsSolution?.trainerComment || ''
              )}
            </div>
          </section>

          {/* Opportunité Projective */}
          <section className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-600 mb-4">Opportunité Projective</h2>
            <div className="text-sm text-gray-600 mb-6">
              <p>Posez 5 questions d'Opportunité Projectives avec à chaque fois 1 réponse du client + confirmer si c'est bien un problème pour le client + 1 question d'Impacts et 1 question de Besoin de Solution</p>
            </div>

            <div className="space-y-6">
              {exercise?.sections?.[4]?.questionsProjectives?.map((questionRaw, index) => {
                const question = initializeQuestionProjective(questionRaw);
                return (
                  <div key={index} className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">Question Projective {index + 1}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Question Projective</label>
                        <Textarea
                          value={question.question}
                          onChange={(e) => handleQuestionProjectiveChange(index, 'question', e.target.value)}
                          className={`w-full min-h-[80px] resize-vertical rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900`}
                          placeholder="Question projective..."
                          disabled={isAnswerDisabled()}
                        />
                        {renderScoreAndComment('projective', index, 'question', question.scores.question, question.comments.question)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Réponse du client</label>
                        <Textarea
                          value={question.reponseClient}
                          onChange={(e) => handleQuestionProjectiveChange(index, 'reponseClient', e.target.value)}
                          className={`w-full min-h-[80px] resize-vertical rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900`}
                          placeholder="Réponse..."
                          disabled={isAnswerDisabled()}
                        />
                        {renderScoreAndComment('projective', index, 'reponseClient', question.scores.reponseClient, question.comments.reponseClient)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Confirmation du problème</label>
                        <Textarea
                          value={question.confirmation}
                          onChange={(e) => handleQuestionProjectiveChange(index, 'confirmation', e.target.value)}
                          className={`w-full min-h-[80px] resize-vertical rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900`}
                          placeholder="Confirmation..."
                          disabled={isAnswerDisabled()}
                        />
                        {renderScoreAndComment('projective', index, 'confirmation', question.scores.confirmation, question.comments.confirmation)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Question d'Impacts</label>
                        <Textarea
                          value={question.impacts}
                          onChange={(e) => handleQuestionProjectiveChange(index, 'impacts', e.target.value)}
                          className={`w-full min-h-[80px] resize-vertical rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900`}
                          placeholder="Question d'impacts..."
                          disabled={isAnswerDisabled()}
                        />
                        {renderScoreAndComment('projective', index, 'impacts', question.scores.impacts, question.comments.impacts)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Question de besoin de solution</label>
                        <Textarea
                          value={question.besoinSolution}
                          onChange={(e) => handleQuestionProjectiveChange(index, 'besoinSolution', e.target.value)}
                          className={`w-full min-h-[80px] resize-vertical rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900`}
                          placeholder="Question de besoin de solution..."
                          disabled={isAnswerDisabled()}
                        />
                        {renderScoreAndComment('projective', index, 'besoinSolution', question.scores.besoinSolution, question.comments.besoinSolution)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Boutons de soumission/publication */}
        <div className="mt-8 flex justify-end space-x-4">
          {!isTrainer && !isAdmin && exercise?.status !== 'submitted' && exercise?.status !== 'evaluated' && (
            <Button
              onClick={handleSubmit}
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={loading || !canSubmit()}
            >
              Soumettre l'exercice
            </Button>
          )}
          {(isTrainer || isAdmin) && exercise?.status === 'submitted' && (
            <Button
              onClick={() => console.log('Publier')}
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={loading}
            >
              Publier
            </Button>
          )}
          {(isTrainer || isAdmin) && Object.keys(localEvaluations).length > 0 && (
            <Button
              onClick={handlePublishEvaluation}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
            >
              Publier les évaluations
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
