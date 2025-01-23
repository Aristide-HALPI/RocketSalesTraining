import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ExerciseTemplateProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function ExerciseTemplate({ title, description, children }: ExerciseTemplateProps) {
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{description}</p>
        {userName && (
          <p className="text-sm text-gray-500 mb-6">
            Exercice pour: {userName}
          </p>
        )}
        <div className="bg-white rounded-lg shadow-md p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
