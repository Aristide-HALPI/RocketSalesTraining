import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { evaluateExercise, AIEvaluationResponse } from '../../../api/ai/routes/evaluation';
import { ExerciseStatus } from '../../../types/exercises';

export type DialogueRole = 'commercial' | 'client';
export type Score = string;

export interface DialogueEntry {
  role: DialogueRole;
  text: string;
  description?: string;
  feedback?: string;
  score?: Score;
  trainerComment?: string;
}

export interface RdvSection {
  id: string;
  title: string;
  description: string;
  dialogues: DialogueEntry[];
  trainerGeneralComment?: string;
}

export interface RdvDecideurExercise {
  id: string;
  userId: string;
  status: ExerciseStatus;
  sections: RdvSection[];
  totalScore?: number;
  maxScore: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string;
  aiEvaluation?: AIEvaluationResponse;
  evaluatedAt?: string;
  evaluatedBy?: string;
  submittedAt?: string;
  trainerFinalComment?: string;
}

interface AIDialogueEvaluation {
  index: number;
  role: DialogueRole;
  score: string;
  comment: string;
}

interface AISection {
  title: string;
  dialogues: AIDialogueEvaluation[];
  sectionScore: number;
  maxSectionScore: number;
}

interface AIEvaluationResult {
  sections: AISection[];
  generalFeedback: {
    pointsForts: string;
    axesAmelioration: string;
  };
  sectionScores: {
    introduction: number;
    accroche_irresistible: number;
    proposition_rdv: number;
    deuxieme_accroche: number;
  };
  totalScore: number;
  finalScoreOutOf40: number;
}

// Configuration des sections de l'exercice
export const SECTIONS_CONFIG = [
  {
    id: 'introduction',
    title: 'I. INTRODUCTION',
    description: 'Vérifiez votre contact, présentez-vous et montrez du respect pour le temps',
    dialogues: [
      { role: 'commercial' as DialogueRole, text: '', description: 'VÉRIFIEZ votre contact: son nom (si PAS encore donné) et son titre' },
      { role: 'client' as DialogueRole, text: '' },
      { role: 'commercial' as DialogueRole, text: '', description: 'PRÉSENTEZ-VOUS d\'une manière professionnelle: nom complet, nom de votre société et la spécialité de votre société' },
      { role: 'commercial' as DialogueRole, text: '', description: 'MONTREZ du respect pour le temps de votre interlocuteur' },
      { role: 'client' as DialogueRole, text: '' },
      { role: 'commercial' as DialogueRole, text: '' },
      { role: 'client' as DialogueRole, text: '' }
    ]
  },
  {
    id: 'accroche_irresistible',
    title: 'II. ACCROCHE IRRÉSISTIBLE',
    description: 'Présentez votre accroche irrésistible',
    dialogues: [
      { role: 'commercial' as DialogueRole, text: '', description: 'Question irrésistible (Motivateur fonctionnel du client)' },
      { role: 'client' as DialogueRole, text: '' },
      { role: 'commercial' as DialogueRole, text: '', description: 'Concept Unique de Vente (de votre solution)' },
      { role: 'commercial' as DialogueRole, text: '', description: 'Références clients irrésistibles' }
    ]
  },
  {
    id: 'proposition_rdv',
    title: 'III. PROPOSEZ UN RENDEZ-VOUS avec la technique de l\'alternative',
    description: 'Proposez le rendez-vous et obtenez les coordonnées',
    dialogues: [
      { role: 'commercial' as DialogueRole, text: '', description: 'Proposez le rendez vous avec une alternative' },
      { role: 'client' as DialogueRole, text: '' },
      { role: 'commercial' as DialogueRole, text: '', description: '!! n\'oubliez pas de demander le numéro de Mobile et l\'adresse email du client' },
      { role: 'client' as DialogueRole, text: '' }
    ]
  },
  {
    id: 'deuxieme_accroche',
    title: 'II. Écrivez une 2ème ACCROCHE IRRÉSISTIBLE avec un AUTRE Motivateur Personnel',
    description: 'Présentez une deuxième accroche avec un motivateur personnel',
    dialogues: [
      { role: 'commercial' as DialogueRole, text: '', description: 'Motivateur Personnel' },
      { role: 'client' as DialogueRole, text: '' },
      { role: 'commercial' as DialogueRole, text: '', description: 'Concept Unique de Vente' },
      { role: 'commercial' as DialogueRole, text: '', description: 'Référence client' }
    ]
  }
];

const CURRENT_EXERCISE_VERSION = 2; // Incrémentez ce numéro quand vous changez la structure

function cleanUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

// Calculer le score total sur 40
const calculateFinalScore = (exercise: RdvDecideurExercise): number => {
  if (!exercise.sections || exercise.sections.length === 0) {
    return 0;
  }

  // Calculer le score pour chaque section
  const sectionScores = exercise.sections.map(section => {
    // Points obtenus dans la section
    const earnedPoints = section.dialogues.reduce((total, dialogue) => {
      if (!dialogue.score) return total;
      return total + parseFloat(dialogue.score);
    }, 0);

    // Points maximum possibles pour la section
    const maxPoints = section.dialogues.reduce((total, dialogue) => {
      if (dialogue.role === 'commercial') {
        return total + 2; // Max score pour commercial
      } else {
        return total + 0.25; // Max score pour client
      }
    }, 0);

    // Score de la section sur 10 points (règle de trois)
    return (earnedPoints / maxPoints) * 10;
  });

  // Le score total est la somme des scores de section (chacune sur 10)
  const totalScore = sectionScores.reduce((sum, score) => sum + score, 0);
  
  // Arrondir à 2 décimales
  return Math.round(totalScore * 100) / 100;
};

const EXERCISE_DOC_NAME = 'meeting';

export const rdvDecideurService = {
  async getExercise(userId: string): Promise<RdvDecideurExercise> {
    if (!userId) {
      console.error('getExercise called without userId');
      throw new Error('userId is required');
    }

    console.log('Getting exercise for user:', userId);
    const docRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const exercise = docSnap.data() as RdvDecideurExercise;
      console.log('Exercise loaded:', {
        id: exercise.id,
        userId: exercise.userId,
        status: exercise.status,
        sections: exercise.sections.map((s: RdvSection) => ({
          id: s.id,
          dialoguesCount: s.dialogues.length,
          hasResponses: s.dialogues.some((d: DialogueEntry) => d.text && d.text.trim() !== '')
        }))
      });
      
      // Vérifier si l'exercice a besoin d'être mis à jour
      if (!exercise.version || exercise.version < CURRENT_EXERCISE_VERSION) {
        console.log('Exercise needs update, current version:', exercise.version);
        const updatedExercise = await this.updateExerciseToLatestVersion(userId, exercise);
        return updatedExercise;
      }
      
      return exercise;
    }

    console.log('Creating new exercise for user:', userId);
    const newExercise: RdvDecideurExercise = {
      id: EXERCISE_DOC_NAME,
      userId,
      status: ExerciseStatus.NotStarted,
      sections: SECTIONS_CONFIG,
      maxScore: 40,
      version: CURRENT_EXERCISE_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME), newExercise);
    return newExercise;
  },

  async updateExerciseToLatestVersion(userId: string, currentExercise: RdvDecideurExercise): Promise<RdvDecideurExercise> {
    console.log('Updating exercise to latest version:', {
      userId,
      currentVersion: currentExercise.version,
      targetVersion: CURRENT_EXERCISE_VERSION
    });
    
    const docRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
    
    // Créer un nouvel exercice en conservant le statut et les commentaires existants
    const updatedExercise: RdvDecideurExercise = {
      ...currentExercise,
      sections: SECTIONS_CONFIG.map((newSection, sectionIndex) => {
        const existingSection = currentExercise.sections[sectionIndex];
        if (!existingSection) return newSection;

        return {
          ...newSection,
          dialogues: newSection.dialogues.map((newDialogue, dialogueIndex) => {
            const existingDialogue = existingSection.dialogues[dialogueIndex];
            if (!existingDialogue) return newDialogue;

            return {
              ...newDialogue,
              text: existingDialogue.text || '',
              trainerComment: existingDialogue.trainerComment || ''
            };
          })
        };
      }),
      version: CURRENT_EXERCISE_VERSION,
      updatedAt: new Date().toISOString()
    };

    // Nettoyer les undefined avant sauvegarde
    const cleanedExercise = cleanUndefined(updatedExercise);
    console.log('Updated exercise:', {
      status: cleanedExercise.status,
      version: cleanedExercise.version,
      sections: cleanedExercise.sections.map((s: RdvSection) => ({
        id: s.id,
        dialoguesCount: s.dialogues.length,
        hasResponses: s.dialogues.some((d: DialogueEntry) => d.text && d.text.trim() !== '')
      }))
    });
    
    await setDoc(docRef, cleanedExercise);
    return cleanedExercise;
  },

  async resetExercise(userId: string): Promise<void> {
    const docRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
    const newExercise: RdvDecideurExercise = {
      id: EXERCISE_DOC_NAME,
      userId,
      status: ExerciseStatus.NotStarted,
      sections: SECTIONS_CONFIG,
      maxScore: 40,
      version: CURRENT_EXERCISE_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, newExercise);
  },

  async updateAllExercises(): Promise<void> {
    try {
      // Récupérer tous les utilisateurs
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);

      // Pour chaque utilisateur
      const updatePromises = usersSnap.docs.map(async (userDoc) => {
        const userId = userDoc.id;
        const exerciseRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
        const exerciseSnap = await getDoc(exerciseRef);

        if (exerciseSnap.exists()) {
          const currentExercise = exerciseSnap.data() as RdvDecideurExercise;
          
          // Créer un nouvel exercice en conservant le statut et les commentaires existants
          const updatedExercise: RdvDecideurExercise = {
            ...currentExercise,
            sections: SECTIONS_CONFIG.map((newSection, sectionIndex) => {
              const existingSection = currentExercise.sections[sectionIndex];
              if (!existingSection) return newSection;

              return {
                ...newSection,
                dialogues: newSection.dialogues.map((newDialogue, dialogueIndex) => {
                  const existingDialogue = existingSection.dialogues[dialogueIndex];
                  if (!existingDialogue) return newDialogue;

                  return {
                    ...newDialogue,
                    text: existingDialogue.text || newDialogue.text,
                    trainerComment: existingDialogue.trainerComment
                  };
                })
              };
            }),
            version: CURRENT_EXERCISE_VERSION,
            updatedAt: new Date().toISOString()
          };

          await setDoc(exerciseRef, updatedExercise);
        }
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating exercises:', error);
      throw error;
    }
  },

  subscribeToExercise(userId: string, callback: (exercise: RdvDecideurExercise) => void) {
    console.log('Setting up exercise subscription for:', userId);
    const docRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
    
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const exercise = snapshot.data() as RdvDecideurExercise;
        console.log('Exercise snapshot update:', {
          id: exercise.id,
          status: exercise.status,
          hasResponses: exercise.sections.some((section: RdvSection) => 
            section.dialogues.some((dialogue: DialogueEntry) => 
              dialogue.text && dialogue.text.trim() !== ''
            )
          )
        });
        callback(exercise);
      } else {
        console.log('No exercise found for user:', userId);
      }
    }, (error) => {
      console.error('Error in exercise subscription:', error);
    });
  },

  async updateExercise(userId: string, updates: Partial<RdvDecideurExercise>): Promise<void> {
    const docRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
    
    // Nettoyer les undefined avant sauvegarde
    const cleanedUpdates = cleanUndefined(updates);
    await updateDoc(docRef, cleanedUpdates);
  },

  async submitExercise(userId: string): Promise<void> {
    console.log('Submitting exercise for user:', userId);
    const docRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Exercise not found');
    }

    const exercise = docSnap.data() as RdvDecideurExercise;
    console.log('Current exercise state:', {
      id: exercise.id,
      status: exercise.status,
      hasResponses: exercise.sections.some((section: RdvSection) => 
        section.dialogues.some((dialogue: DialogueEntry) => 
          dialogue.text && dialogue.text.trim() !== ''
        )
      )
    });

    const updatedExercise = {
      ...exercise,
      status: ExerciseStatus.Submitted,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Utiliser setDoc au lieu de updateDoc pour s'assurer que tout le document est mis à jour
    await setDoc(docRef, cleanUndefined(updatedExercise));
    console.log('Exercise submitted successfully, new status:', updatedExercise.status);
  },

  async evaluateExercise(userId: string): Promise<AIEvaluationResponse> {
    const docRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Exercise not found');
    }

    const exercise = docSnap.data() as RdvDecideurExercise;
    
    // Extraire tous les dialogues de toutes les sections
    const allDialogues = exercise.sections.flatMap(section => section.dialogues);
    
    const evaluation = await evaluateExercise(userId, allDialogues);
    if (!evaluation) {
      throw new Error('Failed to evaluate exercise');
    }

    // Mettre à jour l'exercice avec l'évaluation
    const updatedExercise = {
      ...exercise,
      aiEvaluation: evaluation,
      totalScore: calculateFinalScore(exercise),
      evaluatedAt: new Date().toISOString(),
      status: ExerciseStatus.Evaluated
    };

    await setDoc(docRef, cleanUndefined(updatedExercise));
    return evaluation;
  },

  async evaluateWithAI(userId: string, organizationId: string): Promise<RdvDecideurExercise> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const exercise = await this.getExercise(userId);
      if (!exercise) {
        throw new Error('Exercise not found');
      }

      // Formater le dialogue pour l'IA
      const formattedContent = {
        type: 'rdv_decideur',
        exercise: {
          sections: exercise.sections.map(section => ({
            id: section.id,
            title: section.title,
            dialogues: section.dialogues.map(dialogue => ({
              role: dialogue.role,
              text: dialogue.text,
              description: dialogue.description
            }))
          }))
        }
      };

      console.log('Formatted content for AI:', formattedContent);

      // Évaluer avec l'IA
      const response = await evaluateExercise(
        organizationId,
        JSON.stringify(formattedContent),
        'rdv_decideur'
      );

      console.log('AI Response:', response);

      // Traiter la réponse de l'IA
      const aiEvaluation: AIEvaluationResult = typeof response === 'string' ? JSON.parse(response) : response;

      console.log('AI Sections:', aiEvaluation.sections.map(s => s.title));
      console.log('Exercise Sections:', exercise.sections.map(s => s.title));

      // Mettre à jour les sections avec les scores et commentaires
      const updatedSections = exercise.sections.map(section => {
        console.log('Looking for section:', section.title);
        
        const aiSection = aiEvaluation.sections.find(s => {
          console.log('Comparing with:', s.title);
          return s.title === section.title;
        });

        if (!aiSection) {
          console.warn(`Section "${section.title}" not found in AI evaluation`);
          console.log('Available sections:', aiEvaluation.sections.map(s => s.title));
          return section;
        }

        // Mettre à jour les dialogues de la section
        const updatedDialogues = section.dialogues.map((dialogue, index) => {
          const evaluation = aiSection.dialogues.find(d => 
            d.index === index && d.role === dialogue.role
          );
          
          if (evaluation) {
            return {
              ...dialogue,
              score: evaluation.score.toString(),
              trainerComment: evaluation.comment
            };
          }
          return dialogue;
        });

        return {
          ...section,
          dialogues: updatedDialogues,
          trainerGeneralComment: `Score de la section: ${aiSection.sectionScore}/10\n\nPoints forts :\n${aiEvaluation.generalFeedback.pointsForts}\n\nAxes d'amélioration :\n${aiEvaluation.generalFeedback.axesAmelioration}`
        };
      });

      // Calculer le score total (somme des scores de section)
      const totalScore = Object.values(aiEvaluation.sectionScores).reduce((sum, score) => sum + score, 0);

      // Mettre à jour l'exercice avec l'évaluation
      const updatedExercise = {
        ...exercise,
        sections: updatedSections,
        aiEvaluation: response,
        totalScore: aiEvaluation.finalScoreOutOf40 || totalScore, // Utiliser le score de l'IA
        maxScore: 40,
        evaluatedAt: new Date().toISOString(),
        status: ExerciseStatus.Evaluated,
        updatedAt: new Date().toISOString()
      };

      // Sauvegarder les modifications
      const docRef = doc(db, `users/${userId}/exercises`, EXERCISE_DOC_NAME);
      await setDoc(docRef, cleanUndefined(updatedExercise));

      return updatedExercise;
    } catch (error) {
      console.error('Error in evaluateWithAI:', error);
      throw error;
    }
  }
};
