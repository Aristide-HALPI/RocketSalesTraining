import { useSearchParams } from 'react-router-dom';
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
  status?: 'not_started' | 'in_progress' | 'submitted' | 'evaluated';
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

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <div className="w-full p-8">
        <div className="max-w-7xl mx-auto">
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
