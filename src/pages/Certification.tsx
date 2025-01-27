import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { certificationService, type CertificationData } from '../features/certification/services/certificationService';
import { toast } from 'react-hot-toast';

export default function Certification() {
  console.log('Component Certification rendered');
  
  const { userId } = useParams<{ userId: string }>();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [certificationData, setCertificationData] = useState<CertificationData | null>(null);
  const [comment, setComment] = useState('');
  const [isTrainer, setIsTrainer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Rediriger vers l'URL avec l'ID de l'utilisateur si on est sur /certification
  useEffect(() => {
    if (!userId && currentUser?.uid && !loading) {
      navigate(`/certification/${currentUser.uid}`);
    }
  }, [userId, currentUser?.uid, navigate, loading]);

  console.log('Current state:', { userId, currentUser, certificationData, comment, isTrainer, loading, authLoading });

  useEffect(() => {
    console.log('useEffect triggered with:', { userId, userRole: userProfile?.role });
    
    const fetchData = async () => {
      if (!userId) {
        console.log('No userId, skipping fetch');
        return;
      }

      try {
        console.log('Starting data fetch for user:', userId);
        
        setIsTrainer(userProfile?.role === 'trainer');
        console.log('Is trainer:', userProfile?.role === 'trainer');

        // Récupérer d'abord les données existantes
        console.log('Fetching existing certification data');
        const existingData = await certificationService.getCertificationData(userId);
        console.log('Existing certification data:', existingData);
        
        if (existingData.status !== 'completed') {
          console.log('Status not completed, calculating scores');
          const updatedData = await certificationService.calculateAndUpdateScores(userId);
          console.log('Updated certification data:', updatedData);
          
          setCertificationData(updatedData);
          setComment(updatedData.trainerComment || '');
        } else {
          console.log('Status completed, using existing data');
          setCertificationData(existingData);
          setComment(existingData.trainerComment || '');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, userProfile?.role]); // Dépendre uniquement de userId et userProfile.role

  const handleCommentSubmit = async () => {
    if (!userId) return;

    try {
      console.log('Saving comment:', comment);
      await certificationService.updateTrainerComment(userId, comment);
      toast.success('Commentaire sauvegardé');
    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error('Erreur lors de la sauvegarde du commentaire');
    }
  };

  if (loading || authLoading) {
    console.log('Showing loading spinner:', { loading, authLoading });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const formatPercentage = (score: number, maxScore: number) => {
    if (maxScore === 0) return 'NaN%';
    return `${((score / maxScore) * 100).toFixed(2)}%`;
  };

  console.log('Rendering certification page with data:', certificationData);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-600 mb-8">
          Votre score pour la Certification
        </h1>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* En-tête du tableau */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-100 font-semibold text-gray-700">
            <div className="col-span-1"></div>
            <div className="text-center">Vos points</div>
            <div className="text-center">Maximum</div>
            <div className="text-center">Pourcentage</div>
          </div>

          {/* Lignes du tableau */}
          <div className="divide-y divide-gray-200">
            {/* Score exercices en ligne */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50">
              <div className="col-span-1">
                Votre score total pour les exercices en ligne est de
              </div>
              <div className="text-center bg-green-100 p-2 rounded">
                {certificationData?.onlineExercisesScore.toFixed(2) || '0.00'}
              </div>
              <div className="text-center bg-blue-100 p-2 rounded">
                490
              </div>
              <div className="text-center bg-pink-100 p-2 rounded">
                {formatPercentage(certificationData?.onlineExercisesScore || 0, 490)}
              </div>
            </div>

            {/* Score examen final */}
            <div className="grid grid-cols-4 gap-4 p-4">
              <div className="col-span-1">
                Votre score total pour l'examen final
              </div>
              <div className="text-center bg-green-100 p-2 rounded">
                {certificationData?.finalExamScore.toFixed(2) || '0.00'}
              </div>
              <div className="text-center bg-blue-100 p-2 rounded">680</div>
              <div className="text-center bg-pink-100 p-2 rounded">
                {formatPercentage(certificationData?.finalExamScore || 0, 680)}
              </div>
            </div>

            {/* Score final */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 font-semibold">
              <div className="col-span-1">
                Votre score final est de
              </div>
              <div className="text-center bg-green-100 p-2 rounded">
                {certificationData?.totalScore.toFixed(2) || '0.00'}
              </div>
              <div className="text-center bg-blue-100 p-2 rounded">1170</div>
              <div className="text-center bg-pink-100 p-2 rounded">
                {formatPercentage(certificationData?.totalScore || 0, 1170)}
              </div>
            </div>
          </div>
        </div>

        {/* Message d'information */}
        <div className="mt-4 text-blue-600 text-center">
          Un score final de minimum 70% est nécessaire pour obtenir le Certificat COSSIM
        </div>

        {/* Zone de commentaire du formateur */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Commentaire du formateur
          </h2>
          {isTrainer ? (
            <>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ajoutez votre commentaire ici..."
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCommentSubmit}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Sauvegarder le commentaire
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg">
              {comment || "Aucun commentaire pour le moment"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
