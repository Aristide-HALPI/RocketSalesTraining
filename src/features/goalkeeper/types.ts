// Types pour l'exercice Goalkeeper

export interface DialogueLine {
  id: string;
  speaker: 'goalkeeper' | 'commercial';
  text: string;
  feedback?: string;
}

export interface DialogueSection {
  lines: DialogueLine[];
}

export interface SubCriterion {
  id: string;
  name: string;
  maxPoints: number;
  score: number;
  feedback: string;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  maxPoints: number;
  subCriteria: SubCriterion[];
}

export const GOALKEEPER_EVALUATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: "attitude",
    name: "Attitude générale",
    maxPoints: 3,
    subCriteria: [
      { id: "tone", name: "Ton chaleureux et professionnel", maxPoints: 2, score: 0, feedback: "" },
      { id: "greeting", name: "Salutation initiale polie et adaptée", maxPoints: 1, score: 0, feedback: "" }
    ]
  },
  {
    id: "askDecider",
    name: "Demande à parler au décideur",
    maxPoints: 2,
    subCriteria: [
      { id: "naming", name: "Mentionner le prénom, puis le prénom et nom du décideur", maxPoints: 2, score: 0, feedback: "" }
    ]
  },
  {
    id: "whoAreYou",
    name: "Réponse à \"Qui êtes-vous ?\"",
    maxPoints: 4,
    subCriteria: [
      { id: "presentation", name: "Présentation concise avec prénom et nom uniquement", maxPoints: 2, score: 0, feedback: "" },
      { id: "noCompany", name: "Absence de mention de la société", maxPoints: 1, score: 0, feedback: "" },
      { id: "noSales", name: "Aucune tentative de vente ou allusion commerciale", maxPoints: 1, score: 0, feedback: "" }
    ]
  },
  {
    id: "knowDecider",
    name: "Réponse à \"Connaissez-vous le décideur ?\"",
    maxPoints: 2,
    subCriteria: [
      { id: "honesty", name: "Réponse honnête et claire, respectant la formulation prévue", maxPoints: 2, score: 0, feedback: "" }
    ]
  },
  {
    id: "whyCalling",
    name: "Réponse à \"Pourquoi appelez-vous ?\"",
    maxPoints: 4,
    subCriteria: [
      { id: "reason", name: "Donner une raison complexe et pertinente", maxPoints: 2, score: 0, feedback: "" },
      { id: "noForbidden", name: "Éviter les termes commerciaux interdits", maxPoints: 2, score: 0, feedback: "" }
    ]
  },
  {
    id: "unavailable",
    name: "Gestion des indisponibilités du décideur",
    maxPoints: 4,
    subCriteria: [
      { id: "bestTime", name: "Si indisponible : demander le meilleur moment pour rappeler", maxPoints: 2, score: 0, feedback: "" },
      { id: "precise", name: "Demander un jour et une heure précise si le créneaux donné par le goalkeeper est vague", maxPoints: 2, score: 0, feedback: "" }
    ]
  },
  {
    id: "interaction",
    name: "Interaction avec le Goalkeeper",
    maxPoints: 3,
    subCriteria: [
      { id: "askName", name: "Demande du prénom du \"goalkeeper\"", maxPoints: 2, score: 0, feedback: "" },
      { id: "useName", name: "Utilisation du prénom lors du rappel", maxPoints: 1, score: 0, feedback: "" }
    ]
  },
  {
    id: "behavior",
    name: "Comportement du Goalkeeper",
    maxPoints: 2,
    subCriteria: [
      { id: "professionalism", name: "Le \"goalkeeper\" doit adopter une attitude professionnelle et cohérente", maxPoints: 2, score: 0, feedback: "" }
    ]
  }
];

export interface GoalkeeperExercise {
  id: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated';
  firstCall: DialogueSection;
  secondCall: DialogueSection;
  evaluation?: {
    criteria: EvaluationCriterion[];
    totalScore: number;
    evaluatedBy?: string;
    evaluatedAt?: string;
  };
  totalScore?: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
}
