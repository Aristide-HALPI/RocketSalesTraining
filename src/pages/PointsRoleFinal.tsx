import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ExerciseTemplate } from '../components/ExerciseTemplate';
import { roleplayService, type RoleplayExercise, type ScoreItem } from '../features/roleplay/services/roleplayService';
import { Button } from '../components/ui/button';
import { toast } from 'react-hot-toast';

interface ScoreItemProps {
  name: string;
  score: number;
  maxPoints: number;
  level: 1 | 2 | 2.5 | 3;
  onChange: (value: string) => void;
  disabled: boolean;
  saving: boolean;
}

const ScoreItemComponent: React.FC<ScoreItemProps> = ({ name, score, maxPoints, level, onChange, disabled, saving }) => {
  const getLevelStyle = () => {
    switch (level) {
      case 1:
        return 'bg-pink-500 text-white font-semibold text-lg pl-4';
      case 2:
        return 'bg-teal-50 font-medium pl-8';
      case 2.5:
        return 'bg-teal-50/50 pl-10';
      case 3:
        return 'pl-12';
      default:
        return '';
    }
  };

  return (
    <div className={`p-3 rounded-lg flex justify-between items-center ${getLevelStyle()}`}>
      <span className="flex-1">{name}</span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={score}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '' || /^\d+$/.test(value)) {
              onChange(value);
            }
          }}
          disabled={disabled || saving}
          className="w-16 text-right rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="w-12 text-right">/ {maxPoints}</span>
      </div>
    </div>
  );
};

export default function PointsRoleFinal() {
  console.log('=== Montage du composant PointsRoleFinal ===');
  
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';

  console.log('Auth:', { currentUser, userProfile, isFormateur });
  console.log('URL params:', { targetUserId });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercise, setExercise] = useState<RoleplayExercise | null>(null);
  const [localScores, setLocalScores] = useState<{[key: string]: number}>({});
  const [parentScores, setParentScores] = useState<{[key: string]: number}>({});
  const [saving, setSaving] = useState(false);
  const [updateTimeout, setUpdateTimeout] = useState<NodeJS.Timeout | null>(null);

  // Vérifier si l'utilisateur est autorisé
  useEffect(() => {
    console.log('=== Vérification des autorisations ===');
    if (!currentUser) {
      console.log('Pas d\'utilisateur connecté');
      navigate('/login');
      return;
    }

    console.log('Autorisations OK');
  }, [currentUser, navigate]);

  // Charger l'exercice
  useEffect(() => {
    console.log('=== Effect de chargement ===');
    // Utiliser l'ID de l'utilisateur courant si aucun targetUserId n'est fourni
    const userIdToLoad = targetUserId || currentUser?.uid;
    
    if (!userIdToLoad) {
      console.error('Erreur: Impossible de déterminer l\'ID utilisateur');
      setError('ID utilisateur manquant');
      setLoading(false);
      return;
    }

    console.log('Chargement pour userId:', userIdToLoad, 'isFormateur:', isFormateur);

    const loadExercise = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Tentative de chargement de l\'exercice...');
        
        let exercise = await roleplayService.getExercise(userIdToLoad);
        console.log('Résultat du chargement:', exercise);
        
        if (exercise) {
          setExercise(exercise);
          
          // Initialiser les scores locaux
          const scores: {[key: string]: number} = {};
          exercise.sections.forEach(section => {
            section.items.forEach(item => {
              scores[item.name] = item.score;
            });
          });
          setLocalScores(scores);
          setParentScores(scores);
        } else {
          setError('Exercice non trouvé');
        }
      } catch (error) {
        console.error('Erreur lors du chargement:', error);
        setError('Erreur lors du chargement de l\'exercice');
      } finally {
        setLoading(false);
      }
    };

    loadExercise();
  }, [currentUser?.uid, targetUserId, isFormateur]);

  const updateParentScores = useCallback(() => {
    if (!exercise) return;

    const newParentScores: {[key: string]: number} = {};
    
    // Calcul pour "Passer le Goalkeeper" (somme des 5 sous-items)
    const goalkeeperScore = [0, 1, 2, 3, 4].reduce((sum, index) => {
      return sum + (localScores[`0-${index}`] || 0);
    }, 0);
    newParentScores['goalkeeper'] = goalkeeperScore;

    // Calcul pour la section PROSPECTION
    const prospectionScore = (
      goalkeeperScore + // Passer le Goalkeeper
      (localScores['1-0'] || 0) + // Prise de Rendez-vous avec le Décideur
      (localScores['2-0'] || 0) + // Accroche Irrésistible
      (localScores['3-0'] || 0) + // Demandez un rendez-vous
      (localScores['3-1'] || 0) + // Demandez son adresse email
      (localScores['3-2'] || 0)   // Réagissez aux OBJECTIONS
    );
    newParentScores['section-0'] = prospectionScore;

    // Calcul pour la section QUALIFICATION
    if (exercise.sections[4]) {
      // Structure du meeting (somme des items 1 à 5)
      const structureScore = exercise.sections[4].items.slice(1, 6).reduce((sum, _, index) => {
        return sum + (localScores[`4-${index + 1}`] || 0);
      }, 0);
      newParentScores['structure-meeting'] = structureScore;

      // Qualification EOMBUS-PAF-I (somme des items après l'index 6)
      const qualificationScore = exercise.sections[4].items.slice(7).reduce((sum, _, index) => {
        return sum + (localScores[`4-${index + 7}`] || 0);
      }, 0);
      newParentScores['qualification-eombus'] = qualificationScore;

      // Score total de la section QUALIFICATION
      newParentScores['section-4'] = structureScore + qualificationScore;
    }

    // Calcul des autres sections (1, 2, 3, 5, 6)
    [1, 2, 3, 5, 6].forEach(sectionIndex => {
      const section = exercise.sections[sectionIndex];
      if (!section) return;

      const sectionScore = section.items.reduce((sum, _, itemIndex) => {
        return sum + (localScores[`${sectionIndex}-${itemIndex}`] || 0);
      }, 0);
      newParentScores[`section-${sectionIndex}`] = sectionScore;
    });

    // Calcul du score total
    const totalScore = [0, 1, 2, 3, 4, 5, 6].reduce((total, sectionIndex) => {
      return total + (newParentScores[`section-${sectionIndex}`] || 0);
    }, 0);
    newParentScores['total'] = totalScore;

    console.log('Nouveaux scores parents:', newParentScores);
    setParentScores(newParentScores);
  }, [exercise, localScores]);

  const getScoreValue = useCallback((sectionIndex: number, itemIndex: number) => {
    const scoreKey = `${sectionIndex}-${itemIndex}`;
    
    // Pour "Passer le Goalkeeper", utiliser le score calculé
    if (sectionIndex === 0 && itemIndex === 0) {
      return parentScores['goalkeeper'] || 0;
    }
    
    // Pour les items de niveau 2 dans la section QUALIFICATION
    if (sectionIndex === 4) {
      if (itemIndex === 0) return parentScores['structure-meeting'] || 0;
      if (itemIndex === 6) return parentScores['qualification-eombus'] || 0;
    }
    
    // Pour les scores de base (niveau 3)
    return localScores[scoreKey] || 0;
  }, [localScores, parentScores]);

  const getSectionScore = useCallback((sectionIndex: number) => {
    return parentScores[`section-${sectionIndex}`] || 0;
  }, [parentScores]);

  const handleScoreChange = useCallback((sectionIndex: number, itemIndex: number, value: string) => {
    if (!exercise || !isFormateur || !targetUserId) return;

    const scoreKey = `${sectionIndex}-${itemIndex}`;
    const maxPoints = exercise.sections[sectionIndex].items[itemIndex].maxPoints;
    const numValue = value === '' ? 0 : Math.min(Math.max(0, parseInt(value) || 0), maxPoints);

    console.log('Mise à jour du score:', { sectionIndex, itemIndex, value: numValue, maxPoints });
    
    setLocalScores(prev => ({
      ...prev,
      [scoreKey]: numValue
    }));

    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        const newSections = exercise.sections.map((section, secIndex) => {
          const sectionItems = section.items.map((item, itemIdx) => ({
            ...item,
            score: getScoreValue(secIndex, itemIdx)
          }));

          return {
            ...section,
            items: sectionItems,
            totalScore: sectionItems.reduce((sum, item) => sum + item.score, 0)
          };
        });

        await roleplayService.updateExercise(targetUserId, {
          sections: newSections,
          totalScore: parentScores['total'] || 0,
          status: 'in_progress'
        });
      } catch (error) {
        console.error('Erreur lors de la mise à jour du score:', error);
        toast.error('Erreur lors de la mise à jour du score');
      }
    }, 500);

    setUpdateTimeout(timeout);
  }, [exercise, isFormateur, targetUserId, updateTimeout, getScoreValue, parentScores]);

  const renderScoreItem = useCallback((item: ScoreItem, index: number, sectionIndex: number, level: 1 | 2 | 2.5 | 3) => {
    const isParentItem = level === 2;
    const score = getScoreValue(sectionIndex, index);

    return (
      <ScoreItemComponent
        key={`${sectionIndex}-${index}`}
        name={item.name}
        score={score}
        maxPoints={item.maxPoints}
        level={level}
        onChange={(value) => handleScoreChange(sectionIndex, index, value)}
        disabled={!isFormateur || isParentItem}
        saving={saving}
      />
    );
  }, [isFormateur, saving, getScoreValue, handleScoreChange]);

  const handleSubmit = useCallback(async () => {
    if (!exercise || !isFormateur || !targetUserId || !currentUser) return;

    try {
      setSaving(true);
      await roleplayService.updateExercise(targetUserId, {
        status: 'evaluated',
        evaluatedBy: currentUser.uid
      });
      toast.success('Évaluation soumise avec succès');
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      toast.error('Erreur lors de la soumission de l\'évaluation');
    } finally {
      setSaving(false);
    }
  }, [exercise, isFormateur, targetUserId, currentUser, navigate]);

  useEffect(() => {
    updateParentScores();
  }, [localScores, updateParentScores]);

  // Rendu conditionnel
  if (loading) {
    console.log('Affichage du loader...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Chargement de l'exercice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('Affichage de l\'erreur:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-red-500">{error}</p>
          {!isFormateur && (
            <p className="mt-2">Veuillez contacter votre formateur</p>
          )}
        </div>
      </div>
    );
  }

  if (!exercise) {
    console.log('Pas d\'exercice disponible');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-red-500">Impossible de charger l'exercice</p>
          {!isFormateur && (
            <p className="mt-2">Veuillez contacter votre formateur</p>
          )}
        </div>
      </div>
    );
  }

  console.log('=== Rendu de l\'exercice ===');
  console.log('Exercise:', exercise);
  console.log('LocalScores:', localScores);

  return (
    <ExerciseTemplate
      title="Points - Jeu de Rôle final"
      description="Grille d'évaluation du jeu de rôle final"
      maxScore={680}
    >
      <div className="space-y-6 p-4">
        <div className="bg-gradient-to-r from-purple-100 via-blue-100 to-green-100 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Score Total</h2>
            <div className="text-xl font-bold">
              {parentScores['total']} sur 680 points
            </div>
          </div>
        </div>

        {!isFormateur && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-yellow-800">
              Cet exercice sera évalué par votre formateur. Vous ne pouvez pas modifier les scores.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {/* PROSPECTION */}
          <ScoreItemComponent
            name="PROSPECTION"
            score={getSectionScore(0)}
            maxPoints={190}
            level={1}
            onChange={() => {}}
            disabled={true}
            saving={saving}
          />
          {exercise.sections[0]?.items && (
            <>
              <ScoreItemComponent
                name="Passer le Goalkeeper"
                score={getScoreValue(0, 0)}
                maxPoints={50}
                level={2}
                onChange={(value) => handleScoreChange(0, 0, value)}
                disabled={!isFormateur}
                saving={saving}
              />
              {exercise.sections[0].items.slice(1).map((item, index) => (
                <ScoreItemComponent
                  key={index}
                  name={item.name}
                  score={getScoreValue(0, index + 1)}
                  maxPoints={item.maxPoints}
                  level={3}
                  onChange={(value) => handleScoreChange(0, index + 1, value)}
                  disabled={!isFormateur}
                  saving={saving}
                />
              ))}
            </>
          )}

          {/* Prise de Rendez-vous */}
          <ScoreItemComponent
            name="Prise de Rendez-vous avec le Décideur"
            score={getSectionScore(1)}
            maxPoints={30}
            level={2}
            onChange={() => {}}
            disabled={true}
            saving={saving}
          />
          {exercise.sections[1]?.items?.map((item, index) => (
            <ScoreItemComponent
              key={index}
              name={item.name}
              score={getScoreValue(1, index)}
              maxPoints={item.maxPoints}
              level={3}
              onChange={(value) => handleScoreChange(1, index, value)}
              disabled={!isFormateur}
              saving={saving}
            />
          ))}

          {/* Accroche Irrésistible */}
          <ScoreItemComponent
            name="Accroche Irrésistible"
            score={getSectionScore(2)}
            maxPoints={70}
            level={2}
            onChange={() => {}}
            disabled={true}
            saving={saving}
          />
          {exercise.sections[2]?.items?.map((item, index) => (
            <ScoreItemComponent
              key={index}
              name={item.name}
              score={getScoreValue(2, index)}
              maxPoints={item.maxPoints}
              level={3}
              onChange={(value) => handleScoreChange(2, index, value)}
              disabled={!isFormateur}
              saving={saving}
            />
          ))}

          {/* Actions intermédiaires */}
          {exercise.sections[3]?.items && [
            "Demandez un rendez-vous (en incluant la technique de l'alternative)",
            "Demandez son adresse email + son numéro de mobile",
            "Réagissez aux OBJECTIONS de contact, en utilisant la technique s'iieX"
          ].map((name, index) => (
            <ScoreItemComponent
              key={index}
              name={name}
              score={getScoreValue(3, index)}
              maxPoints={exercise.sections[3].items[index]?.maxPoints || 0}
              level={2.5}
              onChange={(value) => handleScoreChange(3, index, value)}
              disabled={!isFormateur}
              saving={saving}
            />
          ))}

          {/* QUALIFICATION */}
          <ScoreItemComponent
            name="QUALIFICATION"
            score={getSectionScore(4)}
            maxPoints={340}
            level={1}
            onChange={() => {}}
            disabled={true}
            saving={saving}
          />

          {/* Structure du meeting */}
          <ScoreItemComponent
            name="Structure du meeting"
            score={parentScores['structure-meeting']}
            maxPoints={50}
            level={2}
            onChange={() => {}}
            disabled={true}
            saving={saving}
          />
          {exercise.sections[4]?.items.slice(1, 6).map((item, index) => (
            renderScoreItem(item, index, 4, 3)
          ))}
          <ScoreItemComponent
            name="Qualification (EOMBUS-PAF-I)"
            score={parentScores['qualification-eombus']}
            maxPoints={290}
            level={2}
            onChange={() => {}}
            disabled={true}
            saving={saving}
          />
          {exercise.sections[4]?.items.slice(7).map((item, index) => (
            renderScoreItem(item, index, 4, 3)
          ))}

          {/* PRÉSENTATION DES SOLUTIONS */}
          <ScoreItemComponent
            name="PRÉSENTATION DES SOLUTIONS"
            score={getSectionScore(5)}
            maxPoints={60}
            level={1}
            onChange={() => {}}
            disabled={true}
            saving={saving}
          />
          <ScoreItemComponent
            name="Présentez votre solution en présentant quelques caractéristiques dont le client aura besoin et présentez 3 Bénéfices clients"
            score={getScoreValue(5, 0)}
            maxPoints={60}
            level={3}
            onChange={(value) => handleScoreChange(5, 0, value)}
            disabled={!isFormateur}
            saving={saving}
          />

          {/* CONCLUSION et (NÉGOCIATION) */}
          <ScoreItemComponent
            name="CONCLUSION et (NÉGOCIATION)"
            score={getSectionScore(6)}
            maxPoints={90}
            level={1}
            onChange={() => {}}
            disabled={true}
            saving={saving}
          />
          {exercise.sections[6]?.items.map((item, index) => (
            <ScoreItemComponent
              key={index}
              name={item.name}
              score={getScoreValue(6, index)}
              maxPoints={item.maxPoints}
              level={3}
              onChange={(value) => handleScoreChange(6, index, value)}
              disabled={!isFormateur}
              saving={saving}
            />
          ))}
        </div>

        {isFormateur && (
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {saving ? 'Enregistrement...' : 'Soumettre l\'évaluation'}
            </Button>
          </div>
        )}
      </div>
    </ExerciseTemplate>
  );
}
