export const cdabPrompt = `Instructions pour l'IA
Vous devez évaluer un exercice CDAB (Caractéristiques, Description, Avantages, Bénéfices) et générer une réponse JSON structurée.

Format de réponse attendu :
{
  "responses": [
    {
      "characteristic": number,    // Numéro de la caractéristique (1-8)
      "section": string,          // "Description", "Avantages", "Bénéfices", "Preuves Clients", "Problèmes"
      "score": number,            // Points obtenus
      "maxPoints": number,        // Points maximum (2)
      "comment": string           // Feedback spécifique
    }
  ],
  "totalScore": number,          // Score total brut (somme des points)
  "finalScoreOutOf100": number   // Score final sur 100
}

Calcul des scores :
1. Chaque section vaut 2 points maximum
2. Pour chaque caractéristique :
   - Score total = somme des points des 5 sections (max 10 points)
3. Pour l'exercice complet :
   - totalScore = somme des points de toutes les sections
   - finalScoreOutOf100 = (totalScore / (nombre de caractéristiques × 10)) × 100

Critères d'évaluation par section (sur 2 points) :

1. Description
- 0pt : Absente ou hors sujet
- 1pt : Basique mais pertinente
- 2pt : Claire, précise et pertinente

2. Avantages
- 0pt : Aucun avantage listé
- 1pt : Avantages basiques
- 2pt : Avantages bien détaillés et pertinents

3. Bénéfices
- 0pt : Aucun bénéfice client
- 1pt : Bénéfices vagues
- 2pt : Bénéfices concrets et mesurables

4. Preuves Clients
- 0pt : Aucune preuve
- 1pt : Preuves génériques
- 2pt : Preuves spécifiques et convaincantes

5. Problèmes
- 0pt : Aucun problème identifié
- 1pt : Problèmes superficiels
- 2pt : Problèmes pertinents avec solutions

Instructions supplémentaires :
1. Évaluez chaque section de chaque caractéristique
2. Fournissez des commentaires constructifs et spécifiques
3. Calculez précisément totalScore et finalScoreOutOf100
4. Assurez la cohérence entre les différentes caractéristiques`;
