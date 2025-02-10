export const presentationPrompt = `Instructions pour l'IA
Vous devez évaluer une présentation d'entreprise et générer une réponse JSON structurée selon le format suivant :

{
  "score": number, // Note finale sur 20
  "feedback": string, // Feedback général
  "strengths": string[], // Liste des points forts
  "improvements": string[], // Liste des points à améliorer
  "criteria": [ // Liste des critères évalués
    {
      "id": string, // Identifiant unique du critère (ex: "company_presentation")
      "name": string, // Nom du critère
      "description": string, // Description du critère
      "maxPoints": number, // Points maximum (2)
      "score": number, // Points obtenus (0-2)
      "feedback": string, // Feedback spécifique au critère
      "consigne": string // Consigne pour ce critère
    }
  ]
}

1️⃣ Critères d'évaluation
Évaluez chacun des critères suivants sur 2 points :

1. Présentation de l'entreprise
- id: "company_presentation"
- consigne: "L'entreprise doit être présentée clairement avec son nom et son secteur d'activité"
- 0pt: Absence ou hors sujet
- 1pt: Nom et secteur mentionnés mais vague
- 2pt: Présentation claire et structurée

2. Histoire et fondateurs
- id: "company_history"
- consigne: "L'histoire des fondateurs et le contexte de lancement doivent être expliqués"
- 0pt: Pas d'historique
- 1pt: Contexte superficiel
- 2pt: Histoire détaillée avec motivations

3. Mission et valeurs
- id: "mission_values"
- consigne: "La mission et les valeurs de l'entreprise doivent être clairement définies"
- 0pt: Non mentionné
- 1pt: Mentionné sans détails
- 2pt: Bien défini et expliqué

4. Produits/Services
- id: "products_services"
- consigne: "Les produits/services doivent être présentés avec leurs avantages"
- 0pt: Non décrits
- 1pt: Liste simple
- 2pt: Description détaillée avec bénéfices

5. Marché cible
- id: "target_market"
- consigne: "Le marché cible et les segments de clientèle doivent être identifiés"
- 0pt: Non identifié
- 1pt: Vaguement défini
- 2pt: Segments clairement identifiés

6. Avantages concurrentiels
- id: "competitive_advantages"
- consigne: "Les avantages concurrentiels doivent être présentés"
- 0pt: Non mentionnés
- 1pt: Listés sans justification
- 2pt: Bien expliqués avec preuves

7. Chiffres clés
- id: "key_figures"
- consigne: "Les chiffres clés (CA, croissance, etc.) doivent être présentés"
- 0pt: Aucun chiffre
- 1pt: Quelques chiffres sans contexte
- 2pt: Chiffres pertinents et contextualisés

8. Équipe
- id: "team"
- consigne: "L'équipe et son expertise doivent être présentées"
- 0pt: Non mentionnée
- 1pt: Liste des membres
- 2pt: Expertise et rôles détaillés

9. Partenariats
- id: "partnerships"
- consigne: "Les partenariats stratégiques doivent être mentionnés"
- 0pt: Non mentionnés
- 1pt: Liste simple
- 2pt: Description de la valeur ajoutée

10. Perspectives
- id: "perspectives"
- consigne: "Les perspectives de développement doivent être présentées"
- 0pt: Non mentionnées
- 1pt: Vaguement définies
- 2pt: Vision claire et objectifs

2️⃣ Calcul du score
- Base: 8 éléments minimum attendus (16 points max)
- Si > 8 éléments : augmentation proportionnelle du maximum
- Si < 8 éléments : maximum reste à 16 points
- Note finale = (Points obtenus / Maximum possible) × 20

3️⃣ Structure du feedback
Le feedback général doit inclure :
1. Un résumé de la performance globale
2. Le nombre d'éléments traités sur 12
3. La qualité globale de la présentation

4️⃣ Points forts et améliorations
- strengths: Liste des 2-3 meilleurs aspects
- improvements: Liste de 2-3 suggestions concrètes d'amélioration

Voici le contenu à évaluer :
`;

export const presentationEvaluationExample = {
  "score": 17.5,
  "feedback": "Votre présentation couvre 8 éléments sur 12 avec une bonne qualité globale. La structure est claire et professionnelle.",
  "strengths": [
    "Présentation claire et structurée de l'entreprise",
    "Excellente explication des valeurs et de la mission"
  ],
  "improvements": [
    "Ajouter des données chiffrées sur le chiffre d'affaires",
    "Développer la partie sur les partenariats stratégiques"
  ],
  "criteria": [
    {
      "id": "company_presentation",
      "name": "Présentation de l'entreprise",
      "description": "Clarté et structure de la présentation de l'entreprise",
      "maxPoints": 2,
      "score": 2,
      "feedback": "Excellente présentation du nom et du secteur d'activité",
      "consigne": "L'entreprise doit être présentée clairement avec son nom et son secteur d'activité"
    }
  ]
};
