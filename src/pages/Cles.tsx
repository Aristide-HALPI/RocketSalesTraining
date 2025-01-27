import { useEffect, useState, useCallback, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { troisClesService, type TroisClesExercise } from '../features/trois-cles/services/troisClesService';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { ExerciseTemplate } from '../components/ExerciseTemplate';

// Composant séparé pour ScoreAndComment
const ScoreAndCommentComponent = memo(({ 
  type, 
  index, 
  subType = null, 
  initialScore = 0,
  initialComment = '',
  disabled,
  onScoreChange,
  onCommentChange
}: {
  type: string;
  index: number;
  subType: string | null;
  initialScore?: number;
  initialComment?: string;
  disabled?: boolean;
  onScoreChange: (score: number) => void;
  onCommentChange: (comment: string) => void;
}) => {
  const [score, setScore] = useState(initialScore);
  const [comment, setComment] = useState(initialComment);

  const handleScoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newScore = Number(e.target.value);
    setScore(newScore);
    onScoreChange(newScore);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newComment = e.target.value;
    setComment(newComment);
    onCommentChange(newComment);
  };

  // Mettre à jour l'état local si les props changent
  useEffect(() => {
    setScore(initialScore);
    setComment(initialComment);
  }, [initialScore, initialComment]);

  return (
    <div className="mt-2 pt-2 border-t border-gray-200">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Note :</label>
          <select
            value={score}
            onChange={handleScoreChange}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            disabled={disabled}
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
          <span className="text-sm text-gray-500">/2</span>
        </div>
      </div>
      <div className="mt-2">
        <label className="text-sm text-gray-600">Commentaire formateur :</label>
        <textarea
          value={comment}
          onChange={handleCommentChange}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm resize-vertical"
          rows={2}
          placeholder="Ajouter un commentaire..."
          disabled={disabled}
        />
      </div>
    </div>
  );
});

ScoreAndCommentComponent.displayName = 'ScoreAndCommentComponent';

export default function Cles() {
  const [searchParams] = useSearchParams();
  const { currentUser, userProfile } = useAuth();
  const [exercise, setExercise] = useState<TroisClesExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [localEvaluations, setLocalEvaluations] = useState<{
    [key: string]: {
      score: number;
      comment: string;
    }
  }>({});

  const targetUserId = searchParams.get('userId') || currentUser?.uid || '';
  const isTrainer = userProfile?.role === 'trainer';
  const isAdmin = userProfile?.role === 'admin';

  const isSubmitted = () => {
    return exercise?.status === 'submitted' || exercise?.status === 'evaluated';
  };

  const isEvaluated = () => {
    return exercise?.status === 'evaluated';
  };

  useEffect(() => {
    const loadExercise = async () => {
      try {
        const loadedExercise = await troisClesService.getExercise(targetUserId);
        console.log('Loaded exercise:', loadedExercise);
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

  const handleScoreChange = useCallback((key: string, score: number) => {
    setLocalEvaluations(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        score
      }
    }));
  }, []);

  const handleCommentChange = useCallback((key: string, comment: string) => {
    setLocalEvaluations(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        comment
      }
    }));
  }, []);

  const handlePublishEvaluation = useCallback(async () => {
    if (!exercise) return;

    const updatedExercise = { ...exercise };
    
    Object.entries(localEvaluations).forEach(([key, evaluation]) => {
      const [type, index, subType] = key.split('-');
      const idx = Number(index);

      if (type === 'explicite') {
        updatedExercise.sections[0].questionsExplicites[idx].score = evaluation.score;
        updatedExercise.sections[0].questionsExplicites[idx].trainerComment = evaluation.comment;
      } else if (type === 'evocatrice') {
        const question = updatedExercise.sections[1].questionsEvocatrices[idx];
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
      } else if (type === 'impacts') {
        updatedExercise.sections[2].impactsTemporels.score = evaluation.score;
        updatedExercise.sections[2].impactsTemporels.trainerComment = evaluation.comment;
      } else if (type === 'besoins') {
        updatedExercise.sections[3].besoinsSolution.score = evaluation.score;
        updatedExercise.sections[3].besoinsSolution.trainerComment = evaluation.comment;
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

  const isAnswerDisabled = useCallback(() => {
    if (!exercise) return true;
    if (isTrainer || isAdmin) return true;
    return isSubmitted();
  }, [exercise, isTrainer, isAdmin]);

  const isEvaluationDisabled = useCallback(() => {
    if (!exercise) return true;
    if (!isTrainer && !isAdmin) return true;
    return isEvaluated();
  }, [exercise, isTrainer, isAdmin]);

  const renderScoreAndComment = useCallback((type: string, index: number, subType: string | null = null, initialScore = 0, initialComment = '') => {
    if (!isTrainer && !isAdmin) return null;

    const key = `${type}-${index}-${subType}`;
    const evaluation = localEvaluations[key] || { score: initialScore, comment: initialComment };

    return (
      <ScoreAndCommentComponent
        key={key}
        type={type}
        index={index}
        subType={subType}
        initialScore={evaluation.score}
        initialComment={evaluation.comment}
        disabled={isEvaluationDisabled()}
        onScoreChange={(score) => handleScoreChange(key, score)}
        onCommentChange={(comment) => handleCommentChange(key, comment)}
      />
    );
  }, [isTrainer, isAdmin, localEvaluations, isEvaluationDisabled, handleScoreChange, handleCommentChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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
              <span className="px-2 py-1 text-sm font-semibold rounded">
                {exercise?.status === 'not_started' ? 'À débuter' : exercise?.status === 'in_progress' ? 'En cours' : exercise?.status === 'submitted' ? 'Soumis' : exercise?.status === 'evaluated' ? 'Évalué' : 'À débuter'}
              </span>
            </div>
          </div>
        </div>

        {/* Mode Formateur */}
        {(isTrainer || isAdmin) && (
          <div className="bg-blue-50 shadow-sm rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Mode Formateur</h2>
              <Button
                onClick={() => console.log('Correction avec l\'IA')}
                className="bg-violet-600 text-white hover:bg-violet-700"
                disabled={loading || exercise?.status !== 'submitted'}
              >
                Correction avec l'IA
              </Button>
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
                    value={question.text}
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
                        newExercise.sections[0].questionsExplicites[index] = {};
                      }
                      newExercise.sections[0].questionsExplicites[index].text = e.target.value;
                      setExercise(newExercise);
                    }}
                    className="w-full min-h-[80px] resize-none"
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
                      value={question.passe || ''}
                      onChange={(e) => {
                        const newExercise = { ...exercise };
                        newExercise.sections[1].questionsEvocatrices[index].passe = e.target.value;
                        setExercise(newExercise);
                      }}
                      className="w-full min-h-[80px] resize-vertical"
                      placeholder="Question sur le passé..."
                      disabled={isAnswerDisabled()}
                    />
                    {renderScoreAndComment('evocatrice', index, 'passe', question.scoresPasse, question.commentPasse)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Présent</label>
                    <Textarea
                      value={question.present || ''}
                      onChange={(e) => {
                        const newExercise = { ...exercise };
                        newExercise.sections[1].questionsEvocatrices[index].present = e.target.value;
                        setExercise(newExercise);
                      }}
                      className="w-full min-h-[80px] resize-vertical"
                      placeholder="Question sur le présent..."
                      disabled={isAnswerDisabled()}
                    />
                    {renderScoreAndComment('evocatrice', index, 'present', question.scoresPresent, question.commentPresent)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Futur</label>
                    <Textarea
                      value={question.futur || ''}
                      onChange={(e) => {
                        const newExercise = { ...exercise };
                        newExercise.sections[1].questionsEvocatrices[index].futur = e.target.value;
                        setExercise(newExercise);
                      }}
                      className="w-full min-h-[80px] resize-vertical"
                      placeholder="Question sur le futur..."
                      disabled={isAnswerDisabled()}
                    />
                    {renderScoreAndComment('evocatrice', index, 'futur', question.scoresFutur, question.commentFutur)}
                  </div>
                </div>
              </div>
            ))}

            {/* Questions d'impacts */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Question d'Impacts</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Passé</label>
                  <Textarea
                    value={exercise?.sections[2].impactsTemporels?.passe || ''}
                    onChange={(e) => {
                      const newExercise = { ...exercise };
                      newExercise.sections[2].impactsTemporels.passe = e.target.value;
                      setExercise(newExercise);
                    }}
                    className="w-full min-h-[80px] resize-vertical"
                    placeholder="Impact sur le passé..."
                    disabled={isAnswerDisabled()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Présent</label>
                  <Textarea
                    value={exercise?.sections[2].impactsTemporels?.present || ''}
                    onChange={(e) => {
                      const newExercise = { ...exercise };
                      newExercise.sections[2].impactsTemporels.present = e.target.value;
                      setExercise(newExercise);
                    }}
                    className="w-full min-h-[80px] resize-vertical"
                    placeholder="Impact sur le présent..."
                    disabled={isAnswerDisabled()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Futur</label>
                  <Textarea
                    value={exercise?.sections[2].impactsTemporels?.futur || ''}
                    onChange={(e) => {
                      const newExercise = { ...exercise };
                      newExercise.sections[2].impactsTemporels.futur = e.target.value;
                      setExercise(newExercise);
                    }}
                    className="w-full min-h-[80px] resize-vertical"
                    placeholder="Impact sur le futur..."
                    disabled={isAnswerDisabled()}
                  />
                </div>
              </div>
              {renderScoreAndComment('impacts', 0, null, exercise?.sections[2].impactsTemporels?.score, exercise?.sections[2].impactsTemporels?.trainerComment)}
            </div>

            {/* Questions de Besoin de Solution */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Question de Besoin de Solution</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Passé</label>
                  <Textarea
                    value={exercise?.sections[3].besoinsSolution?.passe || ''}
                    onChange={(e) => {
                      const newExercise = { ...exercise };
                      newExercise.sections[3].besoinsSolution.passe = e.target.value;
                      setExercise(newExercise);
                    }}
                    className="w-full min-h-[80px] resize-vertical"
                    placeholder="Solution pour le passé..."
                    disabled={isAnswerDisabled()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Présent</label>
                  <Textarea
                    value={exercise?.sections[3].besoinsSolution?.present || ''}
                    onChange={(e) => {
                      const newExercise = { ...exercise };
                      newExercise.sections[3].besoinsSolution.present = e.target.value;
                      setExercise(newExercise);
                    }}
                    className="w-full min-h-[80px] resize-vertical"
                    placeholder="Solution pour le présent..."
                    disabled={isAnswerDisabled()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Futur</label>
                  <Textarea
                    value={exercise?.sections[3].besoinsSolution?.futur || ''}
                    onChange={(e) => {
                      const newExercise = { ...exercise };
                      newExercise.sections[3].besoinsSolution.futur = e.target.value;
                      setExercise(newExercise);
                    }}
                    className="w-full min-h-[80px] resize-vertical"
                    placeholder="Solution pour le futur..."
                    disabled={isAnswerDisabled()}
                  />
                </div>
              </div>
              {renderScoreAndComment('besoins', 0, null, exercise?.sections[3].besoinsSolution?.score, exercise?.sections[3].besoinsSolution?.trainerComment)}
            </div>
          </section>

          {/* Opportunité Projective */}
          <section className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-600 mb-4">Opportunité Projective</h2>
            <div className="text-sm text-gray-600 mb-6">
              <p>Posez 5 questions d'Opportunité Projectives avec à chaque fois 1 réponse du client + confirmer si c'est bien un problème pour le client + 1 question d'Impacts et 1 question de Besoin de Solution</p>
            </div>

            <div className="space-y-6">
              {console.log('Rendering questions projectives:', exercise?.sections?.[4]?.questionsProjectives)}
              {Array.from({ length: 5 }).map((_, index) => {
                const question = exercise?.sections?.[4]?.questionsProjectives?.[index] || {};
                console.log('Question at index', index, ':', question);
                return (
                  <div key={index} className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">Question Projective {index + 1}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Votre question</label>
                        <Textarea
                          value={question?.question || ''}
                          onChange={(e) => {
                            const newExercise = { ...exercise };
                            if (!newExercise.sections) {
                              newExercise.sections = [];
                            }
                            if (!newExercise.sections[4]) {
                              newExercise.sections[4] = {
                                id: 'questions_projectives',
                                title: 'Questions Projectives',
                                description: 'Questions projectives pour explorer les possibilités',
                                questionsProjectives: Array(5).fill({
                                  question: '',
                                  reponseClient: '',
                                  confirmation: '',
                                  impacts: '',
                                  besoinSolution: '',
                                  scores: {},
                                  comments: {}
                                })
                              };
                            }
                            if (!newExercise.sections[4].questionsProjectives) {
                              newExercise.sections[4].questionsProjectives = Array(5).fill({
                                question: '',
                                reponseClient: '',
                                confirmation: '',
                                impacts: '',
                                besoinSolution: '',
                                scores: {},
                                comments: {}
                              });
                            }
                            if (!newExercise.sections[4].questionsProjectives[index]) {
                              newExercise.sections[4].questionsProjectives[index] = {
                                question: '',
                                reponseClient: '',
                                confirmation: '',
                                impacts: '',
                                besoinSolution: '',
                                scores: {},
                                comments: {}
                              };
                            }
                            newExercise.sections[4].questionsProjectives[index].question = e.target.value;
                            setExercise(newExercise);
                          }}
                          className="w-full min-h-[80px] resize-vertical"
                          placeholder="Question projective..."
                          disabled={isAnswerDisabled()}
                        />
                        {renderScoreAndComment('projective', index, 'question', question?.scores?.question, question?.comments?.question)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Réponse du client</label>
                        <Textarea
                          value={question?.reponseClient || ''}
                          onChange={(e) => {
                            const newExercise = { ...exercise };
                            if (!newExercise.sections) {
                              newExercise.sections = [];
                            }
                            if (!newExercise.sections[4]) {
                              newExercise.sections[4] = {
                                id: 'questions_projectives',
                                title: 'Questions Projectives',
                                description: 'Questions projectives pour explorer les possibilités',
                                questionsProjectives: Array(5).fill({
                                  question: '',
                                  reponseClient: '',
                                  confirmation: '',
                                  impacts: '',
                                  besoinSolution: '',
                                  scores: {},
                                  comments: {}
                                })
                              };
                            }
                            if (!newExercise.sections[4].questionsProjectives) {
                              newExercise.sections[4].questionsProjectives = Array(5).fill({
                                question: '',
                                reponseClient: '',
                                confirmation: '',
                                impacts: '',
                                besoinSolution: '',
                                scores: {},
                                comments: {}
                              });
                            }
                            if (!newExercise.sections[4].questionsProjectives[index]) {
                              newExercise.sections[4].questionsProjectives[index] = {
                                question: '',
                                reponseClient: '',
                                confirmation: '',
                                impacts: '',
                                besoinSolution: '',
                                scores: {},
                                comments: {}
                              };
                            }
                            newExercise.sections[4].questionsProjectives[index].reponseClient = e.target.value;
                            setExercise(newExercise);
                          }}
                          className="w-full min-h-[80px] resize-vertical"
                          placeholder="Réponse..."
                          disabled={isAnswerDisabled()}
                        />
                        {renderScoreAndComment('projective', index, 'reponseClient', question?.scores?.reponseClient, question?.comments?.reponseClient)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Confirmation du problème</label>
                        <Textarea
                          value={question?.confirmation || ''}
                          onChange={(e) => {
                            const newExercise = { ...exercise };
                            if (!newExercise.sections) {
                              newExercise.sections = [];
                            }
                            if (!newExercise.sections[4]) {
                              newExercise.sections[4] = {
                                id: 'questions_projectives',
                                title: 'Questions Projectives',
                                description: 'Questions projectives pour explorer les possibilités',
                                questionsProjectives: Array(5).fill({
                                  question: '',
                                  reponseClient: '',
                                  confirmation: '',
                                  impacts: '',
                                  besoinSolution: '',
                                  scores: {},
                                  comments: {}
                                })
                              };
                            }
                            if (!newExercise.sections[4].questionsProjectives) {
                              newExercise.sections[4].questionsProjectives = Array(5).fill({
                                question: '',
                                reponseClient: '',
                                confirmation: '',
                                impacts: '',
                                besoinSolution: '',
                                scores: {},
                                comments: {}
                              });
                            }
                            if (!newExercise.sections[4].questionsProjectives[index]) {
                              newExercise.sections[4].questionsProjectives[index] = {
                                question: '',
                                reponseClient: '',
                                confirmation: '',
                                impacts: '',
                                besoinSolution: '',
                                scores: {},
                                comments: {}
                              };
                            }
                            newExercise.sections[4].questionsProjectives[index].confirmation = e.target.value;
                            setExercise(newExercise);
                          }}
                          className="w-full min-h-[80px] resize-vertical"
                          placeholder="Confirmation..."
                          disabled={isAnswerDisabled()}
                        />
                        {renderScoreAndComment('projective', index, 'confirmation', question?.scores?.confirmation, question?.comments?.confirmation)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Question d'Impacts</label>
                        <Textarea
                          value={question?.impacts || ''}
                          onChange={(e) => {
                            const newExercise = { ...exercise };
                            if (!newExercise.sections) {
                              newExercise.sections = [];
                            }
                            if (!newExercise.sections[4]) {
                              newExercise.sections[4] = {
                                id: 'questions_projectives',
                                title: 'Questions Projectives',
                                description: 'Questions projectives pour explorer les possibilités',
                                questionsProjectives: Array(5).fill({
                                  question: '',
                                  reponseClient: '',
                                  confirmation: '',
                                  impacts: '',
                                  besoinSolution: '',
                                  scores: {},
                                  comments: {}
                                })
                              };
                            }
                            if (!newExercise.sections[4].questionsProjectives) {
                              newExercise.sections[4].questionsProjectives = Array(5).fill({
                                question: '',
                                reponseClient: '',
                                confirmation: '',
                                impacts: '',
                                besoinSolution: '',
                                scores: {},
                                comments: {}
                              });
                            }
                            if (!newExercise.sections[4].questionsProjectives[index]) {
                              newExercise.sections[4].questionsProjectives[index] = {
                                question: '',
                                reponseClient: '',
                                confirmation: '',
                                impacts: '',
                                besoinSolution: '',
                                scores: {},
                                comments: {}
                              };
                            }
                            newExercise.sections[4].questionsProjectives[index].impacts = e.target.value;
                            setExercise(newExercise);
                          }}
                          className="w-full min-h-[80px] resize-vertical"
                          placeholder="Question d'impacts..."
                          disabled={isAnswerDisabled()}
                        />
                        {renderScoreAndComment('projective', index, 'impacts', question?.scores?.impacts, question?.comments?.impacts)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Question de besoin de solution</label>
                        <Textarea
                          value={question?.besoinSolution || ''}
                          onChange={(e) => {
                            const newExercise = { ...exercise };
                            if (!newExercise.sections) {
                              newExercise.sections = [];
                            }
                            if (!newExercise.sections[4]) {
                              newExercise.sections[4] = {
                                id: 'questions_projectives',
                                title: 'Questions Projectives',
                                description: 'Questions projectives pour explorer les possibilités',
                                questionsProjectives: Array(5).fill({
                                  question: '',
                                  reponseClient: '',
                                  confirmation: '',
                                  impacts: '',
                                  besoinSolution: '',
                                  scores: {},
                                  comments: {}
                                })
                              };
                            }
                            if (!newExercise.sections[4].questionsProjectives) {
                              newExercise.sections[4].questionsProjectives = Array(5).fill({
                                question: '',
                                reponseClient: '',
                                confirmation: '',
                                impacts: '',
                                besoinSolution: '',
                                scores: {},
                                comments: {}
                              });
                            }
                            if (!newExercise.sections[4].questionsProjectives[index]) {
                              newExercise.sections[4].questionsProjectives[index] = {
                                question: '',
                                reponseClient: '',
                                confirmation: '',
                                impacts: '',
                                besoinSolution: '',
                                scores: {},
                                comments: {}
                              };
                            }
                            newExercise.sections[4].questionsProjectives[index].besoinSolution = e.target.value;
                            setExercise(newExercise);
                          }}
                          className="w-full min-h-[80px] resize-vertical"
                          placeholder="Question de besoin de solution..."
                          disabled={isAnswerDisabled()}
                        />
                        {renderScoreAndComment('projective', index, 'besoinSolution', question?.scores?.besoinSolution, question?.comments?.besoinSolution)}
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
              onClick={() => console.log('Soumettre l\'exercice')}
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={loading}
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
