import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

export interface CertificationData {
  id: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  onlineExercisesScore: number;
  finalExamScore: number;
  totalScore: number;
  trainerComment: string;
  createdAt: string;
  updatedAt: string;
}

// Liste des exercices avec leurs scores maximums
const exercisePaths = [
  { path: 'eisenhower', maxScore: 30 },
  { path: 'goalkeeper', maxScore: 20 },
  { path: 'sections', maxScore: 30 },
  { path: 'rdv-decideur', maxScore: 40 },
  { path: 'iiep', maxScore: 30 },
  { path: 'company', maxScore: 20 },
  { path: 'eombus-pafi', maxScore: 100 },
  { path: 'trois-cles', maxScore: 50 },
  { path: 'cdab', maxScore: 100 },
  { path: 'objections', maxScore: 50 },
  { path: 'bonus', maxScore: 20 },
  { path: 'points_role_final', maxScore: 680 } // Examen final
];

export const certificationService = {
  /**
   * Liste tous les exercices avec leurs statuts pour un utilisateur donné
   * @param userId ID de l'utilisateur
   * @returns Promesse contenant un tableau d'objets avec le chemin de l'exercice, son statut et son score
   */
  async listAllExercisesStatus(userId: string): Promise<Array<{path: string; status: string; score: number | null; maxScore: number}>> {
    console.log(`Liste de tous les exercices pour l'utilisateur ${userId}`);
    
    const result: Array<{path: string; status: string; score: number | null; maxScore: number}> = [];
    
    for (const exercise of exercisePaths) {
      const exerciseRef = doc(db, `users/${userId}/exercises/${exercise.path}`);
      const exerciseSnap = await getDoc(exerciseRef);
      
      if (!exerciseSnap.exists()) {
        result.push({
          path: exercise.path,
          status: 'not_found',
          score: null,
          maxScore: exercise.maxScore
        });
        continue;
      }
      
      const exerciseData = exerciseSnap.data();
      result.push({
        path: exercise.path,
        status: exerciseData?.status || 'unknown',
        score: typeof exerciseData?.totalScore === 'number' ? exerciseData.totalScore : null,
        maxScore: exercise.maxScore
      });
    }
    
    return result;
  },
  async getCertificationData(userId: string): Promise<CertificationData> {
    console.log('getCertificationData called for userId:', userId);
    const docRef = doc(db, `users/${userId}/exercises/certification`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('Existing certification data found:', docSnap.data());
      return docSnap.data() as CertificationData;
    }
    
    console.log('No certification data found, creating initial data');
    // Si pas de données, on crée un document vide
    const initialData: CertificationData = {
      id: 'certification',
      userId,
      status: 'not_started',
      onlineExercisesScore: 0,
      finalExamScore: 0,
      totalScore: 0,
      trainerComment: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(docRef, initialData);
    console.log('Initial certification data created:', initialData);
    return initialData;
  },

  async updateTrainerComment(userId: string, comment: string): Promise<void> {
    console.log('updateTrainerComment called for userId:', userId);
    const docRef = doc(db, `users/${userId}/exercises/certification`);
    await updateDoc(docRef, { 
      trainerComment: comment,
      updatedAt: new Date().toISOString()
    });
    console.log('Trainer comment updated successfully');
  },

  /**
   * Calcule et met à jour les scores de certification en prenant en compte tous les exercices publiés
   * @param userId ID de l'utilisateur
   * @returns Données de certification mises à jour
   */
  async calculateAndUpdateScores(userId: string): Promise<CertificationData> {
    // Utiliser la liste globale des exercices
    let onlineExercisesScore = 0;
    let finalExamScore = 0;
    let hasAnyScore = false;

    console.log(`Début du calcul des scores pour l'utilisateur ${userId}`);
    console.log('Liste des exercices à vérifier:', exercisePaths.map(e => e.path).join(', '));

    // Récupérer et additionner les scores des exercices en ligne
    for (const exercise of exercisePaths) {
      // Séparer les exercices en ligne de l'examen final
      if (exercise.path === 'points_role_final') {
        console.log(`Exercice ${exercise.path} ignoré pour le moment (examen final)`);
        continue;
      }
      
      console.log(`Vérification de l'exercice: ${exercise.path} (max: ${exercise.maxScore} points)`);
      const exerciseRef = doc(db, `users/${userId}/exercises/${exercise.path}`);
      const exerciseSnap = await getDoc(exerciseRef);
      
      if (!exerciseSnap.exists()) {
        console.log(`Exercice ${exercise.path} non trouvé pour cet utilisateur`);
        continue;
      }
      
      const exerciseData = exerciseSnap.data();
      console.log(`Exercice ${exercise.path} - statut: ${exerciseData?.status}, score: ${exerciseData?.totalScore}`);
      
      // Ne prendre en compte que les exercices ayant un score validé
      // Liste des statuts qui indiquent qu'un exercice a été évalué et a un score validé
      const validatedStatuses = [
        // Statuts avec score validé
        'published',           // Utilisé dans certains exercices comme statut final (EOMBUS-PAFI)
        'evaluated',           // Utilisé dans la plupart des exercices après évaluation (Goalkeeper, CDAB, etc.)
        'completed'            // Utilisé dans certains exercices comme Eisenhower
      ];
      
      // Note: 'submitted' et 'pending_validation' sont exclus car ils n'ont généralement pas de score validé
      // 'in_progress' est traité spécialement pour l'examen final plus bas
      
      console.log(`Statut de l'exercice ${exercise.path}: ${exerciseData?.status}`);
      console.log(`Est-ce un statut comptabilisé? ${validatedStatuses.includes(exerciseData?.status || '')}`);
      
      if (exerciseData && 
          validatedStatuses.includes(exerciseData.status) && 
          typeof exerciseData.totalScore === 'number') {
        // S'assurer que le score ne dépasse pas le maximum pour cet exercice
        const validScore = Math.min(exerciseData.totalScore, exercise.maxScore);
        console.log(`Exercice ${exercise.path} - score validé: ${validScore}/${exercise.maxScore}`);
        onlineExercisesScore += validScore;
        hasAnyScore = true;
      } else {
        console.log(`Exercice ${exercise.path} ignoré (non publié ou score invalide)`);
      }
    }

    // Récupérer le score de l'examen final (jeu de rôle)
    console.log('Vérification de l\'examen final');
    const finalExamPath = exercisePaths.find(e => e.path === 'points_role_final');
    if (finalExamPath) {
      console.log(`Examen final trouvé dans la configuration (max: ${finalExamPath.maxScore} points)`);
      const finalExamRef = doc(db, `users/${userId}/exercises/points_role_final`);
      const finalExamSnap = await getDoc(finalExamRef);
      
      if (!finalExamSnap.exists()) {
        console.log('Examen final non trouvé pour cet utilisateur');
      } else {
        const finalExamData = finalExamSnap.data();
        console.log(`Examen final - statut: ${finalExamData?.status}, score: ${finalExamData?.totalScore}`);
        
        // Pour l'examen final, nous acceptons également le statut 'in_progress' s'il a un score
        // car l'examen final peut avoir un score même s'il est encore en cours
        const validExamStatuses = [
          // Statuts avec score validé
          'published',           // Utilisé dans certains exercices comme statut final
          'evaluated',           // Utilisé dans la plupart des exercices après évaluation
          'completed',           // Utilisé dans certains exercices comme Eisenhower
          'in_progress'          // Spécifique à l'examen final qui peut avoir un score même en cours
        ];
        
        console.log(`Statut de l'examen final: ${finalExamData?.status}`);
        console.log(`Est-ce un statut comptabilisé? ${validExamStatuses.includes(finalExamData?.status || '')}`);
        
        // Vérifier si l'examen a un statut valide ET un score
        if (finalExamData && 
            validExamStatuses.includes(finalExamData.status) && 
            typeof finalExamData.totalScore === 'number' && 
            finalExamData.totalScore > 0) {
          finalExamScore = typeof finalExamData.totalScore === 'number' ? finalExamData.totalScore : 0;
          finalExamScore = Math.min(finalExamScore, finalExamPath.maxScore);
          console.log(`Examen final - score validé: ${finalExamScore}/${finalExamPath.maxScore}`);
          if (finalExamScore > 0) hasAnyScore = true;
        } else {
          console.log('Examen final ignoré (non publié ou score invalide)');
        }
      }
    } else {
      console.log('Configuration de l\'examen final non trouvée');
    }
    
    // Calculer le score total (490 + 680 = 1170 points maximum)
    const totalScore = onlineExercisesScore + finalExamScore;
    console.log('Résumé des scores calculés:');
    console.log(`- Score des exercices en ligne: ${onlineExercisesScore} points`);
    console.log(`- Score de l'examen final: ${finalExamScore} points`);
    console.log(`- Score total: ${totalScore} points`);

    // Mettre à jour les données de certification
    const certificationData: Partial<CertificationData> = {
      onlineExercisesScore,
      finalExamScore,
      totalScore,
      updatedAt: new Date().toISOString(),
      status: hasAnyScore ? 'in_progress' : 'not_started'
    };
    
    console.log(`Statut de la certification: ${certificationData.status}`);

    // Si au moins un exercice a été publié, marquer comme en cours
    if (hasAnyScore) {
      certificationData.status = 'in_progress';
      // Si l'examen final est aussi publié, marquer comme complété
      if (finalExamScore > 0) {
        certificationData.status = 'completed';
      }
    }

    const docRef = doc(db, `users/${userId}/exercises/certification`);
    await updateDoc(docRef, certificationData);

    return {
      ...(await this.getCertificationData(userId)),
      ...certificationData
    };
  },

  /**
   * Écoute les changements dans les exercices et met à jour la certification en temps réel
   * @param userId ID de l'utilisateur
   * @param onUpdate Callback appelé lorsque les données de certification sont mises à jour
   * @returns Fonction pour arrêter l'écoute
   */
  subscribeToExerciseChanges(userId: string, onUpdate: (data: CertificationData) => void): () => void {
    console.log('Mise en place de l\'\u00e9coute des changements d\'exercices pour la certification');
    
    // Créer un tableau pour stocker toutes les fonctions d'annulation d'écoute
    const unsubscribeFunctions: Array<() => void> = [];
    
    // Écouter les changements dans chaque exercice
    for (const exercise of exercisePaths) {
      const exerciseRef = doc(db, `users/${userId}/exercises/${exercise.path}`);
      const unsubscribe = onSnapshot(exerciseRef, async (snapshot) => {
        if (snapshot.exists()) {
          const exerciseData = snapshot.data();
          
          // Si l'exercice est publié, recalculer les scores de certification
          if (exerciseData && exerciseData.status === 'published') {
            console.log(`Exercice ${exercise.path} mis à jour, recalcul des scores de certification`);
            const updatedData = await this.calculateAndUpdateScores(userId);
            onUpdate(updatedData);
          }
        }
      }, (error) => {
        console.error(`Erreur lors de l'écoute des changements de l'exercice ${exercise.path}:`, error);
      });
      
      unsubscribeFunctions.push(unsubscribe);
    }
    
    // Retourner une fonction pour arrêter toutes les écoutes
    return () => {
      console.log('Arrêt de l\'\u00e9coute des changements d\'exercices pour la certification');
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }
};
