// Types pour l'exercice Goalkeeper

export interface DialogueLine {
  speaker: string;
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
  description?: string;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  description?: string;
  subCriteria: SubCriterion[];
}

export const GOALKEEPER_EVALUATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: "attitude",
    name: "Attitude générale",
    description: "",
    subCriteria: [
      { id: "tone", name: "Ton chaleureux et professionnel", maxPoints: 2, score: 0, feedback: "", description: "" },
      { id: "greeting", name: "Salutation initiale polie et adaptée", maxPoints: 1, score: 0, feedback: "", description: "" }
    ]
  },
  {
    id: "askDecider",
    name: "Demande à parler au décideur",
    description: "",
    subCriteria: [
      { id: "naming", name: "Mentionner le prénom, puis le prénom et nom du décideur", maxPoints: 3, score: 0, feedback: "", description: "" }
    ]
  },
  {
    id: "whoAreYou",
    name: "Réponse à \"Qui êtes-vous ?\"",
    description: "",
    subCriteria: [
      { id: "presentation", name: "Présentation concise avec prénom et nom uniquement", maxPoints: 2, score: 0, feedback: "", description: "" },
      { id: "noCompany", name: "Absence de mention de la société", maxPoints: 2, score: 0, feedback: "", description: "" },
      { id: "noSales", name: "Aucune tentative de vente ou allusion commerciale", maxPoints: 1, score: 0, feedback: "", description: "" }
    ]
  },
  {
    id: "knowDecider",
    name: "Réponse à \"Connaissez-vous le décideur ?\"",
    description: "",
    subCriteria: [
      { id: "honesty", name: "Réponse honnête et claire, respectant la formulation prévue", maxPoints: 2, score: 0, feedback: "", description: "" }
    ]
  },
  {
    id: "whyCalling",
    name: "Réponse à \"Pourquoi appelez-vous ?\"",
    description: "",
    subCriteria: [
      { id: "reason", name: "Donner une raison complexe et pertinente", maxPoints: 5, score: 0, feedback: "", description: "" },
      { id: "noForbidden", name: "Éviter les termes commerciaux interdits", maxPoints: 5, score: 0, feedback: "", description: "" }
    ]
  },
  {
    id: "unavailable",
    name: "Gestion des indisponibilités du décideur",
    description: "",
    subCriteria: [
      { id: "bestTime", name: "Si indisponible : demander le meilleur moment pour rappeler", maxPoints: 5, score: 0, feedback: "", description: "" },
      { id: "precise", name: "Demander un jour et une heure précise si le créneaux donné par le goalkeeper est vague", maxPoints: 2, score: 0, feedback: "", description: "" }
    ]
  },
  {
    id: "interaction",
    name: "Interaction avec le Goalkeeper",
    description: "",
    subCriteria: [
      { id: "askName", name: "Demande du prénom du \"goalkeeper\"", maxPoints: 2, score: 0, feedback: "", description: "" },
      { id: "useName", name: "Utilisation du prénom lors du rappel", maxPoints: 1, score: 0, feedback: "", description: "" }
    ]
  },
  {
    id: "behavior",
    name: "Comportement du Goalkeeper",
    description: "",
    subCriteria: [
      { id: "professionalism", name: "Le \"goalkeeper\" doit adopter une attitude professionnelle et cohérente", maxPoints: 3, score: 0, feedback: "", description: "" }
    ]
  }
];

export interface LocalEvaluation {
  criteria: EvaluationCriterion[];
  totalScore: number;
  evaluatedBy: string;
  evaluatedAt: string;
  threadId?: string;
  strengths?: string[];
  improvements?: string[];
  generalFeedback?: string;
}

export interface GoalkeeperExercise {
  id?: string;
  userId: string;
  status: 'draft' | 'submitted' | 'evaluated';
  firstCall: DialogueSection;
  secondCall: DialogueSection;
  evaluation?: LocalEvaluation;
  createdAt: string;
  updatedAt: string;
}
