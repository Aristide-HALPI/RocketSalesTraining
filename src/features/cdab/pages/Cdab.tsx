import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { ExerciseTemplate } from '../../../components/ExerciseTemplate';
import { cdabService, type CdabCharacteristic } from '../services/cdabService';
import { toast } from 'react-hot-toast';
import { useCdabStore } from '../../../stores/cdabStore';

export default function Cdab() {
  console.log('=== Montage du composant Cdab ===');
  
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const studentIdParam = searchParams.get('userId');
  const { currentExercise, updateExercise } = useCdabStore();
  const [loading, setLoading] = useState(true);
  const [evaluatingBatch, setEvaluatingBatch] = useState<number | null>(null);

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const isStudent = !!studentIdParam;
  const targetUserId = studentIdParam || currentUser?.uid || '';

  // Mise à jour de la logique de permission d'édition
  const canEdit = useMemo(() => {
    return isFormateur || // Les formateurs peuvent toujours éditer
           (!isStudent && currentExercise?.status === 'submitted'); // Les autres ne peuvent éditer que si non évalué
  }, [isFormateur, isStudent, currentExercise?.status]);

  // Mise à jour de la logique pour afficher les champs d'évaluation
  const showEvaluationFields = useMemo(() => {
    return isFormateur || currentExercise?.status === 'evaluated';
  }, [isFormateur, currentExercise?.status]);

  // Fonction pour gérer l'évaluation par lots
  const handleBatchEvaluation = useCallback(async (batchNumber: number) => {
    if (!targetUserId || !currentUser?.uid || !userProfile?.organizationId || !currentExercise?.characteristics) {
      console.log('Données manquantes:', { targetUserId, currentUser, userProfile, currentExercise });
      return;
    }
    
    setEvaluatingBatch(batchNumber);
    try {
      // Ajuster le calcul des indices pour évaluer 4 caractéristiques à la fois
      const startIndex = (batchNumber - 1) * 4;
      const endIndex = Math.min(startIndex + 3, currentExercise.characteristics.length - 1);
      
      console.log(`Évaluation du lot ${batchNumber}: caractéristiques ${startIndex + 1}-${endIndex + 1}`);
      
      await cdabService.evaluateWithAIBatch(
        targetUserId,
        userProfile.organizationId,
        startIndex,
        endIndex
      );
      
      toast.success(`Caractéristiques ${startIndex + 1}-${endIndex + 1} évaluées avec succès`);
    } catch (error) {
      console.error('Erreur lors de l\'évaluation du lot:', error);
      toast.error('Erreur lors de l\'évaluation');
    } finally {
      setEvaluatingBatch(null);
    }
  }, [targetUserId, currentUser?.uid, userProfile?.organizationId, currentExercise?.characteristics]);

  // Fonction pour gérer la soumission
  const handleSubmit = useCallback(async () => {
    if (!targetUserId) return;
    
    try {
      setLoading(true);
      await cdabService.submitExercise(targetUserId);
      toast.success('Exercice soumis avec succès');
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  // Vérifier si l'utilisateur est autorisé
  useEffect(() => {
    console.log('=== Vérification des autorisations ===');
    if (!currentUser) {
      console.log('Pas d\'utilisateur connecté');
      navigate('/login');
      return;
    }

    if (!targetUserId && !isFormateur) {
      console.log('Pas de targetUserId et pas formateur');
      navigate('/');
      return;
    }

    console.log('Autorisations OK');
  }, [currentUser, targetUserId, isFormateur, navigate]);

  // Charger l'exercice
  useEffect(() => {
    console.log('=== Effect de chargement ===');
    if (authLoading || !currentUser?.uid || !targetUserId) {
      console.log('Impossible de charger l\'exercice pour le moment');
      return;
    }

    setLoading(true);
    
    // Souscrire aux changements de l'exercice
    const unsubscribe = cdabService.subscribeToExercise(targetUserId, (exercise) => {
      console.log('Mise à jour de l\'exercice:', exercise);
      updateExercise(exercise);
      setLoading(false);
    });

    // Nettoyer la souscription quand le composant est démonté
    return () => {
      unsubscribe();
    };
  }, [authLoading, currentUser?.uid, targetUserId, updateExercise]);

  // Fonction pour gérer le changement de caractéristique
  const handleCharacteristicChange = useCallback(async (index: number, field: keyof CdabCharacteristic, value: string) => {
    if (!currentExercise || !canEdit || !targetUserId) return;

    const updatedCharacteristics = [...currentExercise.characteristics];
    updatedCharacteristics[index] = {
      ...updatedCharacteristics[index],
      [field]: value
    };

    const exerciseUpdate = {
      ...currentExercise,
      characteristics: updatedCharacteristics,
      status: 'in_progress' as const,
      updatedAt: new Date().toISOString()
    };

    try {
      if (targetUserId) {
        await cdabService.updateExercise(targetUserId, exerciseUpdate);
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }, [currentExercise, canEdit, targetUserId]);

  // Fonction pour gérer le changement de score
  const handleScoreChange = useCallback(async (
    characteristicIndex: number,
    field: keyof CdabCharacteristic,
    currentScore: number,
    comment: string
  ) => {
    if (!targetUserId || !currentUser?.uid) return;

    try {
      // Convertir le champ en string pour l'appel à updateCharacteristicScore
      await cdabService.updateCharacteristicScore(
        targetUserId,
        characteristicIndex,
        String(field),
        currentScore,
        comment
      );
      toast.success('Score mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du score:', error);
      toast.error('Erreur lors de la mise à jour du score');
    }
  }, [targetUserId, currentUser?.uid]);

  // Fonction pour redimensionner automatiquement les zones de texte
  const autoResizeTextarea = useCallback((element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  // Hook pour appliquer l'auto-redimensionnement à tous les textareas
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      autoResizeTextarea(textarea as HTMLTextAreaElement);
      textarea.addEventListener('input', () => autoResizeTextarea(textarea as HTMLTextAreaElement));
    });

    // Cleanup
    return () => {
      textareas.forEach(textarea => {
        textarea.removeEventListener('input', () => autoResizeTextarea(textarea as HTMLTextAreaElement));
      });
    };
  }, [autoResizeTextarea, currentExercise]);

  console.log('État actuel:', { loading, authLoading, currentExercise });

  // Mise à jour de la logique pour permettre la soumission
  const canSubmit = useMemo(() => {
    return currentExercise?.status === 'evaluated' && currentExercise?.finalScore !== undefined;
  }, [currentExercise?.status, currentExercise?.finalScore]);

  if (authLoading) {
    return <div>Chargement...</div>;
  }

  if (!currentExercise) {
    return <div>Erreur: Impossible de charger l'exercice</div>;
  }

  const exerciseStatus = currentExercise.status as 'not_started' | 'in_progress' | 'submitted' | 'evaluated';

  return (
    <ExerciseTemplate
      title="CDAB - Caractéristiques, Définitions, Avantages, Bénéfices"
      description="Faites une liste complète de toutes les caractéristiques de votre solution / produit (minimum 7) avec une explication claire si la caractéristique est difficile à comprendre ou si elle demande une définition (cas de jargon, terme technique, etc.), les avantages qu'elle offre, les bénéfices possibles pour le client, les preuves au cas où le client venait à douter, et les problèmes potentiels du client solutionnable par la caractéristique de votre solution."
      currentScore={currentExercise.finalScore ?? 0}
      maxScore={100}
      hideScore={true}
      status={exerciseStatus}
      onSubmit={handleSubmit}
      canSubmit={canSubmit}
      aiEvaluation={currentExercise.aiEvaluation}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white bg-opacity-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-800">Votre score</h3>
              <p className="text-2xl font-bold text-purple-900">
                {currentExercise?.finalScore !== undefined ? `${currentExercise.finalScore}/100` : '-'}
              </p>
              <p className="text-xs text-purple-600 mt-1">(max 100 points)</p>
            </div>
            
            <div className="bg-white bg-opacity-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-teal-800">Statut de l'exercice</h3>
              <p className="text-2xl font-bold text-teal-900">
                {exerciseStatus === 'not_started' && 'À débuter'}
                {exerciseStatus === 'in_progress' && 'En cours'}
                {exerciseStatus === 'submitted' && 'En attente de correction'}
                {exerciseStatus === 'evaluated' && 'Corrigé'}
              </p>
            </div>
          </div>
        </div>

        {isFormateur && (
          <div className="bg-blue-50 p-4 rounded-lg mb-8 flex justify-between items-center">
            <span className="text-blue-600 font-medium">Mode Formateur</span>
            <div className="flex gap-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                onClick={() => handleBatchEvaluation(1)}
                disabled={evaluatingBatch !== null}
              >
                {evaluatingBatch === 1 ? 'Évaluation en cours...' : 'Évaluer caractéristiques 1-4'}
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                onClick={() => handleBatchEvaluation(2)}
                disabled={evaluatingBatch !== null}
              >
                {evaluatingBatch === 2 ? 'Évaluation en cours...' : 'Évaluer caractéristiques 5-8'}
              </button>
            </div>
          </div>
        )}

        {/* Contenu de l'exercice */}
        <div className="space-y-8">
          {currentExercise.characteristics.map((characteristic, index) => (
            <div key={index} className="bg-blue-500 rounded-lg overflow-hidden">
              <div className="bg-blue-500 text-white px-4 py-2">
                {characteristic.name || `Caractéristique ${index + 1}`}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                <div className="bg-purple-100 rounded-lg p-4 flex flex-col h-full">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">Description</h3>
                  
                  {/* Zone de réponse de l'apprenant */}
                  <div className="flex-grow">
                    <textarea
                      value={characteristic.description}
                      onChange={(e) => {
                        handleCharacteristicChange(index, 'description', e.target.value);
                        autoResizeTextarea(e.target);
                      }}
                      disabled={!canEdit}
                      placeholder="Décrivez la caractéristique..."
                      className="w-full bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 overflow-hidden"
                      style={{ height: 'auto', minHeight: '100px' }}
                      onInput={(e) => autoResizeTextarea(e.currentTarget)}
                    />
                  </div>

                  {/* Zone d'évaluation du formateur */}
                  {(isFormateur && characteristic.type !== 'definition' && (
                    <div className="mt-4 border-t border-purple-200 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-medium text-purple-700">Note :</label>
                        <select
                          className="block w-20 rounded-md border-purple-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                          value={characteristic.descriptionScore || 0}
                          onChange={(e) => {
                            console.log('Score change event:', JSON.stringify({
                              newValue: e.target.value,
                              disabled: !showEvaluationFields,
                              showEvaluationFields,
                              isFormateur,
                              status: currentExercise?.status,
                              userRole: userProfile?.role,
                              characteristicType: characteristic.type
                            }, null, 2));
                            handleScoreChange(
                              index,
                              'descriptionScore',
                              parseInt(e.target.value, 10),
                              characteristic.descriptionComment || ''
                            );
                          }}
                          disabled={!showEvaluationFields}
                        >
                          {[0, 1, 2].map((score) => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                        <span className="text-sm text-purple-600">/ 2</span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-1">Commentaire :</label>
                        <textarea
                          className="w-full p-2 border border-purple-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm resize-none overflow-hidden"
                          value={characteristic.descriptionComment || ''}
                          onChange={(e) => {
                            console.log('Comment change event:', JSON.stringify({
                              newValue: e.target.value,
                              disabled: !showEvaluationFields,
                              showEvaluationFields,
                              isFormateur,
                              status: currentExercise?.status,
                              userRole: userProfile?.role,
                              characteristicType: characteristic.type
                            }, null, 2));
                            handleScoreChange(
                              index,
                              'descriptionScore',
                              characteristic.descriptionScore || 0,
                              e.target.value
                            );
                            autoResizeTextarea(e.target);
                          }}
                          placeholder="Votre commentaire..."
                          disabled={!showEvaluationFields}
                          style={{ height: 'auto', minHeight: '60px' }}
                          onInput={(e) => autoResizeTextarea(e.currentTarget)}
                        />
                      </div>
                    </div>
                  ))}
                  {/* Affichage des notes et commentaires pour l'apprenant */}
                  {!isFormateur && characteristic.descriptionComment && currentExercise?.status === 'evaluated' && (
                    <div className="mt-4 border-t border-purple-200 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-purple-700">Note : {characteristic.descriptionScore || 0}/2</span>
                      </div>
                      <div className="text-sm text-purple-700 whitespace-pre-wrap">{characteristic.descriptionComment}</div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-100 rounded-lg p-4 flex flex-col h-full">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Définition</h3>
                  <div className="text-gray-600 text-sm mb-2">
                    (seulement si nécessaire)
                  </div>
                  <textarea
                    value={characteristic.definition}
                    onChange={(e) => {
                      handleCharacteristicChange(index, 'definition', e.target.value);
                      autoResizeTextarea(e.target);
                    }}
                    disabled={!canEdit}
                    placeholder="Expliquez les termes techniques ou complexes utilisés dans la caractéristique..."
                    className="flex-grow bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 overflow-hidden"
                    style={{ height: 'auto', minHeight: '100px' }}
                    onInput={(e) => autoResizeTextarea(e.currentTarget)}
                  />
                </div>

                <div className="bg-emerald-100 rounded-lg p-4 flex flex-col h-full">
                  <h3 className="text-lg font-semibold text-emerald-900 mb-2">Avantages</h3>
                  <div className="text-gray-600 text-sm mb-2">
                    (généraux)
                  </div>
                  <textarea
                    value={characteristic.advantages}
                    onChange={(e) => {
                      handleCharacteristicChange(index, 'advantages', e.target.value);
                      autoResizeTextarea(e.target);
                    }}
                    disabled={!canEdit}
                    placeholder="Listez les avantages généraux de cette caractéristique..."
                    className="flex-grow bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 overflow-hidden"
                    style={{ height: 'auto', minHeight: '100px' }}
                    onInput={(e) => autoResizeTextarea(e.currentTarget)}
                  />
                  {isFormateur && (
                    <div className="mt-4 border-t border-emerald-200 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-medium text-emerald-700">Note :</label>
                        <select
                          className="block w-20 rounded-md border-emerald-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                          value={characteristic.advantagesScore || 0}
                          onChange={(e) => handleScoreChange(index, 'advantagesScore', parseInt(e.target.value, 10), characteristic.advantagesComment || '')}
                          disabled={!showEvaluationFields}
                        >
                          {[0, 1, 2].map((score) => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                        <span className="text-sm text-emerald-600">/ 2</span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-emerald-700 mb-1">Commentaire :</label>
                        <textarea
                          className="w-full p-2 border border-emerald-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none overflow-hidden"
                          value={characteristic.advantagesComment || ''}
                          onChange={(e) => {
                            handleScoreChange(index, 'advantagesScore', characteristic.advantagesScore || 0, e.target.value);
                            autoResizeTextarea(e.target);
                          }}
                          placeholder="Votre commentaire..."
                          disabled={!showEvaluationFields}
                          style={{ height: 'auto', minHeight: '60px' }}
                          onInput={(e) => autoResizeTextarea(e.currentTarget)}
                        />
                      </div>
                    </div>
                  )}
                  {!isFormateur && characteristic.advantagesComment && currentExercise?.status === 'evaluated' && (
                    <div className="mt-4 border-t border-emerald-200 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-emerald-700">Note : {characteristic.advantagesScore || 0}/2</span>
                      </div>
                      <div className="text-sm text-emerald-700 whitespace-pre-wrap">{characteristic.advantagesComment}</div>
                    </div>
                  )}
                </div>

                <div className="bg-orange-100 rounded-lg p-4 flex flex-col h-full">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">Bénéfices</h3>
                  <div className="text-gray-600 text-sm mb-2">
                    (concrets pour le client)
                  </div>
                  <textarea
                    value={characteristic.benefits}
                    onChange={(e) => {
                      handleCharacteristicChange(index, 'benefits', e.target.value);
                      autoResizeTextarea(e.target);
                    }}
                    disabled={!canEdit}
                    placeholder="Décrivez les bénéfices concrets que le client obtiendra..."
                    className="flex-grow bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 overflow-hidden"
                    style={{ height: 'auto', minHeight: '100px' }}
                    onInput={(e) => autoResizeTextarea(e.currentTarget)}
                  />
                  {isFormateur && (
                    <div className="mt-4 border-t border-orange-200 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-medium text-orange-700">Note :</label>
                        <select
                          className="block w-20 rounded-md border-orange-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                          value={characteristic.benefitsScore || 0}
                          onChange={(e) => handleScoreChange(index, 'benefitsScore', parseInt(e.target.value, 10), characteristic.benefitsComment || '')}
                          disabled={!showEvaluationFields}
                        >
                          {[0, 1, 2].map((score) => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                        <span className="text-sm text-orange-600">/ 2</span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-orange-700 mb-1">Commentaire :</label>
                        <textarea
                          className="w-full p-2 border border-orange-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm resize-none overflow-hidden"
                          value={characteristic.benefitsComment || ''}
                          onChange={(e) => {
                            handleScoreChange(index, 'benefitsScore', characteristic.benefitsScore || 0, e.target.value);
                            autoResizeTextarea(e.target);
                          }}
                          placeholder="Votre commentaire..."
                          disabled={!showEvaluationFields}
                          style={{ height: 'auto', minHeight: '60px' }}
                          onInput={(e) => autoResizeTextarea(e.currentTarget)}
                        />
                      </div>
                    </div>
                  )}
                  {!isFormateur && characteristic.benefitsComment && currentExercise?.status === 'evaluated' && (
                    <div className="mt-4 border-t border-orange-200 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-orange-700">Note : {characteristic.benefitsScore || 0}/2</span>
                      </div>
                      <div className="text-sm text-orange-700 whitespace-pre-wrap">{characteristic.benefitsComment}</div>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-100 rounded-lg p-4 flex flex-col h-full">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Preuves</h3>
                  <div className="text-gray-600 text-sm mb-2">
                    références clients, enquêtes, articles de presse
                  </div>
                  <textarea
                    value={characteristic.proofs}
                    onChange={(e) => {
                      handleCharacteristicChange(index, 'proofs', e.target.value);
                      autoResizeTextarea(e.target);
                    }}
                    disabled={!canEdit}
                    placeholder="Données chiffrées, témoignages ou études qui prouvent les bénéfices..."
                    className="flex-grow bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 overflow-hidden"
                    style={{ height: 'auto', minHeight: '100px' }}
                    onInput={(e) => autoResizeTextarea(e.currentTarget)}
                  />
                  {isFormateur && (
                    <div className="mt-4 border-t border-yellow-200 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-medium text-yellow-700">Note :</label>
                        <select
                          className="block w-20 rounded-md border-yellow-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
                          value={characteristic.proofsScore || 0}
                          onChange={(e) => handleScoreChange(index, 'proofsScore', parseInt(e.target.value, 10), characteristic.proofsComment || '')}
                          disabled={!showEvaluationFields}
                        >
                          {[0, 1, 2].map((score) => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                        <span className="text-sm text-yellow-600">/ 2</span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-yellow-700 mb-1">Commentaire :</label>
                        <textarea
                          className="w-full p-2 border border-yellow-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-sm resize-none overflow-hidden"
                          value={characteristic.proofsComment || ''}
                          onChange={(e) => {
                            handleScoreChange(index, 'proofsScore', characteristic.proofsScore || 0, e.target.value);
                            autoResizeTextarea(e.target);
                          }}
                          placeholder="Votre commentaire..."
                          disabled={!showEvaluationFields}
                          style={{ height: 'auto', minHeight: '60px' }}
                          onInput={(e) => autoResizeTextarea(e.currentTarget)}
                        />
                      </div>
                    </div>
                  )}
                  {!isFormateur && characteristic.proofsComment && currentExercise?.status === 'evaluated' && (
                    <div className="mt-4 border-t border-yellow-200 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-yellow-700">Note : {characteristic.proofsScore || 0}/2</span>
                      </div>
                      <div className="text-sm text-yellow-700 whitespace-pre-wrap">{characteristic.proofsComment}</div>
                    </div>
                  )}
                </div>

                <div className="bg-red-100 rounded-lg p-4 flex flex-col h-full">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Problèmes</h3>
                  <div className="text-gray-600 text-sm mb-2">
                    problèmes concrets potentiels du prospect
                  </div>
                  <textarea
                    value={characteristic.problems}
                    onChange={(e) => {
                      handleCharacteristicChange(index, 'problems', e.target.value);
                      autoResizeTextarea(e.target);
                    }}
                    disabled={!canEdit}
                    placeholder="Décrivez les difficultés du prospect qui seraient résolues par cette caractéristique..."
                    className="flex-grow bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 overflow-hidden"
                    style={{ height: 'auto', minHeight: '100px' }}
                    onInput={(e) => autoResizeTextarea(e.currentTarget)}
                  />
                  {isFormateur && (
                    <div className="mt-4 border-t border-red-200 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-medium text-red-700">Note :</label>
                        <select
                          className="block w-20 rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                          value={characteristic.problemsScore || 0}
                          onChange={(e) => handleScoreChange(index, 'problemsScore', parseInt(e.target.value, 10), characteristic.problemsComment || '')}
                          disabled={!showEvaluationFields}
                        >
                          {[0, 1, 2].map((score) => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                        <span className="text-sm text-red-600">/ 2</span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-red-700 mb-1">Commentaire :</label>
                        <textarea
                          className="w-full p-2 border border-red-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm resize-none overflow-hidden"
                          value={characteristic.problemsComment || ''}
                          onChange={(e) => {
                            handleScoreChange(index, 'problemsScore', characteristic.problemsScore || 0, e.target.value);
                            autoResizeTextarea(e.target);
                          }}
                          placeholder="Votre commentaire..."
                          disabled={!showEvaluationFields}
                          style={{ height: 'auto', minHeight: '60px' }}
                          onInput={(e) => autoResizeTextarea(e.currentTarget)}
                        />
                      </div>
                    </div>
                  )}
                  {!isFormateur && characteristic.problemsComment && currentExercise?.status === 'evaluated' && (
                    <div className="mt-4 border-t border-red-200 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-red-700">Note : {characteristic.problemsScore || 0}/2</span>
                      </div>
                      <div className="text-sm text-red-700 whitespace-pre-wrap">{characteristic.problemsComment}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Boutons de soumission */}
        <div className="flex justify-end gap-4 mt-8">
          {!isFormateur ? (
            <button
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              onClick={handleSubmit}
              disabled={loading || currentExercise?.status === 'submitted' || currentExercise?.status === 'evaluated'}
            >
              {loading ? 'Envoi en cours...' : 'Soumettre'}
            </button>
          ) : (
            <>
              {/* Boutons d'évaluation par l'IA */}
              <div className="flex gap-4">
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  onClick={() => handleBatchEvaluation(1)}
                  disabled={loading || evaluatingBatch === 1}
                >
                  {evaluatingBatch === 1 ? 'Évaluation en cours...' : 'Évaluer caractéristiques 1-4'}
                </button>
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  onClick={() => handleBatchEvaluation(2)}
                  disabled={loading || evaluatingBatch === 2}
                >
                  {evaluatingBatch === 2 ? 'Évaluation en cours...' : 'Évaluer caractéristiques 5-8'}
                </button>
              </div>
              {/* Bouton Publier les résultats */}
              <button
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                onClick={async () => {
                  if (!targetUserId || !currentExercise || !currentUser?.uid) return;
                  try {
                    setLoading(true);
                    await cdabService.evaluateExercise(targetUserId, currentExercise.characteristics, currentUser.uid);
                    toast.success("Les résultats ont été publiés à l'apprenant");
                  } catch (error) {
                    console.error('Error publishing results:', error);
                    toast.error('Erreur lors de la publication des résultats');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !currentExercise?.status || currentExercise.status !== 'evaluated'}
              >
                {loading ? 'Publication...' : 'Publier les résultats'}
              </button>
            </>
          )}
        </div>
      </div>
    </ExerciseTemplate>
  );
}
