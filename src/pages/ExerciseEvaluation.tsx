import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Button } from '../components/ui/button';
import { Save, ArrowLeft } from 'lucide-react';

interface EvaluationCriteria {
  id: string;
  label: string;
  maxScore: number;
  score: number;
}

interface Exercise {
  id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  content?: string;
  score?: number;
  feedback?: string;
  criteria?: EvaluationCriteria[];
  lastUpdated?: Date;
}

export default function ExerciseEvaluation() {
  const { userId, exerciseId } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [feedback, setFeedback] = useState('');
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([
    { id: '1', label: 'Compréhension du sujet', maxScore: 25, score: 0 },
    { id: '2', label: 'Qualité de l\'analyse', maxScore: 25, score: 0 },
    { id: '3', label: 'Pertinence des solutions', maxScore: 25, score: 0 },
    { id: '4', label: 'Clarté de la présentation', maxScore: 25, score: 0 },
  ]);

  const db = getFirestore();

  useEffect(() => {
    const redirectToExercise = async () => {
      if (!userId || !exerciseId) return;

      try {
        // Si l'ID de l'exercice commence par "goalkeeper", rediriger vers la feature goalkeeper
        if (exerciseId === 'goalkeeper') {
          navigate(`/goalkeeper/${userId}`);
          return;
        }

        // Pour les autres types d'exercices, vérifier le type dans la base de données
        const exerciseRef = doc(db, 'exercises', exerciseId);
        const exerciseSnap = await getDoc(exerciseRef);
        
        if (exerciseSnap.exists()) {
          const data = exerciseSnap.data();
          switch (data.type) {
            case 'goalkeeper':
              navigate(`/goalkeeper/${userId}`);
              break;
            // Ajouter d'autres cas ici si nécessaire
            default:
              // Pour les exercices standards
              // TODO: Implémenter l'évaluation standard
              console.error('Type d\'exercice non géré:', data.type);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la redirection:', error);
      }
    };

    redirectToExercise();
  }, [userId, exerciseId, navigate]);

  useEffect(() => {
    const fetchExercise = async () => {
      if (!userId || !exerciseId) return;

      const exerciseRef = doc(db, 'userExercises', exerciseId);
      const exerciseSnap = await getDoc(exerciseRef);

      if (exerciseSnap.exists()) {
        const data = exerciseSnap.data() as Exercise;
        setExercise(data);
        setFeedback(data.feedback || '');
        if (data.criteria) {
          setCriteria(data.criteria);
        }
      }
    };

    fetchExercise();
  }, [db, userId, exerciseId]);

  const handleScoreChange = (criteriaId: string, score: number) => {
    setCriteria(prevCriteria =>
      prevCriteria.map(c =>
        c.id === criteriaId ? { ...c, score: Math.min(score, c.maxScore) } : c
      )
    );
  };

  const getTotalScore = () => {
    return criteria.reduce((total, c) => total + c.score, 0);
  };

  const handleSave = async () => {
    if (!userId || !exerciseId) return;

    const exerciseRef = doc(db, 'userExercises', exerciseId);
    await updateDoc(exerciseRef, {
      score: getTotalScore(),
      feedback,
      criteria,
      status: 'completed',
      lastUpdated: new Date()
    });

    navigate('/members');
  };

  if (!exercise) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => navigate('/members')}
            variant="ghost"
            className="text-gray-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">
            Évaluation de l'exercice : {exercise.title}
          </h1>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {/* Contenu de l'exercice */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Réponse de l'apprenant
              </h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {exercise.content || 'Aucune réponse fournie'}
                </p>
              </div>
            </div>

            {/* Grille d'évaluation */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Grille d'évaluation
              </h3>
              <div className="space-y-4">
                {criteria.map((criterion) => (
                  <div key={criterion.id} className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      {criterion.label} (max: {criterion.maxScore})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={criterion.maxScore}
                      value={criterion.score}
                      onChange={(e) => handleScoreChange(criterion.id, parseInt(e.target.value) || 0)}
                      className="w-20 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-gray-900">Note totale</span>
                    <span className="text-2xl text-teal-600">{getTotalScore()}/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Commentaires */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Commentaires
              </h3>
              <textarea
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                placeholder="Ajoutez vos commentaires ici..."
              />
            </div>

            {/* Bouton de sauvegarde */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Enregistrer l'évaluation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
