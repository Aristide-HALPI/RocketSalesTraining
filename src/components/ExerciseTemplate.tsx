import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ExerciseTemplateProps {
  title: string;
  description: string;
  children?: React.ReactNode;
  currentScore?: number;
  maxScore: number;
  hideScore?: boolean;
  status?: 'not_started' | 'in_progress' | 'submitted' | 'evaluated' | 'pending_validation';
  onSubmit?: () => Promise<void>;
  canSubmit?: boolean;
  aiEvaluation?: any;
}

export function ExerciseTemplate({ 
  title, 
  description, 
  children,
  currentScore,
  maxScore,
  hideScore = false,
  status,
  onSubmit,
  canSubmit,
  aiEvaluation
}: ExerciseTemplateProps) {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const fetchUserName = async () => {
      if (!userId) return;
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUserName(userDoc.data().name || '');
      }
    };

    fetchUserName();
  }, [userId]);

  const navigate = useNavigate();

  const handleBackClick = () => {
    // Si on a un userId dans l'URL, c'est qu'on consulte l'exercice d'un apprenant
    if (userId) {
      // Rediriger vers la liste des exercices de l'apprenant
      navigate(`/student-exercises/${userId}`);
    } else {
      // Sinon, comportement par défaut (retour à la page précédente)
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <div className="w-full p-8">
        <div className="max-w-7xl mx-auto">
          {/* Bouton de retour */}
          <div className="py-4">
            <button
              onClick={handleBackClick}
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
            </button>
          </div>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  {userName && (
                    <p className="mt-1 text-sm text-gray-500">
                      Étudiant : {userName}
                    </p>
                  )}
                </div>
                {!hideScore && currentScore !== undefined && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Score :</p>
                    <p className="text-lg font-semibold">
                      {currentScore} / {maxScore}
                    </p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-gray-600">{description}</p>
            </div>
            <div className="px-6 py-4">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
