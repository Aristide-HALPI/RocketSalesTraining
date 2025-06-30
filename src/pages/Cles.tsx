import { useEffect, useState, useCallback, memo, useRef } from 'react';
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
  timestamp: number; // Timestamp de la dernière modification
  source: 'ai' | 'manual'; // Source de l'évaluation (IA ou manuelle)
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
  onCommentChange,
  questionType = 'standard' // 'standard' pour explicite/évocatrice, 'projective' pour les composants des questions projectives
}: {
  initialScore?: Score;
  initialComment?: string;
  disabled?: boolean;
  onScoreChange: (score: Score) => void;
  onCommentChange: (comment: string) => void;
  questionType?: 'standard' | 'projective';
}) => {
  const [score, setScore] = useState<Score>(initialScore);
  const [comment, setComment] = useState(initialComment);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fonction pour ajuster automatiquement la hauteur du textarea
  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = Math.max(element.scrollHeight, 48) + 'px'; // Minimum 48px (2 lignes)
  };

  // Mettre à jour l'état local si les props changent
  useEffect(() => {
    setScore(initialScore);
    setComment(initialComment);
  }, [initialScore, initialComment]);

  // Ajuster la hauteur du textarea quand le commentaire change
  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current);
    }
  }, [comment]);

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
          <option value={2}>2</option>
          {questionType === 'standard' && (
            <>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </>
          )}
        </select>
      </div>
      <textarea
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          onCommentChange(e.target.value);
          adjustTextareaHeight(e.target);
        }}
        onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
        placeholder="Commentaire..."
        className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 resize-none overflow-hidden"
        style={{ minHeight: '48px' }}
        disabled={disabled}
        ref={textareaRef}
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

  const updateLocalEvaluations = useCallback((type: string, index: number, subType: string | null, evaluation: LocalEvaluation) => {
    const key = `${type}_${index}${subType ? `_${subType}` : ''}`;
    console.log(`💾 SAUVEGARDE LOCALE pour ${key}:`, evaluation);
    console.log(`🕐 Timestamp de la modification:`, evaluation.timestamp, new Date(evaluation.timestamp).toLocaleString());
    
    setLocalEvaluations(prev => {
      const updated = {
        ...prev,
        [key]: evaluation
      };
      
      // Sauvegarder dans localStorage
      localStorage.setItem(`evaluation_${targetUserId}`, JSON.stringify(updated));
      console.log(`✅ SAUVEGARDÉ dans localStorage pour ${targetUserId}:`, updated);
      console.log(`📝 Clés sauvegardées:`, Object.keys(updated));
      
      return updated;
    });
  }, [targetUserId]);

  const handleScoreChange = (type: string, index: number, subType: string | null, score: Score) => {
    const key = `${type}_${index}${subType ? `_${subType}` : ''}`;
    const currentEval = localEvaluations[key] || { score: 0, comment: '', timestamp: 0, source: 'manual' as const };
    updateLocalEvaluations(type, index, subType, { ...currentEval, score, timestamp: Date.now(), source: 'manual' });
  };

  const handleCommentChange = (type: string, index: number, subType: string | null, comment: string) => {
    const key = `${type}_${index}${subType ? `_${subType}` : ''}`;
    const currentEval = localEvaluations[key] || { score: 0, comment: '', timestamp: 0, source: 'manual' as const };
    updateLocalEvaluations(type, index, subType, { ...currentEval, comment, timestamp: Date.now(), source: 'manual' });
  };

  const renderScoreAndComment = useCallback((type: string, index: number, subType: string | null, score: Score | undefined, comment: string | undefined) => {
    const key = `${type}_${index}${subType ? `_${subType}` : ''}`;
    console.log(`🎨 renderScoreAndComment appelé pour: ${key}`);
    console.log(`📦 Données locales pour cette clé:`, localEvaluations[key]);
    
    const localEval = localEvaluations[key];
    const displayScore = localEval?.score ?? score ?? 0;
    const displayComment = localEval?.comment ?? comment ?? '';
    
    console.log(`📊 Affichage - Score: ${displayScore}, Commentaire: ${displayComment}`);
    
    // Créer l'objet évaluation
    const evaluation = { 
      score: displayScore, 
      comment: displayComment,
      timestamp: localEval?.timestamp || Date.now(),
      source: localEval?.source || 'manual' as const
    };
    
    // Déterminer le type de question pour l'échelle de notation
    const questionType = type === 'projective' && subType ? 'projective' : 'standard';

    // Ne pas afficher les contrôles d'évaluation pour les non-formateurs/non-admins
    // sauf s'il y a une évaluation à afficher
    if (!isTrainer && !isAdmin) {
      if (!evaluation.comment && evaluation.score === 0) {
        return null;
      }
    }

    return (
      <ScoreAndCommentComponent
        initialScore={evaluation.score}
        initialComment={evaluation.comment}
        disabled={isEvaluationDisabled()}
        questionType={questionType}
        onScoreChange={(newScore) => updateLocalEvaluations(type, index, subType, { ...evaluation, score: newScore, timestamp: Date.now(), source: 'manual' })}
        onCommentChange={(newComment) => updateLocalEvaluations(type, index, subType, { ...evaluation, comment: newComment, timestamp: Date.now(), source: 'manual' })}
      />
    );
  }, [isTrainer, isAdmin, localEvaluations, isEvaluationDisabled, updateLocalEvaluations]);

  useEffect(() => {
    const loadExercise = async () => {
      try {
        const loadedExercise = await troisClesService.getExercise(targetUserId);
        console.log('Loaded exercise:', loadedExercise);
        console.log('Exercise status:', loadedExercise?.status);
        console.log('📋 Structure des sections:', loadedExercise?.sections?.map((s, i) => ({
          index: i,
          title: s.title,
          hasQuestionsExplicites: !!s.questionsExplicites,
          hasQuestionsEvocatrices: !!s.questionsEvocatrices,
          hasQuestionsProjectives: !!s.questionsProjectives
        })));
        console.log('Questions projectives:', loadedExercise?.sections?.[4]?.questionsProjectives);
        console.log('🔍 Sections chargées:', {
          explicites: loadedExercise.sections[0]?.questionsExplicites?.length || 0,
          evocatrices: loadedExercise.sections[1]?.questionsEvocatrices?.length || 0,
          projectives: loadedExercise.sections[4]?.questionsProjectives?.length || 0
        });
        console.log('📋 Questions évocatrices détaillées:', loadedExercise.sections[1]?.questionsEvocatrices);
        setExercise(loadedExercise);

        // 1. PRIORITÉ ABSOLUE : Charger les évaluations locales depuis localStorage
        const savedEvaluations = localStorage.getItem(`evaluation_${targetUserId}`);
        if (savedEvaluations) {
          const parsed = JSON.parse(savedEvaluations);
          console.log(`📂 CHARGEMENT des évaluations depuis localStorage pour ${targetUserId}:`, parsed);
          console.log(`📝 Clés trouvées:`, Object.keys(parsed));
          setLocalEvaluations(parsed);
        } else {
          // 2. Si pas de localStorage, vérifier si l'exercice a été évalué et publié
          if (loadedExercise?.status === 'evaluated' && loadedExercise?.trainerEvaluations) {
            console.log('👨‍🏫 Exercice évalué - Chargement des évaluations publiées depuis Firestore');
            
            const publishedEvals: Record<string, LocalEvaluation> = {};
            
            // Convertir les trainerEvaluations de Firestore vers le format local
            Object.entries(loadedExercise.trainerEvaluations).forEach(([type, typeEvals]: [string, any]) => {
              Object.entries(typeEvals).forEach(([index, evalOrSubEvals]: [string, any]) => {
                if (evalOrSubEvals.score !== undefined) {
                  // Évaluation simple (explicite, impacts, besoins)
                  const key = `${type}_${index}`;
                  publishedEvals[key] = {
                    score: evalOrSubEvals.score,
                    comment: evalOrSubEvals.comment || '',
                    timestamp: evalOrSubEvals.timestamp || Date.now(),
                    source: evalOrSubEvals.source || 'manual'
                  };
                } else {
                  // Évaluation avec sous-types (évocatrice, projective)
                  Object.entries(evalOrSubEvals).forEach(([subType, subEval]: [string, any]) => {
                    const key = `${type}_${index}_${subType}`;
                    publishedEvals[key] = {
                      score: subEval.score,
                      comment: subEval.comment || '',
                      timestamp: subEval.timestamp || Date.now(),
                      source: subEval.source || 'manual'
                    };
                  });
                }
              });
            });
            
            console.log('📥 Évaluations publiées chargées:', publishedEvals);
            setLocalEvaluations(publishedEvals);
            
            // Sauvegarder dans localStorage pour les prochaines fois
            localStorage.setItem(`evaluation_${targetUserId}`, JSON.stringify(publishedEvals));
            
          } else if (loadedExercise?.aiEvaluation?.evaluation?.responses) {
            // 3. Si pas évalué mais a des évaluations IA, les charger
            console.log('🤖 Initialisation avec les évaluations IA de Firestore');
            
            const aiEvaluations: Record<string, LocalEvaluation> = {};
            const aiTimestamp = loadedExercise.updatedAt ? new Date(loadedExercise.updatedAt).getTime() : Date.now();
            
            loadedExercise.aiEvaluation.evaluation.responses.forEach((response: any) => {
              // Mapper les réponses IA vers nos clés locales
              let key = '';
              
              if (response.section === 'questions_explicites_open') {
                // Questions explicites ouvertes (0-2)
                if (response.characteristic >= 1 && response.characteristic <= 3) {
                  key = `explicite_${response.characteristic - 1}`;
                }
              } else if (response.section === 'questions_explicites_fermees') {
                // Questions explicites fermées (3-4)
                if (response.characteristic >= 4 && response.characteristic <= 5) {
                  key = `explicite_${response.characteristic - 1}`;
                }
              } else if (response.section === 'questions_impacts' && response.characteristic === 6) {
                // Question d'impact explicite
                key = 'explicite_5';
              } else if (response.section === 'questions_besoin_solution' && response.characteristic === 7) {
                // Question de besoin de solution explicite
                key = 'explicite_6';
              } else if (response.section === 'questions_evocatrices_passe') {
                // Questions évocatrices passé
                // L'IA envoie characteristic 1-3 pour les 3 questions passé
                if (response.characteristic === 1) {
                  key = `evocatrice_0_passe`;
                } else if (response.characteristic === 2) {
                  key = `evocatrice_1_passe`;
                } else if (response.characteristic === 3) {
                  key = `evocatrice_2_passe`;
                }
              } else if (response.section === 'questions_evocatrices_present') {
                // Questions évocatrices présent
                // L'IA envoie characteristic 4-6 pour les 3 questions présent
                if (response.characteristic === 4) {
                  key = `evocatrice_0_present`;
                } else if (response.characteristic === 5) {
                  key = `evocatrice_1_present`;
                } else if (response.characteristic === 6) {
                  key = `evocatrice_2_present`;
                }
              } else if (response.section === 'questions_evocatrices_futur') {
                // Questions évocatrices futur
                // L'IA envoie characteristic 7-9 pour les 3 questions futur
                if (response.characteristic === 7) {
                  key = `evocatrice_0_futur`;
                } else if (response.characteristic === 8) {
                  key = `evocatrice_1_futur`;
                } else if (response.characteristic === 9) {
                  key = `evocatrice_2_futur`;
                }
              } else if (response.section === 'questions_impacts' && response.characteristic === 10) {
                // Question d'impact évocatrice
                key = 'impacts_0';
              } else if (response.section === 'questions_besoin_solution' && response.characteristic === 11) {
                // Question de besoin de solution évocatrice
                key = 'besoins_0';
              } else if (response.section.startsWith('question_projective_')) {
                // Questions projectives
                const projectiveIndex = parseInt(response.section.replace('question_projective_', '')) - 1;
                if (response.components) {
                  // Si on a des composants, traiter chaque sous-partie
                  response.components.forEach((component: any) => {
                    const subKey = `projective_${projectiveIndex}_${component.section}`;
                    aiEvaluations[subKey] = {
                      score: component.score || 0,
                      comment: component.comment || '',
                      timestamp: aiTimestamp,
                      source: 'ai' as const
                    };
                  });
                  // Ajouter aussi l'évaluation globale de la question
                  const globalKey = `projective_${projectiveIndex}_global`;
                  aiEvaluations[globalKey] = {
                    score: response.score || 0,
                    comment: response.comment || '',
                    timestamp: aiTimestamp,
                    source: 'ai' as const
                  };
                } else {
                  // Sinon, utiliser le score global (fallback)
                  key = `projective_${projectiveIndex}_question`;
                }
              }
              
              if (key) {
                aiEvaluations[key] = {
                  score: response.score || 0,
                  comment: response.comment || '',
                  timestamp: aiTimestamp,
                  source: 'ai' as const
                };
              }
            });
            
            console.log('🤖 Évaluations IA initialisées:', aiEvaluations);
            setLocalEvaluations(aiEvaluations);
            localStorage.setItem(`evaluation_${targetUserId}`, JSON.stringify(aiEvaluations));
          }
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

    // Configurer un listener pour sauvegarder l'exercice avant de quitter la page
    const handleBeforeUnload = () => {
      if (exercise && !isSubmitted()) {
        // Sauvegarder l'exercice dans Firebase avant de quitter
        troisClesService.updateExercise(targetUserId, exercise);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [targetUserId]); // Retirer exercise et isSubmitted des dépendances pour éviter la boucle infinie

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

      console.log(`🎯 Évaluation IA pour ${sectionType}:`, {
        sectionsEnvoyées: evaluationExercise.sections.length,
        titresSections: evaluationExercise.sections.map(s => s.title)
      });

      // Log détaillé de ce qu'on envoie
      console.log('📤 Contenu exact envoyé à l\'IA:', {
        nombreSections: evaluationExercise.sections.length,
        sections: evaluationExercise.sections.map(s => ({
          title: s.title,
          questionsExplicites: s.questionsExplicites?.length || 0,
          questionsEvocatrices: s.questionsEvocatrices?.length || 0,
          questionsProjectives: s.questionsProjectives?.length || 0
        }))
      });

      // Appeler le service d'évaluation avec la section filtrée
      await troisClesService.evaluateWithAI(targetUserId, evaluationExercise);
      
      // Recharger l'exercice pour obtenir les résultats de l'évaluation
      const updatedExercise = await troisClesService.getExercise(targetUserId);
      setExercise(updatedExercise);
      
      // Capturer les nouvelles évaluations IA
      if (updatedExercise?.aiEvaluation?.evaluation?.responses) {
        console.log('🤖 Nouvelles évaluations IA après évaluation:', updatedExercise.aiEvaluation.evaluation.responses);
        
        // FILTRER les réponses selon la section demandée
        const filteredResponses = updatedExercise.aiEvaluation.evaluation.responses.filter((response: any) => {
          switch (sectionType) {
            case 'explicite':
              return response.section.includes('explicite') || 
                     (response.section === 'questions_impacts' && response.characteristic === 6) ||
                     (response.section === 'questions_besoin_solution' && response.characteristic === 7);
            case 'evocatrice':
              return response.section.includes('evocatrice') || 
                     (response.section === 'questions_impacts' && response.characteristic === 10) ||
                     (response.section === 'questions_besoin_solution' && response.characteristic === 11);
            case 'projective':
              return response.section.startsWith('question_projective_');
            default:
              return false;
          }
        });

        console.log(`🎯 Réponses filtrées pour ${sectionType}:`, filteredResponses.length, 'sur', updatedExercise.aiEvaluation.evaluation.responses.length);
        
        // LOG DÉTAILLÉ : Vérifier les scores de l'IA
        console.log('🔍 ANALYSE DES SCORES IA:');
        filteredResponses.forEach((response: any, index: number) => {
          console.log(`  Response ${index}:`, {
            section: response.section,
            characteristic: response.characteristic,
            score: response.score,
            comment: response.comment?.substring(0, 50) + '...'
          });
        });
        
        // Récupérer les évaluations locales actuelles
        const currentLocalEvaluations = { ...localEvaluations };
        
        // Supprimer uniquement les évaluations IA de la section concernée
        const keysToUpdate: string[] = [];
        switch (sectionType) {
          case 'explicite':
            keysToUpdate.push(...Array.from({length: 7}, (_, i) => `explicite_${i}`));
            break;
          case 'evocatrice':
            keysToUpdate.push(
              ...Array.from({length: 3}, (_, i) => `evocatrice_${i}_passe`),
              ...Array.from({length: 3}, (_, i) => `evocatrice_${i}_present`),
              ...Array.from({length: 3}, (_, i) => `evocatrice_${i}_futur`),
              'impacts_0',
              'besoins_0'
            );
            break;
          case 'projective':
            keysToUpdate.push(
              ...Array.from({length: 5}, (_, i) => [
                `projective_${i}_question`,
                `projective_${i}_reponseClient`,
                `projective_${i}_confirmation`,
                `projective_${i}_impacts`,
                `projective_${i}_besoinSolution`
              ]).flat()
            );
            break;
        }
        
        // Supprimer les anciennes évaluations IA pour cette section
        keysToUpdate.forEach(key => {
          if (currentLocalEvaluations[key]?.source === 'ai') {
            delete currentLocalEvaluations[key];
          }
        });
        
        const aiEvaluations: Record<string, LocalEvaluation> = {};
        const aiTimestamp = updatedExercise.updatedAt ? new Date(updatedExercise.updatedAt).getTime() : Date.now();
        
        // Utiliser seulement les réponses filtrées
        filteredResponses.forEach((response: any) => {
          // Mapper les réponses IA vers nos clés locales
          let key = '';
          
          if (response.section === 'questions_explicites_open') {
            // Questions explicites ouvertes (0-2)
            if (response.characteristic >= 1 && response.characteristic <= 3) {
              key = `explicite_${response.characteristic - 1}`;
            }
          } else if (response.section === 'questions_explicites_fermees') {
            // Questions explicites fermées (3-4)
            if (response.characteristic >= 4 && response.characteristic <= 5) {
              key = `explicite_${response.characteristic - 1}`;
            }
          } else if (response.section === 'questions_impacts' && response.characteristic === 6) {
            // Question d'impact explicite
            key = 'explicite_5';
          } else if (response.section === 'questions_besoin_solution' && response.characteristic === 7) {
            // Question de besoin de solution explicite
            key = 'explicite_6';
          } else if (response.section === 'questions_evocatrices_passe') {
            // Questions évocatrices passé
            // L'IA envoie characteristic 1-3 pour les 3 questions passé
            if (response.characteristic === 1) {
              key = `evocatrice_0_passe`;
            } else if (response.characteristic === 2) {
              key = `evocatrice_1_passe`;
            } else if (response.characteristic === 3) {
              key = `evocatrice_2_passe`;
            }
          } else if (response.section === 'questions_evocatrices_present') {
            // Questions évocatrices présent
            // L'IA envoie characteristic 4-6 pour les 3 questions présent
            if (response.characteristic === 4) {
              key = `evocatrice_0_present`;
            } else if (response.characteristic === 5) {
              key = `evocatrice_1_present`;
            } else if (response.characteristic === 6) {
              key = `evocatrice_2_present`;
            }
          } else if (response.section === 'questions_evocatrices_futur') {
            // Questions évocatrices futur
            // L'IA envoie characteristic 7-9 pour les 3 questions futur
            if (response.characteristic === 7) {
              key = `evocatrice_0_futur`;
            } else if (response.characteristic === 8) {
              key = `evocatrice_1_futur`;
            } else if (response.characteristic === 9) {
              key = `evocatrice_2_futur`;
            }
          } else if (response.section === 'questions_impacts' && response.characteristic === 10) {
            // Question d'impact évocatrice
            key = 'impacts_0';
          } else if (response.section === 'questions_besoin_solution' && response.characteristic === 11) {
            // Question de besoin de solution évocatrice
            key = 'besoins_0';
          } else if (response.section.startsWith('question_projective_')) {
            // Questions projectives
            const projectiveIndex = parseInt(response.section.replace('question_projective_', '')) - 1;
            if (response.components) {
              // Si on a des composants, traiter chaque sous-partie
              response.components.forEach((component: any) => {
                const subKey = `projective_${projectiveIndex}_${component.section}`;
                aiEvaluations[subKey] = {
                  score: component.score || 0,
                  comment: component.comment || '',
                  timestamp: aiTimestamp,
                  source: 'ai' as const
                };
              });
              // Ajouter aussi l'évaluation globale de la question
              const globalKey = `projective_${projectiveIndex}_global`;
              aiEvaluations[globalKey] = {
                score: response.score || 0,
                comment: response.comment || '',
                timestamp: aiTimestamp,
                source: 'ai' as const
              };
            } else {
              // Sinon, utiliser le score global
              key = `projective_${projectiveIndex}_question`;
            }
          }
          
          if (key) {
            aiEvaluations[key] = {
              score: response.score || 0,
              comment: response.comment || '',
              timestamp: aiTimestamp,
              source: 'ai' as const
            };
          }
        });
        
        console.log('🤖 Nouvelles évaluations IA mappées:', aiEvaluations);
        
        // Fusionner avec les évaluations locales existantes
        // IMPORTANT: Les nouvelles évaluations IA ont la priorité car elles viennent d'être générées
        const mergedEvaluations = { ...currentLocalEvaluations, ...aiEvaluations };
        
        console.log('🔄 Évaluations fusionnées après IA:', mergedEvaluations);
        
        // Vérifier spécifiquement les clés projectives
        console.log('🔍 Vérification des clés projectives après fusion:');
        Object.keys(mergedEvaluations).filter(key => key.startsWith('projective_')).forEach(key => {
          console.log(`  ${key}:`, mergedEvaluations[key]);
        });
        
        setLocalEvaluations(mergedEvaluations);
        localStorage.setItem(`evaluation_${targetUserId}`, JSON.stringify(mergedEvaluations));
        
        // Vérifier que le state a bien été mis à jour
        setTimeout(() => {
          console.log('🔍 Vérification du state après 100ms:');
          const savedEvals = localStorage.getItem(`evaluation_${targetUserId}`);
          if (savedEvals) {
            const parsed = JSON.parse(savedEvals);
            console.log('📦 Clés projectives dans localStorage:', 
              Object.keys(parsed).filter(k => k.startsWith('projective_'))
            );
          }
        }, 100);
      }
    } catch (error) {
      console.error('Erreur lors de l\'évaluation IA:', error);
      alert('Une erreur est survenue lors de l\'évaluation par l\'IA');
    } finally {
      setLoadingAI(prev => ({ ...prev, [sectionType]: false }));
    }
  };

  const handlePublishEvaluation = useCallback(async () => {
    if (!exercise || !targetUserId) return;

    try {
      console.log('📤 Publication des évaluations locales vers Firestore...');
      
      // Créer une copie de l'exercice avec les évaluations locales intégrées
      const updatedExercise = { ...exercise };
      
      // Convertir les évaluations locales en format pour Firestore
      const trainerEvaluations: any = {};
      
      Object.entries(localEvaluations).forEach(([key, evaluation]) => {
        // Extraire le type et l'index de la clé
        const parts = key.split('_');
        const type = parts[0];
        const index = parseInt(parts[1]);
        const subType = parts[2];
        
        // Créer la structure pour Firestore
        if (!trainerEvaluations[type]) {
          trainerEvaluations[type] = {};
        }
        
        if (subType) {
          // Pour les questions évocatrices (passé/présent/futur)
          if (!trainerEvaluations[type][index]) {
            trainerEvaluations[type][index] = {};
          }
          trainerEvaluations[type][index][subType] = {
            score: evaluation.score,
            comment: evaluation.comment,
            timestamp: evaluation.timestamp,
            source: evaluation.source
          };
        } else {
          // Pour les autres questions
          trainerEvaluations[type][index] = {
            score: evaluation.score,
            comment: evaluation.comment,
            timestamp: evaluation.timestamp,
            source: evaluation.source
          };
        }
      });
      
      // Ajouter les évaluations à l'exercice
      updatedExercise.trainerEvaluations = trainerEvaluations;
      updatedExercise.evaluatedAt = new Date().toISOString();
      updatedExercise.evaluatedBy = currentUser?.uid;
      
      // Marquer l'exercice comme évalué
      if (updatedExercise.status === 'submitted') {
        updatedExercise.status = 'evaluated';
      }
      
      // Sauvegarder dans Firestore
      await troisClesService.updateExercise(targetUserId, updatedExercise);
      
      console.log('✅ Évaluations publiées avec succès dans Firestore');
      
      // Nettoyer localStorage après publication réussie
      localStorage.removeItem(`evaluation_${targetUserId}`);
      console.log('🧹 localStorage nettoyé après publication');
      
      alert('Les évaluations ont été publiées avec succès !');
      
      // Recharger l'exercice pour avoir les données à jour
      window.location.reload();
    } catch (error) {
      console.error('❌ Erreur lors de la publication des évaluations:', error);
      alert('Erreur lors de la publication des évaluations');
    }
  }, [exercise, targetUserId, currentUser, localEvaluations]);

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
    console.log(`handleQuestionProjectiveChange: index=${index}, field=${field}, value=${value.substring(0, 20)}...`);
    if (!exercise) {
      console.error('Exercise is null, cannot update');
      return;
    }

    const newExercise = { ...exercise };
    console.log('Current exercise ID:', newExercise.id);
    console.log('Current exercise userId:', newExercise.userId);
    
    const section = newExercise.sections[4] || {
      id: 'questions_projectives',
      title: 'Questions Projectives',
      description: 'Questions projectives pour explorer les possibilités',
      questionsProjectives: []
    };
    
    if (!section.questionsProjectives) {
      console.log('Creating questionsProjectives array');
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
      console.log(`Creating new question at index ${index}`);
      section.questionsProjectives[index] = emptyQuestion;
    }

    const question = initializeQuestionProjective(section.questionsProjectives[index]);
    console.log('Before update:', question[field]);
    question[field] = value;
    console.log('After update:', question[field]);
    
    section.questionsProjectives[index] = question;
    newExercise.sections[4] = section;

    // Vérifier que l'ID utilisateur est correctement défini
    if (!newExercise.userId || newExercise.userId !== targetUserId) {
      console.log(`Fixing userId: ${newExercise.userId} -> ${targetUserId}`);
      newExercise.userId = targetUserId;
    }

    // Mettre à jour l'état local immédiatement
    setExercise(newExercise);
  };

  const handleImpactsChange = (value: string) => {
    if (!exercise) return;

    const newExercise = { ...exercise };
    const section = newExercise.sections[2] || {
      id: 'impacts_temporels',
      title: 'Impacts Temporels',
      description: 'Impacts temporels de la situation',
      impactsTemporels: { text: '', score: 0 as Score, trainerComment: '' }
    };
    
    if (!section.impactsTemporels) {
      section.impactsTemporels = { text: '', score: 0 as Score, trainerComment: '' };
    }

    section.impactsTemporels.text = value;
    newExercise.sections[2] = section;

    // Mettre à jour l'état local immédiatement
    setExercise(newExercise);
  };

  const handleBesoinsChange = (value: string) => {
    if (!exercise) return;

    const newExercise = { ...exercise };
    const section = newExercise.sections[3] || {
      id: 'besoins_solution',
      title: 'Besoins de Solution',
      description: 'Besoins de solution identifiés',
      besoinsSolution: { text: '', score: 0 as Score, trainerComment: '' }
    };
    
    if (!section.besoinsSolution) {
      section.besoinsSolution = { text: '', score: 0 as Score, trainerComment: '' };
    }

    section.besoinsSolution.text = value;
    newExercise.sections[3] = section;

    // Mettre à jour l'état local immédiatement
    setExercise(newExercise);
  };

  const handleQuestionExpliciteChange = (index: number, value: string) => {
    if (!exercise) return;

    const newExercise = { ...exercise };
    const section = newExercise.sections[0] || {
      id: 'questions_explicites',
      title: 'Questions Explicites',
      description: 'Questions explicites pour clarifier',
      questionsExplicites: []
    };
    
    if (!section.questionsExplicites) {
      section.questionsExplicites = [];
    }

    if (!section.questionsExplicites[index]) {
      section.questionsExplicites[index] = {
        text: '',
        score: 0 as Score,
        trainerComment: ''
      };
    }

    section.questionsExplicites[index].text = value;
    newExercise.sections[0] = section;

    // Mettre à jour l'état local immédiatement
    setExercise(newExercise);
  };

  const handleQuestionEvocatriceChange = (index: number, field: 'passe' | 'present' | 'futur', value: string) => {
    if (!exercise) return;

    const newExercise = { ...exercise };
    const section = newExercise.sections[1] || {
      id: 'questions_evocatrices',
      title: 'Questions Évocatrices',
      description: 'Questions évocatrices pour approfondir',
      questionsEvocatrices: []
    };
    
    if (!section.questionsEvocatrices) {
      section.questionsEvocatrices = [];
    }

    if (!section.questionsEvocatrices[index]) {
      section.questionsEvocatrices[index] = {
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

    section.questionsEvocatrices[index][field] = value;
    newExercise.sections[1] = section;

    // Mettre à jour l'état local immédiatement
    setExercise(newExercise);
  };

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
                  onClick={handlePublishEvaluation}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  Publier les évaluations
                </Button>
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
                    onChange={(e) => handleQuestionExpliciteChange(index, e.target.value)}
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
              <p>Posez 3 questions de Problème Évocatrices pour chaque colonne: Passé + Actuel + Futur (9 au total)</p>
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
                      onChange={(e) => handleQuestionEvocatriceChange(index, 'passe', e.target.value)}
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
                      onChange={(e) => handleQuestionEvocatriceChange(index, 'present', e.target.value)}
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
                      onChange={(e) => handleQuestionEvocatriceChange(index, 'futur', e.target.value)}
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
                  onChange={(e) => handleImpactsChange(e.target.value)}
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
                  onChange={(e) => handleBesoinsChange(e.target.value)}
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
