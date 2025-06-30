import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { objectionsService, ObjectionsExercise, ObjectionEntry } from '../features/objections/services/objectionsService';
import { useAuth } from '../contexts/AuthContext';
import { ExerciseTemplate } from '../components/ExerciseTemplate';
import './objections.css'; // Ajout du fichier CSS personnalisé

const OBJECTION_TYPES = [
  { value: 'le malentendu', label: 'Le malentendu' },
  { value: 'le doute', label: 'Le doute' },
  { value: "l'hésitation", label: "L'hésitation" },
  { value: 'le désintéressement', label: 'Le désintéressement' },
  { value: "l'objection irréfutable", label: "L'objection irréfutable" }
];

const JUSTIFICATIONS = [
  { 
    value: "je dois lui expliquer qu'il ne s'agit en fait que d'un malentendu et je doit le rassurer que notre solution/société peut répondre à ses besoins",
    label: "Je dois lui expliquer qu'il ne s'agit en fait que d'un malentendu et je doit le rassurer que notre solution/société peut répondre à ses besoins"
  },
  {
    value: "je dois lèver le doute en apportant une preuve",
    label: "Je dois lever le doute en apportant une preuve"
  },
  {
    value: "j'aide à la décision en créant l'urgence en expliquant les bénéfices en utilisant notre solution plus rapidement",
    label: "J'aide à la décision en créant l'urgence en expliquant les bénéfices en utilisant notre solution plus rapidement"
  },
  {
    value: "j'aide à la décision en lui proposant de prendre une décision sur une partie de la solution (et pas toute la solution)",
    label: "J'aide à la décision en lui proposant de prendre une décision sur une partie de la solution (et pas toute la solution)"
  },
  {
    value: "il ne me reste plus qu'à challenger le client et si nécessaire qu'il m'explique la vraie raison de ce désintéressement",
    label: "Il ne me reste plus qu'à challenger le client et si nécessaire qu'il m'explique la vraie raison de ce désintéressement"
  },
  {
    value: "je dois absolument lui rappeler les bénéfices de la solution proposée, en les maximisant, tout en minimisant l'objection",
    label: "Je dois absolument lui rappeler les bénéfices de la solution proposée, en les maximisant, tout en minimisant l'objection"
  },
  {
    value: "j'aide à la décision en donnant un fait concret sur la solution concurrente sans dénigrer et de manière éthique",
    label: "J'aide à la décision en donnant un fait concret sur la solution concurrente sans dénigrer et de manière éthique"
  },
  {
    value: "j'aide à la décision en lui demandant ce qu'il lui manque pour prendre une décision maintenant",
    label: "J'aide à la décision en lui demandant ce qu'il lui manque pour prendre une décision maintenant"
  }
];

const Objections = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentId = searchParams.get('userId');
  const targetUserId = studentId || currentUser?.uid;
  const isViewMode = !!studentId;

  const [exercise, setExercise] = useState<ObjectionsExercise | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;

    const loadExercise = async () => {
      try {
        const loadedExercise = await objectionsService.getExercise(targetUserId);
        console.log('Loaded exercise:', loadedExercise);
        if (!loadedExercise.sections) {
          console.error('No sections in loaded exercise');
        }
        setExercise(loadedExercise);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'exercice:', err);
      }
    };

    loadExercise();

    const unsubscribe = objectionsService.subscribeToExercise(targetUserId, (updatedExercise) => {
      console.log('Updated exercise:', updatedExercise);
      if (!updatedExercise.sections) {
        console.error('No sections in updated exercise');
      }
      setExercise(updatedExercise);
    });

    return () => {
      unsubscribe();
    };
  }, [targetUserId]);

  console.log('Current exercise state:', exercise);
  console.log('Exercise sections:', exercise?.sections);
  console.log('isViewMode:', isViewMode);
  console.log('exercise status:', exercise?.status);
  console.log('Should show button:', !isViewMode && exercise?.status !== 'submitted');

  const handleTypeChange = (index: number, value: string) => {
    if (!exercise || !targetUserId || isViewMode) return;

    const updatedExercise = { ...exercise };
    updatedExercise.sections[index].type = value;
    
    // Mise à jour du statut si c'est la première réponse
    if (exercise.status === 'not_started') {
      updatedExercise.status = 'in_progress';
    }

    setExercise(updatedExercise);
    objectionsService.updateExercise(targetUserId, updatedExercise);
  };

  const handleJustificationChange = (index: number, value: string) => {
    if (!exercise || !targetUserId || isViewMode) return;

    const updatedExercise = { ...exercise };
    updatedExercise.sections[index].justification = value;
    
    // Mise à jour du statut si c'est la première réponse
    if (exercise.status === 'not_started') {
      updatedExercise.status = 'in_progress';
    }

    setExercise(updatedExercise);
    objectionsService.updateExercise(targetUserId, updatedExercise);
  };

  const handleSubmit = async () => {
    if (!targetUserId || isViewMode) return;

    try {
      setLoading(true);
      await objectionsService.submitExercise(targetUserId);
      
      if (exercise) {
        setExercise({
          ...exercise,
          status: 'submitted'
        });
      }
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExerciseTemplate
      title="Objections"
      description="Sur base de ces informations, dites parmi ces objections clients, quel type d'objection il s'agit, et dites quelle technique principale vous allez alors utiliser."
      maxScore={50}
    >
      <div className="w-full">
        <div className="bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg p-6 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Objections</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/90 p-6 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-purple-800">Votre score</h3>
              {exercise?.score !== undefined ? (
                <p className="text-2xl font-bold text-purple-900">{exercise.score}/50</p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-purple-900">-</p>
                  <p className="text-sm text-purple-600">(max 50 points)</p>
                </>
              )}
            </div>
            
            <div className="bg-white/90 p-6 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-teal-800">Statut de l'exercice</h3>
              <p className="text-2xl font-bold text-teal-900">
                {exercise?.status === 'not_started' && 'À débuter'}
                {exercise?.status === 'in_progress' && 'En cours'}
                {exercise?.status === 'submitted' && 'En attente de correction'}
                {exercise?.status === 'evaluated' && 'Corrigé'}
                {exercise?.status === 'pending_validation' && 'En attente de validation'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-4 px-6 font-medium text-gray-700 w-1/3">Objection</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700 w-1/3">Type d'objection</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700 w-1/3">Justification</th>
                </tr>
              </thead>
              <tbody>
                {exercise?.sections?.map((section: ObjectionEntry, index: number) => (
                  <tr key={index} className="border-t">
                    <td className="py-4 px-6">
                      <p className="text-gray-800">{section.text}</p>
                    </td>
                    <td className="py-4 px-6">
                      {exercise?.status === 'submitted' ? (
                        <div className="w-full p-2 border rounded-md bg-white whitespace-normal break-words">
                          {OBJECTION_TYPES.find(type => type.value === section.type)?.label || section.type || 'Non répondu'}
                        </div>
                      ) : (
                        <select
                          className="w-full p-2 border rounded-md bg-white"
                          value={section.type || ''}
                          onChange={(e) => handleTypeChange(index, e.target.value)}
                          disabled={isViewMode}
                        >
                          <option value="">Sélectionner...</option>
                          {OBJECTION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {exercise?.status === 'submitted' && (
                        <div className="mt-2">
                          <div className={`text-sm ${section.type === section.correctType ? 'text-green-600' : 'text-red-600'}`}>
                            {section.type === section.correctType ? (
                              <p>✓ Correct</p>
                            ) : (
                              <div className="whitespace-normal break-words">
                                <p>✗ Incorrect - La bonne réponse était:</p>
                                <p className="mt-1 font-medium">{section.correctType}</p>
                              </div>
                            )}
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-700">Votre réponse:</p>
                            <p className="whitespace-normal break-words text-sm">{section.type}</p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {exercise?.status === 'submitted' ? (
                        <div className="w-full p-2 border rounded-md bg-white whitespace-normal break-words">
                          {JUSTIFICATIONS.find(j => j.value === section.justification)?.label || section.justification || 'Non répondu'}
                        </div>
                      ) : (
                        <select
                          className="w-full p-2 border rounded-md bg-white"
                          value={section.justification || ''}
                          onChange={(e) => handleJustificationChange(index, e.target.value)}
                          disabled={isViewMode}
                        >
                          <option value="">Sélectionnez votre justification...</option>
                          {JUSTIFICATIONS.map((justification) => (
                            <option key={justification.value} value={justification.value}>
                              {justification.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {exercise?.status === 'submitted' && (
                        <div className="mt-2">
                          <div className={`text-sm ${section.justification === section.correctJustification ? 'text-green-600' : 'text-red-600'}`}>
                            {section.justification === section.correctJustification ? (
                              <p>✓ Correct</p>
                            ) : (
                              <div className="whitespace-normal break-words">
                                <p>✗ Incorrect - La bonne réponse était:</p>
                                <p className="mt-1 font-medium">{section.correctJustification}</p>
                              </div>
                            )}
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-700">Votre réponse:</p>
                            <p className="whitespace-normal break-words text-sm">{section.justification}</p>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!isViewMode && (
          <div className="flex justify-end gap-4 mt-8">
            {(!isViewMode && exercise?.status !== 'submitted') && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? 'Soumission...' : 'Soumettre'}
              </button>
            )}
          </div>
        )}
      </div>
    </ExerciseTemplate>
  );
}

export default Objections;
