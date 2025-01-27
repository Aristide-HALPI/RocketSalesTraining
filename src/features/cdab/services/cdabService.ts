import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { AIEvaluationResponse, AIService } from '../../../services/AIService';

export interface CdabCharacteristic {
  id: string;
  name: string;
  type: string;
  description: string;
  descriptionComment?: string;
  descriptionScore?: number;
  definition?: string;
  advantages: string;
  advantagesComment?: string;
  advantagesScore?: number;
  benefits: string;
  benefitsComment?: string;
  benefitsScore?: number;
  proofs: string;
  proofsComment?: string;
  proofsScore?: number;
  problems: string;
  problemsComment?: string;
  problemsScore?: number;
  trainerComment?: string;
  score?: number;
  comment?: string;
}

export interface CdabExercise {
  id: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated';
  characteristics: CdabCharacteristic[];
  totalScore: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
  aiEvaluation?: AIEvaluationResponse;
  evaluatedAt?: string;
  evaluatedBy?: string;
  submittedAt?: string;
  trainerFinalComment?: string;
}

// Configuration initiale des caractéristiques
export const CHARACTERISTICS_CONFIG: CdabCharacteristic[] = Array(8).fill(null).map((_, index) => ({
  id: `characteristic-${index + 1}`,
  name: `Caractéristique n°${index + 1}`,
  type: index === 0 ? 'definition' : 'standard',
  description: '',
  definition: '',
  advantages: '',
  benefits: '',
  proofs: '',
  problems: ''
}));

const cleanUndefined = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj));
};

// Vérifie si l'exercice est vide (aucune réponse saisie)
// function isExerciseEmpty(characteristics: CdabCharacteristic[]): boolean {
//   return characteristics.every(char => 
//     !char.description.trim() &&
//     !char.definition.trim() &&
//     !char.advantages.trim() &&
//     !char.benefits.trim() &&
//     !char.proofs.trim() &&
//     !char.problems.trim()
//   );
// }

export const cdabService = {
  async getExercise(userId: string): Promise<CdabExercise> {
    console.log('Getting exercise for user:', userId);
    const exerciseRef = doc(db, 'exercises', userId, 'user_exercises', 'cdab');
    const exerciseDoc = await getDoc(exerciseRef);

    if (!exerciseDoc.exists()) {
      console.log('Exercise does not exist, creating new one');
      const newExercise: CdabExercise = {
        id: 'cdab',
        userId,
        status: 'not_started',
        characteristics: CHARACTERISTICS_CONFIG,
        totalScore: 0,
        maxScore: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(exerciseRef, cleanUndefined(newExercise));
      return newExercise;
    }

    console.log('Exercise found:', exerciseDoc.data());
    return exerciseDoc.data() as CdabExercise;
  },

  subscribeToExercise(userId: string, callback: (exercise: CdabExercise) => void) {
    console.log('Subscribing to exercise for user:', userId);
    const exerciseRef = doc(db, 'exercises', userId, 'user_exercises', 'cdab');
    
    // Créer l'exercice s'il n'existe pas
    this.getExercise(userId).catch(console.error);
    
    return onSnapshot(exerciseRef, (doc) => {
      console.log('Received exercise update:', doc.data());
      if (doc.exists()) {
        callback(doc.data() as CdabExercise);
      } else {
        console.log('Exercise document does not exist in subscription');
      }
    }, (error) => {
      console.error('Error in exercise subscription:', error);
    });
  },

  async updateExercise(userId: string, updates: Partial<CdabExercise>) {
    console.log('Updating exercise for user:', userId, updates);
    const exerciseRef = doc(db, 'exercises', userId, 'user_exercises', 'cdab');
    const cleanUpdates = cleanUndefined({
      ...updates,
      updatedAt: new Date().toISOString()
    });

    await updateDoc(exerciseRef, cleanUpdates);
  },

  async updateCharacteristicScore(
    userId: string, 
    characteristicIndex: number, 
    field: keyof CdabCharacteristic, 
    score: number,
    comment: string
  ) {
    console.log('Updating characteristic score:', { userId, characteristicIndex, field, score, comment });
    const exercise = await this.getExercise(userId);
    const characteristics = [...exercise.characteristics];
    
    characteristics[characteristicIndex] = {
      ...characteristics[characteristicIndex],
      [`${field}Score`]: score,
      [`${field}Comment`]: comment
    };

    // Calculer le score total
    let totalScore = 0;
    characteristics.forEach(char => {
      totalScore += (char.descriptionScore || 0);
      totalScore += (char.advantagesScore || 0);
      totalScore += (char.benefitsScore || 0);
      totalScore += (char.proofsScore || 0);
      totalScore += (char.problemsScore || 0);
    });

    await this.updateExercise(userId, {
      characteristics,
      totalScore: Math.round(totalScore / characteristics.length)
    });
  },

  async submitExercise(userId: string) {
    console.log('Submitting exercise for user:', userId);
    const exerciseRef = doc(db, 'exercises', userId, 'user_exercises', 'cdab');
    const exercise = await getDoc(exerciseRef);
    
    if (!exercise.exists()) {
      throw new Error('Exercise not found');
    }

    await updateDoc(exerciseRef, {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  async evaluateExercise(userId: string, characteristics: CdabExercise['characteristics'], evaluatorId: string) {
    if (!userId) throw new Error('User ID is required');
    if (!characteristics) throw new Error('Characteristics are required');
    if (!evaluatorId) throw new Error('Evaluator ID is required');

    const exerciseRef = doc(db, 'exercises', userId, 'user_exercises', 'cdab');

    // Calculer le score total (somme des scores sauf pour la définition)
    let totalPossibleScore = 0;
    let totalScore = 0;
    characteristics.forEach((characteristic) => {
      if (characteristic.type !== 'definition') {
        // Chaque caractéristique a 5 sections notées sur 2 points : description, avantages, bénéfices, preuves, problèmes
        totalPossibleScore += 10; // 5 sections × 2 points
        totalScore += (characteristic.descriptionScore || 0) +
                     (characteristic.advantagesScore || 0) +
                     (characteristic.benefitsScore || 0) +
                     (characteristic.proofsScore || 0) +
                     (characteristic.problemsScore || 0);
      }
    });

    // Règle de trois pour mettre sur 30 points
    const finalScore = Math.round((totalScore / totalPossibleScore) * 30);

    await updateDoc(exerciseRef, {
      characteristics,
      totalScore: finalScore,
      maxScore: 30,
      status: 'evaluated',
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: evaluatorId
    });
  },

  async evaluateWithAI(userId: string): Promise<void> {
    console.log('Evaluating exercise with AI for user:', userId);
    const exerciseRef = doc(db, 'exercises', userId, 'user_exercises', 'cdab');
    const exercise = await getDoc(exerciseRef);
    
    if (!exercise.exists()) {
      throw new Error('Exercise not found');
    }

    const exerciseData = exercise.data() as CdabExercise;
    
    const evaluation = await AIService.evaluateExercise({
      type: 'cdab',
      sections: exerciseData.characteristics
    });

    await updateDoc(exerciseRef, cleanUndefined({
      aiEvaluation: evaluation,
      updatedAt: new Date().toISOString()
    }));
  }
};
