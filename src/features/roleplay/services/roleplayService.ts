import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface ScoreItem {
  name: string;
  maxPoints: number;
  score: number;
}

export interface ScoreSection {
  title: string;
  maxScore: number;
  items: ScoreItem[];
  totalScore: number;
}

export interface RoleplayExercise {
  id: string;
  createdAt: string;
  updatedAt: string;
  sections: ScoreSection[];
  totalScore: number;
  status: 'not_started' | 'in_progress' | 'evaluated';
  evaluatedBy?: string;
}

class RoleplayService {
  private getExerciseRef(userId: string) {
    const ref = doc(db, 'users', userId, 'exercises', 'points_role_final');
    console.log('Référence Firestore:', ref.path);
    return ref;
  }

  private getInitialExercise(): RoleplayExercise {
    return {
      id: 'points_role_final',
      sections: [
        {
          title: "PROSPECTION",
          maxScore: 190,
          totalScore: 0,
          items: [
            { name: "Passer le Goalkeeper", maxPoints: 50, score: 0 },
            { name: "Vous ne vous présentez pas d'emblée", maxPoints: 10, score: 0 },
            { name: "Prénom [...] Prénom + Nom du Décideur", maxPoints: 10, score: 0 },
            { name: "Phrase complexe", maxPoints: 10, score: 0 },
            { name: "Quand est-ce que c'est le meilleur moment? ou Message Magique sur le répondeur automatique", maxPoints: 10, score: 0 },
            { name: "Prénom ou Nom du Goalkeeper", maxPoints: 10, score: 0 }
          ]
        },
        {
          title: "Prise de Rendez-vous avec le Décideur",
          maxScore: 30,
          totalScore: 0,
          items: [
            { name: "Vérification de son nom et son titre", maxPoints: 10, score: 0 },
            { name: "Présentez-vous et votre société (spécialité)", maxPoints: 10, score: 0 },
            { name: "Montrez du respect pour le temps du décideur", maxPoints: 10, score: 0 }
          ]
        },
        {
          title: "Accroche Irrésistible",
          maxScore: 70,
          totalScore: 0,
          items: [
            { name: "Question irrésistible", maxPoints: 20, score: 0 },
            { name: "Présentation irrésistible", maxPoints: 30, score: 0 },
            { name: "Référence client avec des chiffres à l'appui", maxPoints: 20, score: 0 }
          ]
        },
        {
          title: "Actions intermédiaires",
          maxScore: 0,
          totalScore: 0,
          items: [
            { name: "Demandez un rendez-vous (en incluant la technique de l'alternative)", maxPoints: 0, score: 0 },
            { name: "Demandez son adresse email + son numéro de mobile", maxPoints: 0, score: 0 },
            { name: "Réagissez aux OBJECTIONS de contact, en utilisant la technique s'iieX", maxPoints: 0, score: 0 }
          ]
        },
        {
          title: "QUALIFICATION",
          maxScore: 340,
          totalScore: 0,
          items: [
            { name: "Structure du meeting", maxPoints: 50, score: 0 },
            { name: "Salutations + Ice Breaker", maxPoints: 10, score: 0 },
            { name: "Présentez-vous et proposez aux autres de se présenter", maxPoints: 10, score: 0 },
            { name: "Vérifiez le temps", maxPoints: 10, score: 0 },
            { name: "Objectif du meeting", maxPoints: 10, score: 0 },
            { name: "Pitch de votre société (avec un effet 'wow')", maxPoints: 10, score: 0 },
            { name: "Qualification (EOMBUS-PAF-I)", maxPoints: 290, score: 0 },
            { name: "Montrez de l'intérêt pour l'entreprise du client et tissez une vraie relation", maxPoints: 40, score: 0 },
            { name: "Comprenez bien la structure de l'entreprise et le circuit de décision exact", maxPoints: 30, score: 0 },
            { name: "Quels sont les moyens pour faire ce que votre solution fait", maxPoints: 20, score: 0 },
            { name: "Demandez le budget pour les différents moyens", maxPoints: 20, score: 0 },
            { name: "Demandez l'usage pour chaque moyen", maxPoints: 20, score: 0 },
            { name: "Découvrez au minimum 3 besoins (Problèmes avec Impacts et Solution) [EXP, EVO, PROJ]", maxPoints: 60, score: 0 },
            { name: "vérifiez quand le client voudrait installer/utiliser la solution que vous proposez et le temps au niveau de la prise de décision", maxPoints: 10, score: 0 },
            { name: "vérifiez si votre solution rentre dans le budget du client et s'il a prévu suffisamment de budget", maxPoints: 10, score: 0 },
            { name: "Posez des questions 'PAF' (passé, actuel, futur)", maxPoints: 20, score: 0 },
            { name: "Empathie", maxPoints: 40, score: 0 },
            { name: "Ecoute active", maxPoints: 20, score: 0 }
          ]
        },
        {
          title: "PRÉSENTATION DES SOLUTIONS",
          maxScore: 60,
          totalScore: 0,
          items: [
            { name: "Présentez votre solution en présentant quelques caractéristiques dont le client aura besoin et présentez 3 Bénéfices clients", maxPoints: 60, score: 0 }
          ]
        },
        {
          title: "CONCLUSION et (NÉGOCIATION)",
          maxScore: 90,
          totalScore: 0,
          items: [
            { name: "1. En faisant un résumé de tous les problèmes mesurés (avec les impacts) 2. En rappelant la valeur de votre solution (les bénéfices)", maxPoints: 20, score: 0 },
            { name: "Répondez aux objections (malentendu, doute, hésitation, objection irréfutable)", maxPoints: 40, score: 0 },
            { name: "Concluez la vente en faisant signer le contrat ou en demandant au client d'envoyer son bon de commande", maxPoints: 30, score: 0 }
          ]
        }
      ],
      totalScore: 0,
      status: 'not_started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evaluatedBy: undefined
    };
  }

  async getExercise(userId: string): Promise<RoleplayExercise | null> {
    console.log('Getting exercise for user:', userId);
    try {
      const exerciseRef = this.getExerciseRef(userId);
      const exerciseDoc = await getDoc(exerciseRef);

      if (!exerciseDoc.exists()) {
        console.log('Exercise does not exist, creating initial exercise...');
        const initialExercise = this.getInitialExercise();
        await setDoc(exerciseRef, initialExercise);
        return initialExercise;
      }

      console.log('Exercise found:', exerciseDoc.data());
      return exerciseDoc.data() as RoleplayExercise;
    } catch (error) {
      console.error('Error getting exercise:', error);
      return null;
    }
  }

  subscribeToExercise(userId: string, callback: (exercise: RoleplayExercise) => void) {
    const exerciseRef = this.getExerciseRef(userId);
    return onSnapshot(exerciseRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as RoleplayExercise);
      }
    });
  }

  async updateExercise(userId: string, exerciseData: Partial<RoleplayExercise>) {
    try {
      const exerciseRef = this.getExerciseRef(userId);
      
      // Si on met à jour les sections, recalculer le score total
      if (exerciseData.sections) {
        let totalScore = 0;
        exerciseData.sections.forEach(section => {
          section.totalScore = section.items.reduce((sum, item) => sum + (item.score || 0), 0);
          totalScore += section.totalScore;
        });
        exerciseData.totalScore = totalScore;
      }

      await updateDoc(exerciseRef, {
        ...exerciseData,
        updatedAt: new Date().toISOString()
      });

      // Mettre à jour les scores de certification après chaque mise à jour
      const { certificationService } = await import('../../../features/certification/services/certificationService');
      await certificationService.calculateAndUpdateScores(userId);
    } catch (error) {
      console.error('Error updating exercise:', error);
      throw error;
    }
  }
}

export const roleplayService = new RoleplayService();
