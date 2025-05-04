import { Task } from '../types/eisenhower';

export const initialTasks: Task[] = [
  {
    id: 1,
    description: "Il est 9h du matin et votre manager vous demande de faire une offre commerciale pour aujourd'hui.",
    correctPriority: "2",
    explanation: "On fait les offres en dehors de heures en or (9h-17h) car c'est pendant ces heures que vos clients sont disponibles."
  },
  {
    id: 2,
    description: "Vous recevez un email: \"Pouvez-vous me rappeler? signé le client\".",
    correctPriority: "2",
    explanation: "On va plannifier l'appel dans la journée ou, si ce n'est pas possible, le lendemain. Le client comprendra que vous ne l'appeliez pas tout de suite."
  },
  {
    id: 3,
    description: "Je vous demande de faire un rapport sur votre activité commerciale du mois.",
    correctPriority: "2",
    explanation: "On va le plannifier quand on aura du temps, et de préférence en dehors des heures en or."
  },
  {
    id: 4,
    description: "Je vous demande d'envoyer d'urgence une lettre recommandée pour un client.",
    correctPriority: "3",
    explanation: "On va essayer de le déléguer à une tierce personne. Ce n'est - à priori - certainement pas dans les priorités d'un commercial d'envoyer des lettres."
  },
  {
    id: 5,
    description: "Un client vous envoit un email en vous demandant de le rappeler d'urgence.",
    correctPriority: "1",
    explanation: "Un client qui demande de l'appeler d'urgence est une priorié. On l'appellle immédiatement."
  },
  {
    id: 6,
    description: "Vous recevez un email: \"Pouvez-vous venir cet après-midi pour un problème technique? Sinon vous me perdez comme client\" (et vous avez un meeting important avec un nouveau client pour signer le contrat).",
    correctPriority: "3",
    explanation: "Je délègue, en demandant à l'un de mes collègues de la technique de prendre contact immédiatement avec le client. Ceci permettra aussi d'ailleurs à être efficace et rapide dans la résolution du problème."
  },
  {
    id: 7,
    description: "Vous recevez un email: \"Pouvez-vous venir cet après-midi pour un problème commercial? Sinon vous me perdez comme client\". Vous avez déjà fixé un rendez-vous important avec un nouveau client pour signer le contrat. Vous ne pouvez donc difficilement dire au client que vous ne viendrez pas chercher le contrat. Il a d'ailleurs déjà probablement préparé une bouteille de champagne pour célébrer la nouvelle collaboration.",
    correctPriority: "2 ou 3",
    explanation: "Je vais essayer de postposer le meeting à un autre jour et de plannifier à un autre moment, en contactant mon client mécontent. Le client pourra comprendre. Ma priorité numéro 1 est ici d'aller signer le nouveau client. Une autre possibilité est de déléguer en demandant à mon manager d'aller voir mon client qui demande à me voir d'urgence."
  },
  {
    id: 8,
    description: "Nous sommes lundi. Vous avez un rendez-vous très important chez un prospect où vous devez faire une présentation vendredi (fin de semaine) mais vous êtes débordé et vous ne voyez pas comment vous pourrez la faire. Vous n'aurez pas ou très peu de temps.",
    correctPriority: "3",
    explanation: "Je vais essayer de demander de l'aide, en déléguant la création de la présentation. Je vais par contre préparer la structure, une idée des slides pour faire un bon briefing pour la personne qui devra faire la présentation."
  },
  {
    id: 9,
    description: "Votre département marketing ne vous a toujours pas transmis le template de l'offre. Il y a de fortes chances qu'elle n'aura plus le temps de vous le remettre. Vous devez remettre une offre dans 2 jours.",
    correctPriority: "1",
    explanation: "Vous allez devoir faire l'offre avec les moyens du bord et ne plus attendre. Il est devenu urgent de faire l'offre, même si votre offre ne sera pas aussi belle que si vous aviez reçu un template."
  },
  {
    id: 10,
    description: "Vous êtes parfait bilingue (FR/ENG), vous devez traduire encore l'offre en Anglais pour votre client dans 1 semaine.",
    correctPriority: "3",
    explanation: "Vous allez déléguer cette tâche de traduction. Votre rôle est de vendre et non pas de traduire."
  },
  {
    id: 11,
    description: "Votre manager vous appelle et vous demandez de passer chez un client cette semaine pour lui apporter du matériel qu'il a commandé car le responsable de la logistique est en congé cette semaine et il ne sait pas organiser la livraison.",
    correctPriority: "2",
    explanation: "Vous le planifiez. Effectivement, ici, on ne déléguera pas. Après tout, c'est une très bonne raison pour faire une visite client et entretenir la relation client."
  },
  {
    id: 12,
    description: "Vous recevez une publicité dans votre email avec 100€ de réductions dans les supermarchés. Vous aimeriez en profiter.",
    correctPriority: "4",
    explanation: "Vous devez éliminer toute source de distraction et vous concentrer sur vos tâches commerciales."
  },
  {
    id: 13,
    description: "Il est 10h du matin. Un très bon ami vous appelle sur votre GSM.",
    correctPriority: "4",
    explanation: "Vous devez éliminer toute source de distraction et vous concentrer sur vos tâches commerciales."
  },
  {
    id: 14,
    description: "Nous sommes lundi. Vous vous rendez compte qu'il vous manque un pointeur pour votre présentation qui aura lieu dans 3 jours. Il faut absolument en acheter un.",
    correctPriority: "3",
    explanation: "Vous devez déléguer et demander à quelqu'un d'aller vous acheter un pointeur."
  },
  {
    id: 15,
    description: "Votre client vous appelle et vous laisse un message vocal en vous demandant de venir chercher les contrats quand vous voulez. Vous aviez prévu de faire de la prospection par téléphone cet après-midi.",
    correctPriority: "1 ou 2",
    explanation: "Je le contacte immédiatement et vais idéalement le chercher le plus rapidement possible: aujourd'hui idéalement fin de journée ou demain."
  }
];
