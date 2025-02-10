import { FC, useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ExerciseStatus } from '../types/exercises';

const Solution: FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    solutionName: '',
    description: ''
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    try {
      setIsSubmitting(true);
      
      // Créer un exercice dans la collection exercises
      await addDoc(collection(db, `users/${currentUser.uid}/exercises`), {
        title: formData.solutionName,
        description: formData.description,
        solution: formData.companyName,
        type: 'solution',
        status: ExerciseStatus.Evaluated,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        lastUpdated: new Date().toISOString()
      });

      setShowSuccess(true);
      // Attendre 1.5 secondes avant de rediriger pour montrer le message de succès
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la solution:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4">
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="font-medium">Solution enregistrée avec succès!</p>
        </div>
      )}

      <div className="py-4">
        <Link
          to="/"
          className="inline-flex items-center text-teal-600 hover:text-teal-700"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Retour au tableau de bord
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 w-full">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-[1200px] mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-blue-600 mb-2">
              Dans le cadre de ces exercices en ligne, choisissez une solution et décrivez-la le plus complètement possible.
            </h1>
            <p className="text-gray-600">
              Il s'agit d'une réponse libre qui permettra au correcteur de mieux comprendre la pertinence de vos réponses dans les exercices.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-gray-700 font-medium mb-1">
                Nom de votre société
              </label>
              <input
                type="text"
                id="companyName"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Entrez le nom de votre société"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="solutionName" className="block text-gray-700 font-medium mb-1">
                Nom de la solution choisie pour les exercices
              </label>
              <p className="text-sm text-gray-500 mb-2">(choisissez donc 1 seule solution)</p>
              <input
                type="text"
                id="solutionName"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Entrez le nom de votre solution"
                value={formData.solutionName}
                onChange={(e) => setFormData({ ...formData, solutionName: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-gray-700 font-medium mb-1">
                Description de la solution choisie
              </label>
              <p className="text-sm text-gray-500 mb-2">(ne faites pas un pitch de "toutes" vos solutions ou de votre société)</p>
              <textarea
                id="description"
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Décrivez votre solution..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Envoi en cours...' : 'Soumettre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Solution;
