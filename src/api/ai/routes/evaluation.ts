import { DialogueEntry } from '../../../features/rdv-decideur/services/rdvDecideurService';
import { GOALKEEPER_EVALUATION_CRITERIA } from '../../../features/goalkeeper/types';
import { createThread, createThreadMessage } from './thread';
import { presentationPrompt } from '../prompts/presentation';
import { cdabPrompt } from '../prompts/cdab';

export interface AIEvaluationDialogue {
  index: number;
  score: string;
  comment: string;
}

export interface AIEvaluationResponse {
  evaluation?: {
    responses: {
      characteristic: number;
      section: string;
      score: number;
      maxPoints: number;
      comment: string;
    }[];
    score?: number;
  };
  dialogues?: AIEvaluationDialogue[];
  score?: number;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  criteria?: {
    id: string;
    name: string;
    description: string;
    maxPoints: number;
    score: number;
    feedback: string;
    consigne: string;
  }[];
  sections?: {
    id: string;
    title: string;
    type: string;
    description: string;
    answers: {
      text: string;
      score: number;
      feedback: string;
    }[];
  }[];
  responses?: {
    characteristic: number;
    section: string;
    score: number;
    maxPoints: number;
    comment: string;
    objection?: number;
    stage?: string;
  }[];
  totalScore?: number;
  finalScore?: number;
  scoreOutOf30?: boolean;
  finalScoreOutOf100?: number;
  completion?: {
    content: string;
    role?: string;
  };
}

export type ExerciseType = 'rdv_decideur' | 'company' | 'sections' | 'goalkeeper' | 'presentation' | 'cdab' | 'eombus' | 'siiep' | 'iiep' | 'qles';

const EXERCISE_PROMPTS: Record<string, string> = {
  rdv_decideur: 'Please evaluate this RDV décideur exercise dialogue and provide feedback:',
  sections: 'Please evaluate this sections exercise and provide feedback:',
  presentation: presentationPrompt,
  cdab: cdabPrompt,
  goalkeeper: 'Please evaluate this goalkeeper exercise dialogue and provide feedback:',
  eombus: 'Please evaluate this EOMBUS-PAF-I exercise and provide feedback:',
  siiep: 'Please evaluate this SIIEP exercise and provide feedback:',
  iiep: 'Please evaluate this IIEP exercise dialogue and provide feedback:',
  qles: 'Veuillez évaluer cet exercice Les 3 clés et fournir un retour détaillé au format JSON demandé:'
};

const extractJsonFromMarkdown = (content: string, type?: string): string => {
  // Extraire le JSON entre les balises ```json si présentes
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  let jsonContent = jsonMatch ? jsonMatch[1] : content;
  
  // Nettoyer le contenu avant le parsing
  jsonContent = jsonContent.trim();
  
  // Pour le type 'qles', gérer plusieurs objets JSON
  if (type === 'qles') {
    console.log('Type QLES détecté, recherche de multiples objets JSON...');
    
    // Rechercher tous les objets JSON dans le contenu
    const jsonObjects: any[] = [];
    
    // Utiliser une approche plus robuste pour extraire les objets JSON
    let currentPos = 0;
    let maxAttempts = 10; // Limiter le nombre de tentatives pour éviter les boucles infinies
    
    while (currentPos < jsonContent.length && maxAttempts > 0) {
      maxAttempts--;
      
      // Chercher le prochain '{'
      const startPos = jsonContent.indexOf('{', currentPos);
      if (startPos === -1) break;
      
      // Compter les accolades pour trouver la fin de l'objet
      let braceCount = 0;
      let endPos = startPos;
      let inString = false;
      let escapeNext = false;
      
      for (let i = startPos; i < jsonContent.length; i++) {
        const char = jsonContent[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') braceCount++;
          else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              endPos = i;
              break;
            }
          }
        }
      }
      
      // Si on n'a pas trouvé la fin, essayer de réparer le JSON
      if (braceCount > 0 && endPos === startPos) {
        console.log('JSON incomplet détecté, tentative de réparation...');
        // Ajouter les accolades manquantes
        let repairedJson = jsonContent.substring(startPos);
        while (braceCount > 0) {
          repairedJson += '}';
          braceCount--;
        }
        
        try {
          const parsed = JSON.parse(repairedJson);
          jsonObjects.push(parsed);
          console.log('JSON réparé avec succès');
          break; // Sortir de la boucle car on a réparé le JSON
        } catch (e) {
          console.log('Impossible de réparer le JSON');
        }
      } else if (braceCount === 0 && endPos > startPos) {
        const potentialJson = jsonContent.substring(startPos, endPos + 1);
        try {
          const parsed = JSON.parse(potentialJson);
          jsonObjects.push(parsed);
          console.log(`Objet JSON ${jsonObjects.length} extrait avec succès`);
        } catch (e) {
          console.log('Objet JSON invalide, passage au suivant...');
        }
      }
      
      currentPos = endPos + 1;
    }
    
    // Si on a trouvé des objets JSON valides
    if (jsonObjects.length > 0) {
      console.log(`${jsonObjects.length} objets JSON valides trouvés`);
      
      // Chercher l'objet qui contient 'evaluation' ou 'responses'
      const evaluationObj = jsonObjects.find(obj => 
        obj.evaluation || obj.responses || (obj.evaluation && obj.evaluation.responses)
      );
      
      if (evaluationObj) {
        console.log('Objet d\'évaluation trouvé');
        return JSON.stringify(evaluationObj);
      }
      
      // Si pas d'objet evaluation, retourner le premier objet
      console.log('Pas d\'objet evaluation spécifique, retour du premier objet');
      return JSON.stringify(jsonObjects[0]);
    } else if (jsonObjects.length === 1) {
      return JSON.stringify(jsonObjects[0]);
    }
  }
  
  // Vérifier si la réponse contient plusieurs objets JSON concaténés
  // (ce qui peut arriver avec certaines réponses de l'IA)
  console.log('Vérification de la présence de plusieurs objets JSON...');
  
  // Essayer d'extraire le premier objet JSON valide
  const jsonRegex = /{[\s\S]*?}(?=\s*{|$)/g;
  const jsonMatches = jsonContent.match(jsonRegex);
  
  if (jsonMatches && jsonMatches.length > 0) {
    console.log(`Détecté ${jsonMatches.length} objets JSON potentiels dans la réponse`);
    
    // Essayer chaque match jusqu'à trouver un JSON valide
    for (const match of jsonMatches) {
      try {
        JSON.parse(match);
        console.log('Premier objet JSON valide extrait avec succès');
        return match;
      } catch (e) {
        // Continuer avec le prochain match
        console.log('Objet JSON invalide, essai suivant...');
      }
    }
  }
  
  // Si aucun objet JSON valide n'a été trouvé, essayer le parsing normal
  try {
    JSON.parse(jsonContent);
    return jsonContent;
  } catch (e) {
    console.log('JSON tronqué, tentative de réparation...');
    
    // Compter les accolades/crochets ouvrants et fermants
    const openBraces = (jsonContent.match(/{/g) || []).length;
    const closeBraces = (jsonContent.match(/}/g) || []).length;
    const openBrackets = (jsonContent.match(/\[/g) || []).length;
    const closeBrackets = (jsonContent.match(/]/g) || []).length;
    
    // Vérifier si le JSON est tronqué au milieu d'une propriété
    const lastChar = jsonContent.trim().slice(-1);
    if (lastChar === '"' || lastChar === ':' || lastChar === ',') {
      // Supprimer la dernière ligne incomplète
      jsonContent = jsonContent.replace(/,[^\]}]*$/, '');
    }
    
    // Ajouter les accolades/crochets manquants
    while (closeBrackets < openBrackets) {
      jsonContent += ']';
    }
    while (closeBraces < openBraces) {
      jsonContent += '}';
    }
    
    // Vérifier si le JSON est maintenant valide
    try {
      JSON.parse(jsonContent);
      console.log('JSON réparé avec succès');
      return jsonContent;
    } catch (e) {
      console.error('Impossible de réparer le JSON:', e);
      throw new Error('Format JSON invalide après tentative de réparation');
    }
  }
};

export async function evaluateExercise(organizationId: string, content: string | DialogueEntry[], type: ExerciseType = 'rdv_decideur'): Promise<AIEvaluationResponse> {
  try {
    const token = import.meta.env.VITE_FABRILE_TOKEN;
    let botId;

    // Sélectionner le bot en fonction du type d'exercice
    switch (type) {
      case 'goalkeeper':
        botId = import.meta.env.VITE_GOALKEEPER_BOT_ID;
        break;
      case 'rdv_decideur':
        botId = import.meta.env.VITE_DECIDEUR_BOT_ID;
        break;
      case 'company':
        botId = import.meta.env.VITE_PRESENTATION_BOT_ID;
        break;
      case 'sections':
        botId = import.meta.env.VITE_SECTIONS_BOT_ID;
        break;
      case 'presentation':
        botId = import.meta.env.VITE_PRESENTATION_BOT_ID;
        break;
      case 'cdab':
        botId = import.meta.env.VITE_CDAB_BOT_ID;
        break;
      case 'eombus':
        botId = import.meta.env.VITE_EOMBUS_BOT_ID;
        break;
      case 'siiep':
      case 'iiep':
        botId = import.meta.env.VITE_SIIEP_BOT_ID;
        break;
      case 'qles':
        botId = import.meta.env.VITE_QLES_BOT_ID;
        break;
      default:
        throw new Error(`Unknown exercise type: ${type}`);
    }

    if (!token || !botId) {
      throw new Error('Missing required environment variables: ' + 
        (!token ? 'VITE_FABRILE_TOKEN ' : '') +
        (!botId ? `VITE_${type.toUpperCase()}_BOT_ID` : '')
      );
    }

    // Créer un nouveau thread
    const thread = await createThread(organizationId, botId);
    if (!thread || !thread.id) {
      throw new Error('Failed to create thread');
    }

    let prompt = '';
    if (type === 'goalkeeper') {
      // Créer un prompt spécifique pour l'exercice goalkeeper
      prompt = `Please evaluate this goalkeeper exercise dialogue and provide feedback:
${content}

For each line of dialogue, provide specific feedback in this format:
[line_number] Feedback for this specific line

Then, evaluate based on the following criteria:
${GOALKEEPER_EVALUATION_CRITERIA.map(criterion =>
  criterion.subCriteria
    .map(subCriteria => `${subCriteria.name}: ${subCriteria.maxPoints} points`)
    .join('\n')
).join('\n')}

For each criteria evaluated, provide a score and detailed feedback in this format:
criteria_name | score | max_points | feedback`;
    } else {
      // Utiliser le contenu tel quel pour les autres types d'exercices
      prompt = EXERCISE_PROMPTS[type] + '\n' + (typeof content === 'string' ? content : JSON.stringify(content));
    }

    // Envoyer le message au thread
    const result = await createThreadMessage(organizationId, thread.id, prompt);

    if (!result || !result.completion || !result.completion.content) {
      throw new Error('No valid response received from AI');
    }

    // Parse the JSON response from the content
    try {
      // Log the raw content for debugging
      console.log('Raw AI content:', result.completion.content);
      
      // Try to find JSON in the response
      const jsonMatch = result.completion.content.match(/```json\n([\s\S]*?)\n```/) || 
                       result.completion.content.match(/{[\s\S]*}/) ||
                       [null, result.completion.content];
                       
      let jsonContent = jsonMatch[1] || result.completion.content;
      
      // Si la réponse ne contient pas de JSON, on crée une réponse d'erreur formatée
      if (!jsonContent.includes('{')) {
        console.warn('Response does not contain JSON, creating error response');
        return {
          score: 0,
          feedback: "L'évaluation n'a pas pu être complétée. Veuillez vous assurer que la présentation contient suffisamment d'informations sur l'entreprise.",
          strengths: [],
          improvements: [
            "Inclure plus de détails sur l'entreprise",
            "Structurer la présentation selon les critères demandés"
          ],
          criteria: [{
            id: "company_presentation",
            name: "Présentation de l'entreprise",
            description: "Clarté et structure de la présentation",
            maxPoints: 2,
            score: 0,
            feedback: "Informations insuffisantes pour évaluer",
            consigne: "L'entreprise doit être présentée clairement avec son nom et son secteur d'activité"
          }]
        };
      }
      
      // Remove any texte avant ou après le JSON si présent
      jsonContent = jsonContent.replace(/^[\s\S]*?({[\s\S]*})[\s\S]*$/, '$1');
      
      // Réparer le JSON tronqué si nécessaire
      jsonContent = extractJsonFromMarkdown(jsonContent, type);
      
      console.log('Extracted JSON content:', jsonContent);
      
      const jsonResponse = JSON.parse(jsonContent);

      if (type === 'rdv_decideur') {
        // Validate RDV décideur response format
        if (!jsonResponse.sections || !Array.isArray(jsonResponse.sections)) {
          throw new Error('Invalid response format: sections array missing');
        }

        // Validate each section
        jsonResponse.sections.forEach((section: any) => {
          if (!section.dialogues || !Array.isArray(section.dialogues)) {
            throw new Error(`Invalid section format: dialogues array missing in section ${section.title}`);
          }

          // Validate section score
          if (typeof section.sectionScore !== 'number' || section.sectionScore < 0 || section.sectionScore > 10) {
            throw new Error(`Invalid section score: ${section.sectionScore} in section ${section.title}. Must be between 0 and 10.`);
          }

          // Validate each dialogue evaluation
          section.dialogues.forEach((d: any) => {
            if (typeof d.score !== 'string' && typeof d.score !== 'number' || typeof d.comment !== 'string' || typeof d.role !== 'string') {
              throw new Error(`Invalid dialogue format in section ${section.title}`);
            }
            
            if (d.role === 'commercial' && !['0', '1', '2', 0, 1, 2].includes(d.score)) {
              throw new Error(`Invalid commercial score: ${d.score} in section ${section.title}`);
            }
            if (d.role === 'client' && !['0', '0.25', 0, 0.25].includes(d.score)) {
              throw new Error(`Invalid client score: ${d.score} in section ${section.title}`);
            }
          });
        });

        // Validate section scores total
        const totalScore = Object.values(jsonResponse.sectionScores).reduce((sum: number, score: any) => sum + score, 0);
        if (totalScore !== jsonResponse.totalScore || totalScore !== jsonResponse.finalScoreOutOf40) {
          throw new Error(`Invalid total score: section scores sum to ${totalScore} but totalScore is ${jsonResponse.totalScore} and finalScoreOutOf40 is ${jsonResponse.finalScoreOutOf40}`);
        }
      } else if (type === 'sections') {
        // Validate sections response format
        if (!jsonResponse.sections || !Array.isArray(jsonResponse.sections)) {
          console.error('Invalid sections response structure:', jsonResponse);
          throw new Error('Invalid sections response format: sections array missing');
        }

        // Validate each section
        jsonResponse.sections.forEach((section: any) => {
          if (!section.id || !section.title || !section.type || !section.description || !Array.isArray(section.answers)) {
            throw new Error(`Invalid section format: ${JSON.stringify(section)}`);
          }

          // Validate each answer in the section
          section.answers.forEach((answer: any) => {
            if (typeof answer.text !== 'string' || 
                typeof answer.score !== 'number' || 
                typeof answer.feedback !== 'string' ||
                answer.score < 0 || 
                answer.score > 4) {
              throw new Error(`Invalid answer format: ${JSON.stringify(answer)}`);
            }
          });

          // Validate number of answers per section
          const maxAnswers = {
            'motivateurs': 5,
            'caracteristiques': 5,
            'concepts': 3
          };
          
          // Accepter un nombre flexible de réponses pour toutes les sections
          // Minimum 1 réponse, maximum défini dans maxAnswers
          if (section.answers.length < 1) {
            throw new Error(`Pas assez de réponses pour la section ${section.id}. Minimum: 1, Reçu: ${section.answers.length}`);
          } else if (section.answers.length > maxAnswers[section.id as keyof typeof maxAnswers]) {
            throw new Error(`Trop de réponses pour la section ${section.id}. Maximum: ${maxAnswers[section.id as keyof typeof maxAnswers]}, Reçu: ${section.answers.length}`);
          }
        });
      } else if (type === 'cdab' || type === 'eombus') {
        // Validate CDAB/EOMBUS response format
        if (!jsonResponse.responses || !Array.isArray(jsonResponse.responses)) {
          console.error('Invalid response structure:', jsonResponse);
          throw new Error('Invalid response format: responses array missing');
        }

        // Validate each response
        jsonResponse.responses.forEach((r: any) => {
          if (typeof r.characteristic !== 'number' || 
              typeof r.section !== 'string' || 
              typeof r.score !== 'number' || 
              typeof r.maxPoints !== 'number' || 
              typeof r.comment !== 'string') {
            throw new Error(`Invalid response format at index ${r.characteristic}: missing required fields`);
          }
        });
      } else if (type === 'qles') {
        // Validate QLES response format - structure différente avec jsonResponse.evaluation.responses
        if (!jsonResponse.evaluation || !jsonResponse.evaluation.responses || !Array.isArray(jsonResponse.evaluation.responses)) {
          console.error('Invalid QLES response structure:', jsonResponse);
          throw new Error('Invalid QLES format: evaluation.responses array missing');
        }

        // Validate each response
        jsonResponse.evaluation.responses.forEach((r: any) => {
          if (typeof r.characteristic !== 'number' || 
              typeof r.section !== 'string' || 
              typeof r.score !== 'number' || 
              typeof r.maxPoints !== 'number' || 
              typeof r.comment !== 'string') {
            throw new Error(`Invalid QLES response format at index ${r.characteristic}: missing required fields`);
          }
        });
        
        console.log('Traitement de la réponse pour qles:', jsonResponse);
        
        // Format attendu selon le prompt de l'IA
        // L'IA renvoie toujours un objet avec evaluation et commentaireGeneral
        const totalScore = jsonResponse.evaluation?.score || 0;
        const feedback = jsonResponse.commentaireGeneral || 'Évaluation complétée';
        
        // Vérifier si les réponses existent
        const rawResponses = jsonResponse.evaluation?.responses || [];
        
        console.log('Traitement des réponses pour qles, section spécifique:', rawResponses);
        
        // Traiter les réponses selon le format attendu
        const responses = Array.isArray(rawResponses) ? 
          rawResponses.map((r: any) => {
            // Déterminer le type de section pour définir maxPoints
            let maxPoints = 4; // Par défaut pour explicite et évocatrice
            
            // Détecter le type de section basé sur le nom de la section
            const sectionName = (r.section || '').toLowerCase();
            
            if (sectionName.includes('projective') || sectionName.includes('projectif')) {
              // C'est une question projective principale
              maxPoints = 10; // 5 composants x 2 points
            } else if (r.components && Array.isArray(r.components)) {
              // Détection alternative basée sur la présence de composants
              maxPoints = 10;
            }
            
            return {
              characteristic: r.characteristic || 0,
              section: r.section || '',
              score: r.score || 0,
              maxPoints: maxPoints,
              comment: r.comment || '',
              // Ajouter les composants si présents (pour les questions projectives)
              components: r.components ? r.components.map((c: any) => ({
                ...c,
                score: c.score || 0,
                maxPoints: 2 // Les composants des questions projectives sont sur 2 points
              })) : [],
              // Ajouter le commentaire de section si présent
              sectionComment: r.sectionComment || ''
            };
          }) : [];
        
        return {
          score: totalScore,
          feedback: feedback,
          evaluation: {
            responses: responses
          }
        };
      } else if (type === 'iiep' || type === 'siiep') {
        // Validate IIEP/SIIEP response format
        if (!jsonResponse.responses || !Array.isArray(jsonResponse.responses)) {
          console.error('Invalid response structure:', jsonResponse);
          throw new Error('Invalid response format: responses array missing');
        }

        // Validate each response
        jsonResponse.responses.forEach((r: any, i: number) => {
          if (typeof r.objection !== 'number' || 
              typeof r.stage !== 'string' || 
              typeof r.score !== 'number' || 
              typeof r.maxPoints !== 'number' || 
              typeof r.comment !== 'string') {
            throw new Error(`Invalid response format at index ${i}`);
          }
        });

        // Validate final score and feedback
        if (typeof jsonResponse.finalScore !== 'number') {
          throw new Error('Invalid response format: finalScore missing or invalid');
        }
        if (typeof jsonResponse.feedback !== 'string') {
          throw new Error('Invalid response format: feedback missing or invalid');
        }

        // Transform the response to match the expected format
        return {
          score: jsonResponse.finalScore,
          feedback: jsonResponse.feedback,
          evaluation: {
            responses: jsonResponse.responses.map((r: any) => ({
              characteristic: r.objection,
              section: r.stage,
              score: r.score,
              maxPoints: r.maxPoints,
              comment: r.comment
            }))
          }
        };
      } else if (type === 'goalkeeper') {
        // Validate goalkeeper response format
        if (typeof jsonResponse.score !== 'number' || 
            typeof jsonResponse.feedback !== 'string' ||
            !Array.isArray(jsonResponse.strengths) ||
            !Array.isArray(jsonResponse.improvements) ||
            !Array.isArray(jsonResponse.criteria)) {
          console.error('Invalid response structure:', jsonResponse);
          throw new Error('Invalid goalkeeper response format');
        }

        // Validate each criterion
        jsonResponse.criteria.forEach((criterion: any) => {
          if (!criterion.id || !criterion.name || !criterion.description ||
              typeof criterion.maxPoints !== 'number' || 
              typeof criterion.score !== 'number' ||
              !criterion.feedback || !criterion.consigne) {
            throw new Error(`Invalid criterion format: ${JSON.stringify(criterion)}`);
          }
        });
      } else {
        // Validate company presentation response format
        if (typeof jsonResponse.score !== 'number' || 
            typeof jsonResponse.feedback !== 'string' ||
            !Array.isArray(jsonResponse.strengths) ||
            !Array.isArray(jsonResponse.improvements) ||
            !Array.isArray(jsonResponse.criteria)) {
          console.error('Invalid response structure:', jsonResponse);
          throw new Error('Invalid company presentation response format');
        }

        // Validate each criterion
        jsonResponse.criteria.forEach((criterion: any) => {
          if (!criterion.id || !criterion.name || !criterion.description ||
              typeof criterion.maxPoints !== 'number' || 
              typeof criterion.score !== 'number' ||
              !criterion.feedback || !criterion.consigne) {
            throw new Error(`Invalid criterion format: ${JSON.stringify(criterion)}`);
          }
        });
      }

      return jsonResponse;

    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Response content:', result.completion.content);
      // En cas d'erreur de parsing, retourner une réponse formatée
      return {
        score: 0,
        feedback: "Une erreur est survenue lors de l'évaluation. Veuillez réessayer.",
        strengths: [],
        improvements: ["Réessayer l'évaluation"],
        criteria: [{
          id: "error",
          name: "Erreur d'évaluation",
          description: "Une erreur technique est survenue",
          maxPoints: 2,
          score: 0,
          feedback: "Impossible de compléter l'évaluation",
          consigne: "Veuillez réessayer l'évaluation"
        }]
      };
    }

  } catch (error) {
    console.error('Error in evaluateExercise:', error);
    throw error;
  }
}
