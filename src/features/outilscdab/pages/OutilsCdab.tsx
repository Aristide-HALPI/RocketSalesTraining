import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { outilsCdabService, type OutilsCdabExercise } from '../services/outilsCdabService';
import { cn } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useCdabStore } from '../../../stores/cdabStore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const colors = {
  problems: 'bg-red-100',        // Rouge clair
  impact: 'bg-purple-100',        // Mauve clair
  confirmation: 'bg-green-100',   // Vert clair
  benefit: 'bg-red-100',         // Rouge clair
  solution: 'bg-gray-100',        // Gris clair
  proofs: 'bg-yellow-100',       // Jaune clair
};

const borderColors = {
  problems: 'border-red-200',
  impact: 'border-purple-200',
  confirmation: 'border-green-200',
  benefit: 'border-red-200',
  solution: 'border-gray-200',
  proofs: 'border-yellow-200',
};

export default function OutilsCdab() {
  console.log('=== Montage du composant OutilsCdab ===');
  
  const { currentUser, userProfile, authLoading } = useAuth();
  const { currentExercise: cdabExercise, outilsExercise, updateOutilsExercise } = useCdabStore();
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const studentIdParam = searchParams.get('userId');
  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const targetUserId = studentIdParam || currentUser?.uid;

  console.log('Auth state:', { 
    currentUser: currentUser?.email, 
    userProfile, 
    isFormateur, 
    targetUserId,
    studentIdParam 
  });

  // Charger l'exercice initial
  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      console.log('Pas d\'utilisateur connecté, redirection vers /login');
      navigate('/login');
      return;
    }

    if (!targetUserId) {
      console.error('Pas d\'ID utilisateur cible');
      return;
    }

    // Permettre l'accès si c'est un formateur ou si c'est l'exercice de l'utilisateur connecté
    if (!isFormateur && studentIdParam && studentIdParam !== currentUser.uid) {
      console.log('Accès non autorisé, redirection vers la page d\'accueil');
      navigate('/');
      return;
    }

    const loadExercise = async () => {
      try {
        const exercise = await outilsCdabService.getExercise(targetUserId);
        updateOutilsExercise(exercise);
        setIsInitialized(true);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'exercice:', error);
        toast.error('Erreur lors du chargement de l\'exercice');
        setLoading(false);
      }
    };

    loadExercise();
  }, [currentUser?.uid, targetUserId, authLoading, isFormateur, studentIdParam]);

  // Synchroniser avec les données de CDAB
  useEffect(() => {
    if (!cdabExercise || !outilsExercise || !targetUserId || !isInitialized || loading) return;

    const updatedExercise = {
      ...outilsExercise,
      solution: cdabExercise.characteristics.map((char, index) => ({
        ...outilsExercise.solution[index],
        characteristic: char.description || '',
        definition: char.definition || '',
        advantages: char.advantages || '',
        benefits: char.benefits || '',
        proofs: char.proofs || ''
      })),
      qualification: cdabExercise.characteristics.map((char, index) => ({
        ...outilsExercise.qualification[index],
        problems: char.problems || '',
        problemImpact: char.impact || '',
        clientConfirmation: char.confirmation || '',
        acceptedBenefit: char.benefit || ''
      }))
    };

    const hasChanges = JSON.stringify(updatedExercise) !== JSON.stringify(outilsExercise);

    if (hasChanges) {
      outilsCdabService.updateExercise(targetUserId, updatedExercise)
        .catch(error => {
          console.error('Erreur lors de la mise à jour:', error);
          toast.error('Erreur lors de la synchronisation avec CDAB');
        });
    }
  }, [cdabExercise, isInitialized]);

  const handleQualificationChange = async (index: number, field: string, value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updatedExercise = {
      ...outilsExercise,
      qualification: outilsExercise.qualification.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    };
    updateOutilsExercise(updatedExercise);

    // Auto-redimensionnement du textarea
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;

    // Sauvegarde automatique
    try {
      await outilsCdabService.updateExercise(targetUserId, updatedExercise);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde automatique:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const contentRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    try {
      // Afficher un toast de chargement
      toast.loading('Génération du PDF en cours...');

      // Capturer le contenu
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // Meilleure qualité
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const contentWidth = canvas.width;
      const contentHeight = canvas.height;

      // Créer le PDF au format A4
      const pdf = new jsPDF({
        orientation: contentWidth > contentHeight ? 'l' : 'p',
        unit: 'px',
        format: [contentWidth, contentHeight]
      });

      // Ajouter l'image au PDF
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        contentWidth,
        contentHeight,
        '',
        'FAST'
      );

      // Sauvegarder le PDF
      pdf.save('OutilsCDAB.pdf');

      // Fermer le toast de chargement et afficher un succès
      toast.dismiss();
      toast.success('PDF généré avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast.dismiss();
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!outilsExercise) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-gray-800">
          Erreur lors du chargement de l'exercice
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div ref={contentRef}>
        {outilsExercise.solution.map((row, index) => (
          <div key={index} className="space-y-4">
            {/* Section principale avec le dégradé */}
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-4">
                <h2 className="text-xl font-bold">
                  Caractéristique {index + 1}
                </h2>
              </div>

              <div className="p-4 space-y-6">
                {/* Section QUALIFICATION */}
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-3">
                    <h2 className="text-lg font-semibold">QUALIFICATION</h2>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 p-4">
                    {/* Les problèmes à identifier */}
                    <div className="bg-pink-200 rounded-lg p-4 flex flex-col h-full">
                      <div className="text-pink-800 font-semibold mb-1">
                        Les problèmes à identifier
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        problèmes concrets potentiels du prospect
                      </div>
                      <div className="flex-grow bg-transparent text-gray-700 min-h-[100px] whitespace-pre-wrap">
                        {outilsExercise.qualification[index].problems}
                      </div>
                    </div>

                    {/* Impact sur le prospect */}
                    <div className="bg-pink-100 rounded-lg p-4 flex flex-col h-full">
                      <div className="text-pink-700 font-semibold mb-1">
                        Impact sur le prospect
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        conséquences du problème
                      </div>
                      <textarea
                        className="flex-grow p-2 rounded bg-white/50 text-gray-700 min-h-[100px] resize-none overflow-hidden"
                        value={outilsExercise.qualification[index].problemImpact}
                        onChange={(e) => handleQualificationChange(index, 'problemImpact', e.target.value, e)}
                        placeholder="Décrivez l'impact du problème..."
                        style={{ height: 'auto' }}
                      />
                    </div>

                    {/* Confirmation du prospect */}
                    <div className="bg-pink-100 rounded-lg p-4 flex flex-col h-full">
                      <div className="text-pink-700 font-semibold mb-1">
                        Confirmation du prospect
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        validation du problème
                      </div>
                      <textarea
                        className="flex-grow p-2 rounded bg-white/50 text-gray-700 min-h-[100px] resize-none overflow-hidden"
                        value={outilsExercise.qualification[index].clientConfirmation}
                        onChange={(e) => handleQualificationChange(index, 'clientConfirmation', e.target.value, e)}
                        placeholder="Notez la confirmation du prospect..."
                        style={{ height: 'auto' }}
                      />
                    </div>

                    {/* Bénéfice accepté */}
                    <div className="bg-pink-100 rounded-lg p-4 flex flex-col h-full">
                      <div className="text-pink-700 font-semibold mb-1">
                        Bénéfice accepté
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        bénéfice reconnu par le prospect
                      </div>
                      <textarea
                        className="flex-grow p-2 rounded bg-white/50 text-gray-700 min-h-[100px] resize-none overflow-hidden"
                        value={outilsExercise.qualification[index].acceptedBenefit}
                        onChange={(e) => handleQualificationChange(index, 'acceptedBenefit', e.target.value, e)}
                        placeholder="Notez le bénéfice accepté..."
                        style={{ height: 'auto' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section PRÉSENTATION DE LA SOLUTION PROPOSÉE */}
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-3">
                    <h2 className="text-lg font-semibold">PRÉSENTATION DE LA SOLUTION PROPOSÉE</h2>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-4 p-4">
                    {/* Caractéristique */}
                    <div className="bg-purple-100 rounded-lg p-4 flex flex-col h-full">
                      <div className="text-purple-700 font-semibold mb-1">
                        Caractéristique
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        Description de la caractéristique
                      </div>
                      <div className="flex-grow bg-transparent text-gray-700 min-h-[100px] whitespace-pre-wrap">
                        {outilsExercise.solution[index].characteristic}
                      </div>
                    </div>

                    {/* Définition */}
                    <div className="bg-blue-100 rounded-lg p-4 flex flex-col h-full">
                      <div className="text-blue-700 font-semibold mb-1">
                        Définition
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        (seulement si nécessaire)
                      </div>
                      <div className="flex-grow bg-transparent text-gray-700 min-h-[100px] whitespace-pre-wrap">
                        {outilsExercise.solution[index].definition}
                      </div>
                    </div>

                    {/* Avantages */}
                    <div className="bg-emerald-100 rounded-lg p-4 flex flex-col h-full">
                      <div className="text-emerald-700 font-semibold mb-1">
                        Avantages
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        (généraux)
                      </div>
                      <div className="flex-grow bg-transparent text-gray-700 min-h-[100px] whitespace-pre-wrap">
                        {outilsExercise.solution[index].advantages}
                      </div>
                    </div>

                    {/* Bénéfices */}
                    <div className="bg-orange-100 rounded-lg p-4 flex flex-col h-full">
                      <div className="text-orange-700 font-semibold mb-1">
                        Bénéfices
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        (concrets pour le client)
                      </div>
                      <div className="flex-grow bg-transparent text-gray-700 min-h-[100px] whitespace-pre-wrap">
                        {outilsExercise.solution[index].benefits}
                      </div>
                    </div>

                    {/* Preuves */}
                    <div className="bg-yellow-100 rounded-lg p-4 flex flex-col h-full">
                      <div className="text-yellow-700 font-semibold mb-1">
                        Preuves
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        références clients, enquêtes, articles de presse
                      </div>
                      <div className="flex-grow bg-transparent text-gray-700 min-h-[100px] whitespace-pre-wrap">
                        {outilsExercise.solution[index].proofs}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bouton d'export PDF */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={handleExportPDF}
          className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-indigo-900 flex items-center gap-2 shadow-lg"
        >
          <span>Télécharger en PDF</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586L7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
