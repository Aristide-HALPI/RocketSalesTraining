import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import type { AIEvaluationResponse } from '../../../api/ai/routes/evaluation';
import { evaluateExercise } from '../../../api/ai/routes/evaluation';
import { ExerciseStatus } from '../../../types/exercises';

export interface CdabCharacteristic {
  id: string;
  name: string;
  type: string;
  description: string;
  descriptionComment?: string;
  descriptionScore?: number;
  descriptionLastEvaluatedAt?: string;
  aiDescriptionScore?: number;
  aiDescriptionComment?: string;
  aiDescriptionLastEvaluatedAt?: string;
  definition?: string;
  advantages: string;
  advantagesComment?: string;
  advantagesScore?: number;
  advantagesLastEvaluatedAt?: string;
  aiAdvantagesScore?: number;
  aiAdvantagesComment?: string;
  aiAdvantagesLastEvaluatedAt?: string;
  benefits: string;
  benefitsComment?: string;
  benefitsScore?: number;
  benefitsLastEvaluatedAt?: string;
  aiBenefitsScore?: number;
  aiBenefitsComment?: string;
  aiBenefitsLastEvaluatedAt?: string;
  proofs: string;
  proofsComment?: string;
  proofsScore?: number;
  proofsLastEvaluatedAt?: string;
  aiProofsScore?: number;
  aiProofsComment?: string;
  aiProofsLastEvaluatedAt?: string;
  problems: string;
  problemsComment?: string;
  problemsScore?: number;
  problemsLastEvaluatedAt?: string;
  aiProblemsScore?: number;
  aiProblemsComment?: string;
  aiProblemsLastEvaluatedAt?: string;
  trainerComment?: string;
  score?: number;
  aiScore?: number;
  evaluatedByTrainer?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface CdabExercise {
  id: string;
  userId: string;
  status: ExerciseStatus;
  characteristics: CdabCharacteristic[];
  totalScore: number;
  maxScore: number;
  aiTotalScore?: number;
  aiFinalScore?: number;
  finalScore?: number;
  createdAt: string;
  updatedAt: string;
  lastAiEvaluation?: string;
  aiEvaluation?: AIEvaluationResponse;
  evaluatedAt?: string;
  evaluatedBy?: string;
  submittedAt?: string;
  trainerFinalComment?: string;
  hasAllRequiredCharacteristics?: boolean;
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
  problems: '',
  descriptionScore: 0,
  advantagesScore: 0,
  benefitsScore: 0,
  proofsScore: 0,
  problemsScore: 0
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
  async migrateExerciseData(userId: string): Promise<void> {
    console.log('Migrating exercise data for user:', userId);
    
    // Ancien chemin
    const oldExerciseRef = doc(db, 'exercises', userId, 'user_exercises', 'cdab');
    const oldExerciseDoc = await getDoc(oldExerciseRef);

    if (!oldExerciseDoc.exists()) {
      console.log('No old exercise data found for user:', userId);
      return;
    }

    // Nouveau chemin
    const newExerciseRef = doc(db, `users/${userId}/exercises`, 'cdab');
    const oldData = oldExerciseDoc.data() as CdabExercise;

    console.log('Found old exercise data:', oldData);

    try {
      // Copier les données vers le nouveau chemin
      await setDoc(newExerciseRef, cleanUndefined(oldData));
      console.log('Successfully migrated exercise data to new path');

      // Optionnel : supprimer les anciennes données
      // await deleteDoc(oldExerciseRef);
      // console.log('Deleted old exercise data');
    } catch (error) {
      console.error('Error migrating exercise data:', error);
      throw error;
    }
  },

  async getExercise(userId: string): Promise<CdabExercise> {
    console.log('Getting exercise for user:', userId);
    
    // Vérifier d'abord le nouveau chemin
    const newExerciseRef = doc(db, `users/${userId}/exercises`, 'cdab');
    const newExerciseDoc = await getDoc(newExerciseRef);

    // Si l'exercice existe au nouveau chemin, le retourner
    if (newExerciseDoc.exists()) {
      console.log('Exercise found at new path:', newExerciseDoc.data());
      return newExerciseDoc.data() as CdabExercise;
    }

    // Sinon, vérifier l'ancien chemin et migrer si nécessaire
    const oldExerciseRef = doc(db, 'exercises', userId, 'user_exercises', 'cdab');
    const oldExerciseDoc = await getDoc(oldExerciseRef);

    if (oldExerciseDoc.exists()) {
      console.log('Exercise found at old path, migrating...');
      await this.migrateExerciseData(userId);
      return oldExerciseDoc.data() as CdabExercise;
    }

    // Si aucun exercice n'existe, en créer un nouveau
    console.log('No exercise found, creating new one');
    const newExercise: CdabExercise = {
      id: 'cdab',
      userId,
      status: ExerciseStatus.NotStarted,
      characteristics: CHARACTERISTICS_CONFIG,
      totalScore: 0,
      maxScore: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(newExerciseRef, cleanUndefined(newExercise));
    return newExercise;
  },

  subscribeToExercise(userId: string, callback: (exercise: CdabExercise) => void) {
    console.log('Subscribing to exercise for user:', userId);
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'cdab');
    
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
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'cdab');
    const cleanUpdates = cleanUndefined({
      ...updates,
      updatedAt: new Date().toISOString()
    });

    await updateDoc(exerciseRef, cleanUpdates);
  },

  async updateCharacteristicScore(
    userId: string, 
    characteristicIndex: number, 
    field: string, 
    score: number,
    comment: string
  ): Promise<void> {
    try {
      console.log(`Updating score for characteristic ${characteristicIndex}, field ${field}, score ${score}`);
      
      const exerciseRef = doc(db, `users/${userId}/exercises`, 'cdab');
      const exerciseDoc = await getDoc(exerciseRef);

      if (!exerciseDoc.exists()) {
        throw new Error('Exercise not found');
      }

      const exerciseData = exerciseDoc.data() as CdabExercise;
      const updatedCharacteristics = [...exerciseData.characteristics];
      const characteristic = updatedCharacteristics[characteristicIndex];

      if (!characteristic) {
        throw new Error('Characteristic not found');
      }

      // Mettre à jour le score et le commentaire
      if (field.endsWith('Score')) {
        // Extraire la section du champ (description, advantages, etc.)
        const section = field.replace('Score', '');
        
        // Mettre à jour le score principal
        characteristic[field as keyof CdabCharacteristic] = score;
        characteristic[`${section}Comment` as keyof CdabCharacteristic] = comment;
        characteristic[`${section}LastEvaluatedAt` as keyof CdabCharacteristic] = new Date().toISOString();
        
        // Marquer que cette section a été évaluée par un formateur
        characteristic.evaluatedByTrainer = true;

        console.log(`Updated score for section ${section}:`, {
          score,
          comment,
          timestamp: new Date().toISOString()
        });

        // Recalculer le score total de la caractéristique
        const scores = [
          characteristic.descriptionScore || 0,
          characteristic.advantagesScore || 0,
          characteristic.benefitsScore || 0,
          characteristic.proofsScore || 0,
          characteristic.problemsScore || 0
        ];
        
        characteristic.score = scores.reduce((a, b) => a + b, 0);
        console.log(`New total score for characteristic: ${characteristic.score}`);
      }

      // Utiliser calculateTotalScore pour avoir un calcul cohérent
      const { totalScore, maxScore, finalScore } = this.calculateTotalScore(updatedCharacteristics);
      console.log('New exercise scores:', { totalScore, maxScore, finalScore });

      // Calculer aussi le score AI total
      let aiTotalScore = 0;
      updatedCharacteristics.forEach((char, index) => {
        if (char.type !== 'definition' && index < 7) {
          const aiScores = [
            char.aiDescriptionScore || 0,
            char.aiAdvantagesScore || 0,
            char.aiBenefitsScore || 0,
            char.aiProofsScore || 0,
            char.aiProblemsScore || 0
          ];
          aiTotalScore += aiScores.reduce((a, b) => a + b, 0);
        }
      });
      const aiFinalScore = Math.round((aiTotalScore / maxScore) * 100);

      // Mettre à jour l'exercice avec tous les changements
      const updateData = {
        characteristics: updatedCharacteristics,
        totalScore,
        maxScore,
        finalScore,
        aiTotalScore,
        aiFinalScore,
        updatedAt: serverTimestamp(),
        evaluatedAt: serverTimestamp(),
        evaluatedBy: 'trainer',
        status: ExerciseStatus.Evaluated
      };

      console.log('Updating exercise with data:', updateData);
      await updateDoc(exerciseRef, updateData);
      console.log('Exercise updated successfully');

    } catch (error) {
      console.error('Error updating characteristic score:', error);
      throw error;
    }
  },

  async submitExercise(userId: string): Promise<void> {
    console.log('Submitting exercise for user:', userId);
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'cdab');
    const exercise = await getDoc(exerciseRef);
    
    if (!exercise.exists()) {
      throw new Error('Exercise not found');
    }

    await updateDoc(exerciseRef, {
      status: ExerciseStatus.Submitted,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  async evaluateExercise(userId: string, characteristics: CdabExercise['characteristics'], evaluatorId: string) {
    if (!userId) throw new Error('User ID is required');
    if (!characteristics) throw new Error('Characteristics are required');
    if (!evaluatorId) throw new Error('Evaluator ID is required');

    const exerciseRef = doc(db, `users/${userId}/exercises`, 'cdab');

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

    // Règle de trois pour mettre sur 100 points
    const finalScore = Math.round((totalScore / totalPossibleScore) * 100);

    await updateDoc(exerciseRef, {
      characteristics,
      totalScore: totalScore,
      maxScore: totalPossibleScore,
      finalScore: finalScore,
      status: ExerciseStatus.Evaluated,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: evaluatorId
    });
  },

  async getAIEvaluation(characteristics: CdabCharacteristic[], organizationId: string) {
    // Formater les caractéristiques pour l'IA
    const formattedContent = {
      type: 'cdab',
      exercise: {
        characteristics: characteristics.map((char, index) => {
          // Pour la 8ème caractéristique, si elle est vide, on ne l'envoie pas à l'IA
          if (index === 7 && !char.description && !char.advantages && !char.benefits && !char.proofs && !char.problems) {
            return null;
          }

          return {
            id: char.id,
            name: char.name,
            description: char.description || '',
            definition: char.definition || '',
            advantages: char.advantages || '',
            benefits: char.benefits || '',
            proofs: char.proofs || '',
            problems: char.problems || ''
          };
        }).filter(char => char !== null) // Filtrer les caractéristiques nulles
      }
    };

    // Évaluer avec l'IA
    const response = await evaluateExercise(
      organizationId,
      JSON.stringify(formattedContent),
      'cdab'
    );

    // Vérifier si la réponse a la structure attendue
    const responses = response.evaluation?.responses || response.responses;
    
    if (!responses) {
      throw new Error('Format de réponse invalide');
    }

    // Calculer le score total et le maximum possible
    const maxPointsPerSection = 2; // Chaque section vaut 2 points
    const sectionsPerCharacteristic = 5; // 5 sections par caractéristique
    const maxPointsPerCharacteristic = maxPointsPerSection * sectionsPerCharacteristic;
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    // Grouper les réponses par caractéristique
    const characteristicScores = new Map<number, number[]>();
    responses.forEach(r => {
      const charNum = r.characteristic;
      if (!characteristicScores.has(charNum)) {
        characteristicScores.set(charNum, []);
      }
      characteristicScores.get(charNum)?.push(r.score || 0);
    });
    
    // Calculer le score pour chaque caractéristique
    characteristicScores.forEach((scores) => {
      const characteristicScore = scores.reduce((sum: number, score: number) => sum + score, 0);
      totalScore += characteristicScore;
      maxPossibleScore += maxPointsPerCharacteristic;
    });

    // Vérifier si toutes les caractéristiques obligatoires (1-7) sont présentes
    const hasAllRequiredCharacteristics = Array.from(characteristicScores.keys())
      .filter(charNum => charNum <= 7)
      .length === 7;

    // Si toutes les caractéristiques obligatoires sont présentes, convertir le score de 70 à 100
    const finalScoreOutOf100 = hasAllRequiredCharacteristics
      ? Math.round((totalScore / 70) * 100)
      : Math.round((totalScore / maxPossibleScore) * 100);

    return {
      responses,
      totalScore,
      maxPossibleScore,
      finalScoreOutOf100,
      hasAllRequiredCharacteristics
    };
  },

  async evaluateWithAI(userId: string, organizationId: string, startIndex: number = 0, endIndex: number = 4) {
    try {
      const exerciseRef = doc(db, `users/${userId}/exercises`, 'cdab');
      const exerciseDoc = await getDoc(exerciseRef);

      if (!exerciseDoc.exists()) {
        throw new Error('Exercise not found');
      }

      const exerciseData = exerciseDoc.data() as CdabExercise;
      const characteristics = exerciseData.characteristics;

      // Vérifier que les indices sont valides
      if (startIndex < 0 || endIndex >= characteristics.length || startIndex > endIndex) {
        throw new Error('Invalid characteristic indices');
      }

      // Préparer les caractéristiques à évaluer (1-7 obligatoires, 8 optionnelle)
      const characteristicsToEvaluate = characteristics.slice(startIndex, endIndex + 1).map((char, idx) => {
        const globalIndex = startIndex + idx;
        // Si c'est une caractéristique obligatoire (1-7) mais vide, on crée une version vide pour l'évaluation
        if (globalIndex < 7 && !char.description && !char.advantages && !char.benefits && !char.proofs && !char.problems) {
          return {
            ...char,
            description: "Non rempli",
            advantages: "Non rempli",
            benefits: "Non rempli",
            proofs: "Non rempli",
            problems: "Non rempli"
          };
        }
        return char;
      });

      console.log(`Starting AI evaluation for user: ${userId}, characteristics ${startIndex + 1}-${endIndex + 1}`);

      // Obtenir l'évaluation de l'IA
      const aiResponse = await this.getAIEvaluation(characteristicsToEvaluate, organizationId);

      // Mettre à jour les caractéristiques avec les scores de l'IA
      const updatedCharacteristics = [...characteristics];
      aiResponse.responses.forEach(response => {
        // Ajuster l'index pour correspondre à la position réelle dans le tableau
        const characteristicNumber = response.characteristic;
        const index = characteristicNumber - 1; // Les caractéristiques commencent à 1 dans la réponse de l'IA
        
        if (index >= 0 && index < characteristics.length) {
          const characteristic = updatedCharacteristics[index];
          
          // Si c'est une caractéristique vide et obligatoire (1-7), on met des scores de 0
          const isEmpty = !characteristic.description && !characteristic.advantages && 
                         !characteristic.benefits && !characteristic.proofs && !characteristic.problems;
          const isRequired = index < 7;

          // Mettre à jour les scores et commentaires AI
          switch (response.section) {
            case 'Description':
              characteristic.aiDescriptionScore = isEmpty && isRequired ? 0 : response.score;
              characteristic.aiDescriptionComment = isEmpty && isRequired ? "Section non remplie" : response.comment;
              characteristic.aiDescriptionLastEvaluatedAt = new Date().toISOString();
              if (!characteristic.evaluatedByTrainer) {
                characteristic.descriptionScore = isEmpty && isRequired ? 0 : response.score;
                characteristic.descriptionComment = isEmpty && isRequired ? "Section non remplie" : response.comment;
                characteristic.descriptionLastEvaluatedAt = new Date().toISOString();
              }
              break;
            case 'Avantages':
              characteristic.aiAdvantagesScore = isEmpty && isRequired ? 0 : response.score;
              characteristic.aiAdvantagesComment = isEmpty && isRequired ? "Section non remplie" : response.comment;
              characteristic.aiAdvantagesLastEvaluatedAt = new Date().toISOString();
              if (!characteristic.evaluatedByTrainer) {
                characteristic.advantagesScore = isEmpty && isRequired ? 0 : response.score;
                characteristic.advantagesComment = isEmpty && isRequired ? "Section non remplie" : response.comment;
                characteristic.advantagesLastEvaluatedAt = new Date().toISOString();
              }
              break;
            case 'Bénéfices':
              characteristic.aiBenefitsScore = isEmpty && isRequired ? 0 : response.score;
              characteristic.aiBenefitsComment = isEmpty && isRequired ? "Section non remplie" : response.comment;
              characteristic.aiBenefitsLastEvaluatedAt = new Date().toISOString();
              if (!characteristic.evaluatedByTrainer) {
                characteristic.benefitsScore = isEmpty && isRequired ? 0 : response.score;
                characteristic.benefitsComment = isEmpty && isRequired ? "Section non remplie" : response.comment;
                characteristic.benefitsLastEvaluatedAt = new Date().toISOString();
              }
              break;
            case 'Preuves Clients':
              characteristic.aiProofsScore = isEmpty && isRequired ? 0 : response.score;
              characteristic.aiProofsComment = isEmpty && isRequired ? "Section non remplie" : response.comment;
              characteristic.aiProofsLastEvaluatedAt = new Date().toISOString();
              if (!characteristic.evaluatedByTrainer) {
                characteristic.proofsScore = isEmpty && isRequired ? 0 : response.score;
                characteristic.proofsComment = isEmpty && isRequired ? "Section non remplie" : response.comment;
                characteristic.proofsLastEvaluatedAt = new Date().toISOString();
              }
              break;
            case 'Problèmes':
              characteristic.aiProblemsScore = isEmpty && isRequired ? 0 : response.score;
              characteristic.aiProblemsComment = isEmpty && isRequired ? "Section non remplie" : response.comment;
              characteristic.aiProblemsLastEvaluatedAt = new Date().toISOString();
              if (!characteristic.evaluatedByTrainer) {
                characteristic.problemsScore = isEmpty && isRequired ? 0 : response.score;
                characteristic.problemsComment = isEmpty && isRequired ? "Section non remplie" : response.comment;
                characteristic.problemsLastEvaluatedAt = new Date().toISOString();
              }
              break;
          }

          // Calculer les scores
          const scores = [
            characteristic.descriptionScore || 0,
            characteristic.advantagesScore || 0,
            characteristic.benefitsScore || 0,
            characteristic.proofsScore || 0,
            characteristic.problemsScore || 0
          ];
          characteristic.score = Math.round((scores.reduce((a, b) => a + b, 0) / 10) * 100);
          
          const aiScores = [
            characteristic.aiDescriptionScore || 0,
            characteristic.aiAdvantagesScore || 0,
            characteristic.aiBenefitsScore || 0,
            characteristic.aiProofsScore || 0,
            characteristic.aiProblemsScore || 0
          ];
          characteristic.aiScore = Math.round((aiScores.reduce((a, b) => a + b, 0) / 10) * 100);
        }
      });

      // Mettre à jour le document avec les nouvelles données
      await updateDoc(exerciseRef, {
        characteristics: updatedCharacteristics,
        status: ExerciseStatus.Evaluated,
        evaluatedBy: 'ai',
        totalScore: aiResponse.totalScore,
        maxScore: aiResponse.maxPossibleScore,
        finalScore: aiResponse.finalScoreOutOf100,
        completedCharacteristics: aiResponse.hasAllRequiredCharacteristics ? 7 : 0,
        updatedAt: serverTimestamp()
      });

      console.log(`AI evaluation completed for characteristics ${startIndex + 1}-${endIndex + 1}`);

    } catch (error) {
      console.error('Error in AI evaluation:', error);
      throw error;
    }
  },

  async evaluateWithAIBatch(userId: string, organizationId: string, startIndex: number, endIndex: number): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`Starting AI evaluation for user: ${userId}, characteristics ${startIndex + 1}-${endIndex + 1}`);
    
    try {
      const exerciseRef = doc(db, `users/${userId}/exercises`, 'cdab');
      const exerciseDoc = await getDoc(exerciseRef);

      if (!exerciseDoc.exists()) {
        throw new Error('Exercise not found');
      }

      const exerciseData = exerciseDoc.data() as CdabExercise;
      
      // Sélectionner uniquement les caractéristiques du lot
      const batchCharacteristics = exerciseData.characteristics.slice(startIndex, endIndex + 1);
      
      // Formater les caractéristiques pour l'IA
      const formattedContent = {
        type: 'cdab',
        exercise: {
          characteristics: batchCharacteristics.map(char => ({
            id: char.id,
            name: char.name,
            description: char.description || '',
            definition: char.definition || '',
            advantages: char.advantages || '',
            benefits: char.benefits || '',
            proofs: char.proofs || '',
            problems: char.problems || ''
          }))
        }
      };

      // Évaluer avec l'IA
      const response = await evaluateExercise(
        organizationId,
        JSON.stringify(formattedContent),
        'cdab'
      );

      if (!response.responses || !Array.isArray(response.responses)) {
        throw new Error('Format de réponse invalide');
      }

      // Mettre à jour les caractéristiques évaluées
      const updatedCharacteristics = [...exerciseData.characteristics];
      
      // Ne pas mettre à jour si l'exercice est publié
      if (exerciseData.status === ExerciseStatus.Published) {
        console.log('Exercise is published, skipping evaluation');
        return;
      }

      // Créer un map des réponses par caractéristique et section
      const responseMap = new Map();
      response.responses.forEach(r => {
        const key = `${r.characteristic}_${r.section}`;
        responseMap.set(key, r);
      });

      // Mettre à jour chaque caractéristique du lot
      for (let i = startIndex; i <= endIndex; i++) {
        const char = updatedCharacteristics[i];
        if (!char) continue;

        const charIndex = i + 1;  // Index absolu (1-based) pour correspondre à la réponse de l'IA

        // Description
        const descResponse = responseMap.get(`${charIndex}_Description`);
        if (descResponse) {
          char.aiDescriptionScore = descResponse.score;
          char.aiDescriptionComment = descResponse.comment;
          char.aiDescriptionLastEvaluatedAt = new Date().toISOString();
          if (!char.evaluatedByTrainer) {
            char.descriptionScore = descResponse.score;
            char.descriptionComment = descResponse.comment;
            char.descriptionLastEvaluatedAt = new Date().toISOString();
          }
        }

        // Avantages
        const advResponse = responseMap.get(`${charIndex}_Avantages`);
        if (advResponse) {
          char.aiAdvantagesScore = advResponse.score;
          char.aiAdvantagesComment = advResponse.comment;
          char.aiAdvantagesLastEvaluatedAt = new Date().toISOString();
          if (!char.evaluatedByTrainer) {
            char.advantagesScore = advResponse.score;
            char.advantagesComment = advResponse.comment;
            char.advantagesLastEvaluatedAt = new Date().toISOString();
          }
        }

        // Bénéfices
        const benResponse = responseMap.get(`${charIndex}_Bénéfices`);
        if (benResponse) {
          char.aiBenefitsScore = benResponse.score;
          char.aiBenefitsComment = benResponse.comment;
          char.aiBenefitsLastEvaluatedAt = new Date().toISOString();
          if (!char.evaluatedByTrainer) {
            char.benefitsScore = benResponse.score;
            char.benefitsComment = benResponse.comment;
            char.benefitsLastEvaluatedAt = new Date().toISOString();
          }
        }

        // Preuves
        const proofResponse = responseMap.get(`${charIndex}_Preuves Clients`);
        if (proofResponse) {
          char.aiProofsScore = proofResponse.score;
          char.aiProofsComment = proofResponse.comment;
          char.aiProofsLastEvaluatedAt = new Date().toISOString();
          if (!char.evaluatedByTrainer) {
            char.proofsScore = proofResponse.score;
            char.proofsComment = proofResponse.comment;
            char.proofsLastEvaluatedAt = new Date().toISOString();
          }
        }

        // Problèmes
        const probResponse = responseMap.get(`${charIndex}_Problèmes`);
        if (probResponse) {
          char.aiProblemsScore = probResponse.score;
          char.aiProblemsComment = probResponse.comment;
          char.aiProblemsLastEvaluatedAt = new Date().toISOString();
          if (!char.evaluatedByTrainer) {
            char.problemsScore = probResponse.score;
            char.problemsComment = probResponse.comment;
            char.problemsLastEvaluatedAt = new Date().toISOString();
          }
        }

        // Calculer les scores
        const scores = [
          char.descriptionScore || 0,
          char.advantagesScore || 0,
          char.benefitsScore || 0,
          char.proofsScore || 0,
          char.problemsScore || 0
        ];
        char.score = Math.round((scores.reduce((a, b) => a + b, 0) / 10) * 100);
        
        const aiScores = [
          char.aiDescriptionScore || 0,
          char.aiAdvantagesScore || 0,
          char.aiBenefitsScore || 0,
          char.aiProofsScore || 0,
          char.aiProblemsScore || 0
        ];
        char.aiScore = Math.round((aiScores.reduce((a, b) => a + b, 0) / 10) * 100);
      }

      // Mettre à jour le document avec les caractéristiques
      const updateData: any = {
        characteristics: updatedCharacteristics,
        updatedAt: serverTimestamp(),
        lastAiEvaluation: serverTimestamp()
      };

      // Si l'exercice n'est pas déjà évalué par un formateur, mettre à jour le statut
      if (!exerciseData.characteristics.some(c => c.evaluatedByTrainer)) {
        updateData.status = ExerciseStatus.Evaluated;
        updateData.evaluatedBy = 'ai';
      }

      // Si c'est le dernier lot, calculer et mettre à jour le score total
      if (endIndex === exerciseData.characteristics.length - 1) {
        // Calculer le score total pour les caractéristiques 1-7 obligatoires
        let totalPoints = 0;
        let aiTotalPoints = 0;
        let maxPossiblePoints = 0;

        // Parcourir les caractéristiques 1-7 (index 0-6)
        for (let i = 0; i < 7; i++) {
          const char = updatedCharacteristics[i];
          if (char) {
            // Ajouter les points pour cette caractéristique
            const scores = [
              char.descriptionScore || char.aiDescriptionScore || 0,
              char.advantagesScore || char.aiAdvantagesScore || 0,
              char.benefitsScore || char.aiBenefitsScore || 0,
              char.proofsScore || char.aiProofsScore || 0,
              char.problemsScore || char.aiProblemsScore || 0
            ];
            
            totalPoints += scores.reduce((a, b) => a + b, 0);

            const aiScores = [
              char.aiDescriptionScore || 0,
              char.aiAdvantagesScore || 0,
              char.aiBenefitsScore || 0,
              char.aiProofsScore || 0,
              char.aiProblemsScore || 0
            ];
            aiTotalPoints += aiScores.reduce((a, b) => a + b, 0);

            // Chaque caractéristique vaut 10 points (2 points × 5 sections)
            maxPossiblePoints += 10;
          }
        }

        // Calculer les scores finaux
        const finalScore = maxPossiblePoints > 0 ? Math.round((totalPoints / maxPossiblePoints) * 100) : 0;

        // Ajouter les scores au updateData
        Object.assign(updateData, {
          totalScore: totalPoints,
          maxScore: maxPossiblePoints,
          finalScore: finalScore,
        });
      }

      // Mettre à jour le document
      await updateDoc(exerciseRef, updateData);

      console.log(`AI evaluation completed for characteristics ${startIndex + 1}-${endIndex + 1}`);
    } catch (error) {
      console.error('Error during AI evaluation:', error);
      throw error;
    }
  },

  async updateTrainerScores(userId: string) {
    const exerciseRef = doc(db, `users/${userId}/exercises`, 'cdab');
    const exerciseDoc = await getDoc(exerciseRef);

    if (!exerciseDoc.exists()) {
      throw new Error('Exercise not found');
    }

    const exerciseData = exerciseDoc.data() as CdabExercise;
    const { totalScore, maxScore, finalScore } = this.calculateTotalScore(exerciseData.characteristics);

    // Marquer chaque caractéristique comme évaluée par le formateur
    const updatedCharacteristics = exerciseData.characteristics.map(char => ({
      ...char,
      evaluatedByTrainer: true
    }));

    await updateDoc(exerciseRef, {
      characteristics: updatedCharacteristics,
      totalScore,
      maxScore,
      finalScore,
      status: ExerciseStatus.Evaluated,
      evaluatedAt: serverTimestamp(),
      evaluatedBy: 'trainer',
      updatedAt: serverTimestamp()
    });

    return {
      totalScore,
      maxScore,
      finalScore,
      characteristics: updatedCharacteristics
    };
  },

  // Calculer le score total pour un ensemble de caractéristiques
  calculateTotalScore(characteristics: CdabCharacteristic[]): { totalScore: number; maxScore: number; finalScore: number } {
    console.log('Calculating total score for characteristics:', characteristics);
    
    let totalScore = 0;
    const MAX_POINTS_PER_SECTION = 2; // Chaque section vaut 2 points
    const MAX_SECTIONS = 5; // 5 sections par caractéristique
    const MAX_CHARACTERISTICS = 7; // On compte les 7 premières caractéristiques
    const MAX_SCORE = MAX_POINTS_PER_SECTION * MAX_SECTIONS * MAX_CHARACTERISTICS; // 70 points au total

    // Calculer le score pour chaque caractéristique
    characteristics.forEach((char, index) => {
      // Ne pas compter la 8ème caractéristique dans le score total
      if (char.type !== 'definition' && index < MAX_CHARACTERISTICS) {
        const scores = [
          char.descriptionScore || 0,
          char.advantagesScore || 0,
          char.benefitsScore || 0,
          char.proofsScore || 0,
          char.problemsScore || 0
        ];
        
        const characteristicTotal = scores.reduce((a, b) => a + b, 0);
        console.log(`Characteristic ${index + 1} total score:`, characteristicTotal);
        totalScore += characteristicTotal;
      }
    });

    console.log('Total raw score:', totalScore);
    console.log('Max possible score:', MAX_SCORE);

    // Calculer le score final sur 100
    const finalScore = Math.round((totalScore / MAX_SCORE) * 100);
    console.log('Final score (out of 100):', finalScore);

    return {
      totalScore,
      maxScore: MAX_SCORE,
      finalScore
    };
  },

  // Fonction utilitaire pour obtenir le score le plus récent
  getMostRecentScore(trainerScore: number | undefined, trainerTimestamp: string | undefined,
                    aiScore: number | undefined, aiTimestamp: string | undefined): number {
    // Si aucun score n'existe, retourner 0
    if (!trainerScore && !aiScore) return 0;
    
    // Si un seul score existe, le retourner
    if (!trainerScore) return aiScore || 0;
    if (!aiScore) return trainerScore;
    
    // Si les deux scores existent, comparer les timestamps
    if (!trainerTimestamp) return aiScore;
    if (!aiTimestamp) return trainerScore;
    
    // Retourner le score avec le timestamp le plus récent
    return new Date(trainerTimestamp) > new Date(aiTimestamp) ? trainerScore : aiScore;
  },
};
