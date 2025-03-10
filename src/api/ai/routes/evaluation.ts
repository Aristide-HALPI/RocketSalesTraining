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

export type ExerciseType = 'rdv_decideur' | 'company' | 'sections' | 'goalkeeper' | 'presentation' | 'cdab' | 'eombus' | 'siiep' | 'iiep';

const EXERCISE_PROMPTS: Record<string, string> = {
  rdv_decideur: 'Please evaluate this RDV décideur exercise dialogue and provide feedback:',
  sections: 'Please evaluate this sections exercise and provide feedback:',
  presentation: presentationPrompt,
  cdab: cdabPrompt,
  goalkeeper: 'Please evaluate this goalkeeper exercise dialogue and provide feedback:',
  eombus: 'Please evaluate this EOMBUS-PAF-I exercise and provide feedback:',
  siiep: 'Please evaluate this SIIEP exercise and provide feedback:',
  iiep: 'Please evaluate this IIEP exercise dialogue and provide feedback:'
};

const extractJsonFromMarkdown = (content: string): string => {
  // Extraire le JSON entre les balises ```json si présentes
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  let jsonContent = jsonMatch ? jsonMatch[1] : content;
  
  // Nettoyer le contenu avant le parsing
  jsonContent = jsonContent.trim();
  
  // Si le JSON est tronqué, essayons de le réparer
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
      jsonContent = extractJsonFromMarkdown(jsonContent);
      
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
          const expectedAnswers = {
            'motivateurs': 5,
            'caracteristiques': 5,
            'concepts': 2
          };
          if (section.answers.length !== expectedAnswers[section.id as keyof typeof expectedAnswers]) {
            throw new Error(`Invalid number of answers for section ${section.id}. Expected: ${expectedAnswers[section.id as keyof typeof expectedAnswers]}, Got: ${section.answers.length}`);
          }
        });
      } else if (type === 'cdab' || type === 'eombus') {
        // Validate CDAB/EOMBUS response format
        if (!jsonResponse.responses || !Array.isArray(jsonResponse.responses)) {
          console.error('Invalid response structure:', jsonResponse);
          throw new Error('Invalid response format: responses array missing');
        }

        // Validate each response
        jsonResponse.responses.forEach((r: any, i: number) => {
          if (typeof r.characteristic !== 'number' || 
              typeof r.section !== 'string' || 
              typeof r.score !== 'number' || 
              typeof r.maxPoints !== 'number' || 
              typeof r.comment !== 'string') {
            throw new Error(`Invalid response format at index ${i}`);
          }
        });

        // Validate scores
        if (typeof jsonResponse.totalScore !== 'number') {
          throw new Error('Invalid response format: totalScore missing or invalid');
        }
        if (typeof jsonResponse.finalScoreOutOf100 !== 'number') {
          console.warn('finalScoreOutOf100 missing, will use totalScore');
        }
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
