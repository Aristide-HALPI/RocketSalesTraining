import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { ExerciseTemplate } from '../../../components/ExerciseTemplate';
import { cdabService, type CdabExercise, type CdabCharacteristic } from '../services/cdabService';
import { toast } from 'react-hot-toast';
import { useFormateur } from '../../../hooks/useFormateur';
import { useCdabStore } from '../../../stores/cdabStore';
import { outilsCdabService } from '../../outilscdab/services/outilsCdabService';
import { Link } from 'react-router-dom';

export default function Cdab() {
  console.log('=== Montage du composant Cdab ===');
  
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const studentIdParam = searchParams.get('userId');
  const { currentExercise, updateExercise } = useCdabStore();
  const [loading, setLoading] = useState(true);

  const isFormateur = userProfile?.role === 'trainer' || userProfile?.role === 'admin';
  const isStudent = !!studentIdParam;
  const canEdit = !isStudent && currentExercise?.status !== 'evaluated';
  const canEvaluate = isFormateur && currentExercise?.status !== 'evaluated';
  const targetUserId = studentIdParam || currentUser?.uid || '';

  // Afficher les zones de notation et commentaires si formateur/admin et que l'exercice n'est pas évalué
  const showEvaluationFields = isFormateur && currentExercise?.status !== 'evaluated';

  console.log('État des permissions détaillé:', JSON.stringify({
    isFormateur,
    isStudent,
    canEdit,
    canEvaluate,
    showEvaluationFields,
    userRole: userProfile?.role,
    exerciseStatus: currentExercise?.status,
    userProfile: {
      uid: userProfile?.uid,
      email: userProfile?.email,
      role: userProfile?.role
    },
    currentExercise: currentExercise ? {
      status: currentExercise.status,
      evaluatedAt: currentExercise.evaluatedAt,
      evaluatedBy: currentExercise.evaluatedBy
    } : null
  }, null, 2));

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

    console.log('Chargement de l\'exercice pour:', targetUserId);
    const unsubscribe = cdabService.subscribeToExercise(targetUserId, (exerciseData) => {
      console.log('Données de l\'exercice reçues:', exerciseData);
      updateExercise(exerciseData);
      setLoading(false);
    });

    return () => {
      console.log('Nettoyage de l\'abonnement');
      unsubscribe();
    };
  }, [currentUser?.uid, targetUserId, authLoading]);

  const handleCharacteristicChange = useCallback(async (index: number, field: keyof CdabCharacteristic, value: string) => {
    if (!currentExercise || !canEdit) return;

    const updatedCharacteristics = [...currentExercise.characteristics];
    updatedCharacteristics[index] = {
      ...updatedCharacteristics[index],
      [field]: value
    };

    // Vérifier si l'exercice a au moins une réponse
    const hasAnyAnswer = updatedCharacteristics.some(char =>
      char.problems.trim() !== ''
    );

    const updatedExercise = {
      ...currentExercise,
      characteristics: updatedCharacteristics,
      status: hasAnyAnswer ? 'in_progress' : 'not_started'
    };

    try {
      // Mettre à jour le store immédiatement pour la synchronisation en temps réel
      updateExercise(updatedExercise);
      
      // Sauvegarder dans Firebase
      await cdabService.updateExercise(targetUserId, updatedExercise);
      
      console.log('CDAB mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  }, [currentExercise, canEdit, updateExercise, targetUserId]);

  const handleScoreChange = useCallback((
    index: number,
    field: string,
    score: number,
    comment: string
  ) => {
    console.log('handleScoreChange appelé:', { index, field, score, comment });
    if (!currentExercise) return;

    const updatedCharacteristics = [...currentExercise.characteristics];
    const characteristic = { ...updatedCharacteristics[index] };

    console.log('Avant modification:', characteristic);

    // Mettre à jour le score et le commentaire
    (characteristic as any)[field] = score;
    (characteristic as any)[field.replace('Score', 'Comment')] = comment;

    updatedCharacteristics[index] = characteristic;

    console.log('Après modification:', characteristic);

    updateExercise({
      ...currentExercise,
      characteristics: updatedCharacteristics
    });
  }, [currentExercise, updateExercise]);

  const handleSubmit = async () => {
    if (!currentExercise || !targetUserId || isStudent) return;

    try {
      setLoading(true);
      // Mettre à jour CDAB
      await cdabService.submitExercise(targetUserId);
      
      // Mettre à jour OutilsCDAB
      if (outilsExercise) {
        const updatedOutilsExercise = {
          ...outilsExercise,
          solution: currentExercise.characteristics.map((char, index) => ({
            ...outilsExercise.solution[index],
            characteristic: char.description || '',
            definition: char.definition || '',
            advantages: char.advantages || '',
            benefits: char.benefits || '',
            proofs: char.proofs || ''
          })),
          qualification: currentExercise.characteristics.map((char, index) => ({
            ...outilsExercise.qualification[index],
            problems: char.problems || ''
          }))
        };
        
        await outilsCdabService.updateExercise(targetUserId, updatedOutilsExercise);
      }
      
      toast.success('Exercice soumis avec succès');
    } catch (error) {
      console.error('Error submitting exercise:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  console.log('État actuel:', { loading, authLoading, currentExercise });

  if (authLoading || loading) {
    console.log('Affichage du chargement');
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (!currentExercise) {
    console.log('Pas d\'exercice trouvé');
    return <div>Erreur: Impossible de charger l'exercice</div>;
  }

  return (
    <ExerciseTemplate
      title="CDAB - Caractéristiques, Définitions, Avantages, Bénéfices"
      description="Faites une liste complète de toutes les caractéristiques de votre solution / produit (minimum 7) avec une explication claire si la caractéristique est difficile à comprendre ou si elle demande une définition (cas de jargon, terme technique, etc.), les avantages qu'elle offre, les bénéfices possibles pour le client, les preuves au cas où le client venait à douter, et les problèmes potentiels du client solutionnable par la caractéristique de votre solution."
      currentScore={currentExercise.totalScore}
      maxScore={currentExercise.maxScore}
      hideScore={!isStudent}
      status={currentExercise.status}
      onSubmit={handleSubmit}
      canSubmit={canEdit && currentExercise.status !== 'evaluated' && currentExercise.status !== 'submitted'}
      aiEvaluation={currentExercise.aiEvaluation}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white bg-opacity-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-800">Votre score</h3>
              <p className="text-2xl font-bold text-purple-900">
                {currentExercise?.totalScore !== undefined ? `${currentExercise.totalScore}/30` : '-'}
              </p>
              <p className="text-xs text-purple-600 mt-1">(max 30 points)</p>
            </div>
            
            <div className="bg-white bg-opacity-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-teal-800">Statut de l'exercice</h3>
              <p className="text-2xl font-bold text-teal-900">
                {currentExercise?.status === 'not_started' && 'À débuter'}
                {currentExercise?.status === 'in_progress' && 'En cours'}
                {currentExercise?.status === 'submitted' && 'En attente de correction'}
                {currentExercise?.status === 'evaluated' && 'Corrigé'}
              </p>
            </div>
          </div>
        </div>

        {isFormateur && (
          <div className="bg-blue-50 p-4 rounded-lg mb-8 flex justify-between items-center">
            <span className="text-blue-600 font-medium">Mode Formateur</span>
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
              onClick={async () => {
                if (!targetUserId) return;
                try {
                  setLoading(true);
                  await cdabService.evaluateWithAI(targetUserId);
                  toast.success("L'exercice a été évalué par l'IA");
                } catch (error) {
                  console.error("Erreur lors de l'évaluation IA:", error);
                  toast.error("Erreur lors de l'évaluation par l'IA");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !currentExercise || currentExercise.status !== 'submitted'}
            >
              {loading ? 'Évaluation en cours...' : 'Correction IA'}
            </button>
          </div>
        )}

        {/* Contenu de l'exercice */}
        <div className="space-y-8">
          {currentExercise.characteristics.map((characteristic, index) => (
            <div key={index} className="bg-blue-500 rounded-lg overflow-hidden">
              <div className="bg-blue-500 text-white px-4 py-2">
                {characteristic.name}
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
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      disabled={!canEdit}
                      placeholder="Décrivez la caractéristique..."
                      className="w-full bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 min-h-[100px]"
                      style={{ height: 'auto' }}
                      onFocus={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
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
                          className="w-full p-2 border border-purple-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm"
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
                          }}
                          placeholder="Votre commentaire..."
                          disabled={!showEvaluationFields}
                          style={{ minHeight: '60px', height: 'auto' }}
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
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    disabled={!canEdit}
                    placeholder="Expliquez les termes techniques ou complexes utilisés dans la caractéristique..."
                    className="flex-grow bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 min-h-[100px]"
                    style={{ height: 'auto' }}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
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
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    disabled={!canEdit}
                    placeholder="Listez les avantages généraux de cette caractéristique..."
                    className="flex-grow bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 min-h-[100px]"
                    style={{ height: 'auto' }}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
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
                          className="w-full p-2 border border-emerald-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                          value={characteristic.advantagesComment || ''}
                          onChange={(e) => {
                            handleScoreChange(index, 'advantagesScore', characteristic.advantagesScore || 0, e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                          }}
                          placeholder="Votre commentaire..."
                          disabled={!showEvaluationFields}
                          style={{ minHeight: '60px', height: 'auto' }}
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
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    disabled={!canEdit}
                    placeholder="Décrivez les bénéfices concrets que le client obtiendra..."
                    className="flex-grow bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 min-h-[100px]"
                    style={{ height: 'auto' }}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
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
                          className="w-full p-2 border border-orange-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
                          value={characteristic.benefitsComment || ''}
                          onChange={(e) => {
                            handleScoreChange(index, 'benefitsScore', characteristic.benefitsScore || 0, e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                          }}
                          placeholder="Votre commentaire..."
                          disabled={!showEvaluationFields}
                          style={{ minHeight: '60px', height: 'auto' }}
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
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    disabled={!canEdit}
                    placeholder="Données chiffrées, témoignages ou études qui prouvent les bénéfices..."
                    className="flex-grow bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 min-h-[100px]"
                    style={{ height: 'auto' }}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
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
                          className="w-full p-2 border border-yellow-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                          value={characteristic.proofsComment || ''}
                          onChange={(e) => {
                            handleScoreChange(index, 'proofsScore', characteristic.proofsScore || 0, e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                          }}
                          placeholder="Votre commentaire..."
                          disabled={!showEvaluationFields}
                          style={{ minHeight: '60px', height: 'auto' }}
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
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    disabled={!canEdit}
                    placeholder="Décrivez les difficultés du prospect qui seraient résolues par cette caractéristique..."
                    className="flex-grow bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 min-h-[100px]"
                    style={{ height: 'auto' }}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
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
                          className="w-full p-2 border border-red-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
                          value={characteristic.problemsComment || ''}
                          onChange={(e) => {
                            handleScoreChange(index, 'problemsScore', characteristic.problemsScore || 0, e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                          }}
                          placeholder="Votre commentaire..."
                          disabled={!showEvaluationFields}
                          style={{ minHeight: '60px', height: 'auto' }}
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
            <button
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              onClick={async () => {
                if (!targetUserId || !currentExercise) return;
                try {
                  setLoading(true);
                  await cdabService.evaluateExercise(targetUserId, currentExercise.characteristics, currentUser?.uid);
                  toast.success("Les résultats ont été publiés à l'apprenant");
                } catch (error) {
                  console.error("Erreur lors de la publication:", error);
                  toast.error("Erreur lors de la publication des résultats");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !currentExercise || currentExercise.status !== 'submitted'}
            >
              {loading ? 'Publication en cours...' : 'Publier les résultats'}
            </button>
          )}
        </div>
      </div>
    </ExerciseTemplate>
  );
}
