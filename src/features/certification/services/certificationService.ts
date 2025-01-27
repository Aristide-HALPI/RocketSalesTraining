import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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

export const certificationService = {
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

  async calculateAndUpdateScores(userId: string): Promise<CertificationData> {
    console.log('calculateAndUpdateScores called for userId:', userId);
    // Liste complète des exercices en ligne avec leurs scores maximums corrects
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
      { path: 'bonus', maxScore: 20 }
    ];

    let onlineExercisesScore = 0;
    let maxOnlineScore = 490; // Score maximum total corrigé pour les exercices en ligne
    let hasAnyScore = false;

    console.log('Fetching scores from exercises:', exercisePaths);
    for (const exercise of exercisePaths) {
      const exerciseRef = doc(db, `users/${userId}/exercises/${exercise.path}`);
      const exerciseSnap = await getDoc(exerciseRef);
      const exerciseData = exerciseSnap.data();
      
      if (exerciseData?.totalScore !== undefined) {
        console.log(`Found score for ${exercise.path}:`, exerciseData.totalScore);
        // S'assurer que le score ne dépasse pas le maximum pour cet exercice
        const validScore = Math.min(exerciseData.totalScore, exercise.maxScore);
        onlineExercisesScore += validScore;
        hasAnyScore = true;
      }
    }

    // Récupérer le score de l'examen final (jeu de rôle)
    console.log('Fetching final exam score');
    const finalExamRef = doc(db, `users/${userId}/exercises/points_role_final`);
    const finalExamSnap = await getDoc(finalExamRef);
    const finalExamData = finalExamSnap.data();
    const finalExamScore = finalExamData?.totalScore || 0;
    const maxFinalExamScore = 680; // Score maximum pour l'examen final
    const validFinalExamScore = Math.min(finalExamScore, maxFinalExamScore);
    console.log('Final exam score:', validFinalExamScore);

    // Calculer le score total (490 + 680 = 1170 points maximum)
    const totalScore = onlineExercisesScore + validFinalExamScore;
    const maxTotalScore = maxOnlineScore + maxFinalExamScore;
    console.log('Calculated total score:', totalScore, 'out of', maxTotalScore);

    // Mettre à jour les données de certification
    const certificationData: Partial<CertificationData> = {
      onlineExercisesScore,
      finalExamScore: validFinalExamScore,
      totalScore,
      updatedAt: new Date().toISOString(),
      status: hasAnyScore ? 'in_progress' : 'not_started'
    };

    // Si tous les exercices ont un score et l'examen final aussi, marquer comme complété
    if (hasAnyScore && finalExamScore > 0) {
      certificationData.status = 'completed';
    }

    const docRef = doc(db, `users/${userId}/exercises/certification`);
    await updateDoc(docRef, certificationData);
    console.log('Certification data updated successfully');

    return {
      ...(await this.getCertificationData(userId)),
      ...certificationData
    };
  }
};
