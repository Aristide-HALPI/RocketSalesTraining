# Intégration de l'API Fabrile - Guide d'implémentation

![Fabrile API Integration](https://via.placeholder.com/800x200?text=Fabrile+API+Integration)

## Table des matières

1. [Introduction](#introduction)
2. [Prérequis](#prérequis)
3. [Architecture](#architecture)
4. [Installation et configuration](#installation-et-configuration)
5. [Implémentation pas à pas](#implémentation-pas-à-pas)
   - [Étape 1: Configuration de base](#étape-1-configuration-de-base)
   - [Étape 2: Service d'IA](#étape-2-service-dia)
   - [Étape 3: Gestion des threads](#étape-3-gestion-des-threads)
   - [Étape 4: Logique d'évaluation](#étape-4-logique-dévaluation)
   - [Étape 5: Services métier](#étape-5-services-métier)
   - [Étape 6: Intégration UI](#étape-6-intégration-ui)
6. [Exemples d'utilisation](#exemples-dutilisation)
7. [Bonnes pratiques](#bonnes-pratiques)
8. [Dépannage](#dépannage)
9. [Ressources](#ressources)

## Introduction

Ce guide détaille l'intégration de l'API Fabrile dans une application React/TypeScript. L'API Fabrile est utilisée pour évaluer automatiquement des exercices ou contenus utilisateur grâce à l'intelligence artificielle. Cette documentation vous permettra de reproduire facilement cette intégration dans votre propre application.

## Prérequis

- Node.js (v14+)
- React (v16.8+ avec Hooks)
- TypeScript
- Compte Fabrile avec token API
- Gestionnaire d'état (optionnel, ex: Redux, Context API)
- Base de données pour stocker les résultats (ex: Firebase)

## Architecture

L'architecture d'intégration de Fabrile suit une approche modulaire avec les composants suivants:

```
src/
├── api/
│   └── ai/
│       ├── routes/
│       │   ├── evaluation.ts    # Logique principale d'évaluation
│       │   └── thread.ts        # Gestion des conversations avec l'IA
│       └── prompts/
│           └── [type].ts        # Prompts spécifiques par type d'exercice
├── services/
│   └── AIService.ts             # Interface unifiée pour l'IA
└── features/
    └── [feature]/
        └── services/
            └── [feature]Service.ts  # Intégration spécifique à chaque fonctionnalité
```

**Flux de données:**

1. L'utilisateur soumet un contenu à évaluer
2. Le service métier prépare les données
3. AIService coordonne l'appel à l'API
4. Les modules thread.ts et evaluation.ts gèrent la communication avec Fabrile
5. La réponse est traitée et formatée
6. Les résultats sont sauvegardés et affichés à l'utilisateur

## Installation et configuration

### 1. Installation des dépendances

```bash
npm install --save axios dotenv
# ou avec yarn
yarn add axios dotenv
```

### 2. Configuration des variables d'environnement

Créez un fichier `.env` à la racine de votre projet:

```
VITE_FABRILE_TOKEN=votre_token_api_fabrile
VITE_FABRILE_ORGANIZATION_ID=votre_id_organisation
VITE_FABRILE_AGENT_ID=votre_id_agent
```

Pour une application Vite, ces variables seront accessibles via `import.meta.env.VITE_FABRILE_TOKEN`.

## Implémentation pas à pas

### Étape 1: Configuration de base

Créez la structure de dossiers nécessaire:

```bash
mkdir -p src/api/ai/routes src/api/ai/prompts src/services
```

### Étape 2: Service d'IA

Créez le fichier `src/services/AIService.ts`:

```typescript
// src/services/AIService.ts
import { evaluateExercise as apiEvaluateExercise } from '../api/ai/routes/evaluation';

export type ExerciseType = 'type1' | 'type2' | 'type3'; // Personnalisez selon vos besoins

export interface ExerciseEvaluationRequest {
  type: ExerciseType;
  content: string;
  organizationId: string;
  botId?: string;
}

export interface AIEvaluationResponse {
  score?: number;
  feedback: string;
  responses?: Array<{
    characteristic?: number;
    section?: string;
    score: number;
    maxPoints: number;
    comment: string;
    objection?: number;
    stage?: string;
  }>;
  totalScore?: number;
  finalScore?: number;
  // Ajoutez d'autres champs selon vos besoins
}

/**
 * Service centralisé pour les interactions avec l'IA Fabrile
 */
export const AIService = {
  /**
   * Évalue un exercice à l'aide de l'IA
   * @param request Données de la requête
   * @returns Réponse formatée de l'IA
   */
  evaluateExercise: async (request: ExerciseEvaluationRequest): Promise<AIEvaluationResponse> => {
    return apiEvaluateExercise(
      request.organizationId, 
      request.content, 
      request.type
    );
  }
};
```

### Étape 3: Gestion des threads

Créez le fichier `src/api/ai/routes/thread.ts`:

```typescript
// src/api/ai/routes/thread.ts

/**
 * Crée un nouveau thread de conversation avec l'agent Fabrile
 * @param organizationId ID de l'organisation
 * @param agentId ID de l'agent IA
 * @returns Réponse contenant l'ID du thread
 */
export async function createThread(organizationId: string, agentId: string) {
  try {
    const token = import.meta.env.VITE_FABRILE_TOKEN;
    
    if (!token) {
      throw new Error("VITE_FABRILE_TOKEN manquant dans les variables d'environnement");
    }

    const response = await fetch(`/api/v1/threads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        agent_id: agentId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Échec de création du thread: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur lors de la création du thread:", error);
    throw error;
  }
}

/**
 * Envoie un message dans un thread existant
 * @param organizationId ID de l'organisation
 * @param threadId ID du thread
 * @param message Contenu du message
 * @returns Réponse de l'IA
 */
export async function createThreadMessage(organizationId: string, threadId: string, message: string) {
  try {
    const token = import.meta.env.VITE_FABRILE_TOKEN;
    
    if (!token) {
      throw new Error("VITE_FABRILE_TOKEN manquant dans les variables d'environnement");
    }

    const response = await fetch(`/api/v1/threads/${threadId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Échec d'envoi du message: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur lors de l'envoi du message:", error);
    throw error;
  }
}
```

### Étape 4: Logique d'évaluation

Créez le fichier `src/api/ai/routes/evaluation.ts`:

```typescript
// src/api/ai/routes/evaluation.ts
import { createThread, createThreadMessage } from './thread';
import type { ExerciseType } from '../../../services/AIService';

// Définition des prompts par type d'exercice
const EXERCISE_PROMPTS: Record<string, string> = {
  type1: 'Veuillez évaluer cet exercice de type 1 et fournir des commentaires:',
  type2: 'Veuillez évaluer cet exercice de type 2 et fournir des commentaires:',
  type3: 'Veuillez évaluer cet exercice de type 3 et fournir des commentaires:',
  // Ajoutez d'autres types selon vos besoins
};

/**
 * Extrait le contenu JSON d'une réponse markdown
 * @param content Contenu de la réponse
 * @returns Contenu JSON nettoyé
 */
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

/**
 * Évalue un exercice à l'aide de l'IA Fabrile
 * @param organizationId ID de l'organisation
 * @param content Contenu à évaluer
 * @param type Type d'exercice
 * @returns Réponse formatée de l'IA
 */
export async function evaluateExercise(
  organizationId: string, 
  content: string, 
  type: ExerciseType
) {
  try {
    // 1. Récupérer l'ID de l'agent depuis les variables d'environnement
    const agentId = import.meta.env.VITE_FABRILE_AGENT_ID;
    
    if (!agentId) {
      throw new Error("VITE_FABRILE_AGENT_ID manquant dans les variables d'environnement");
    }
    
    // 2. Préparer le prompt avec le contenu à évaluer
    const promptBase = EXERCISE_PROMPTS[type] || 'Veuillez évaluer cet exercice:';
    const prompt = `${promptBase}\n\n${content}`;
    
    console.log(`Évaluation de l'exercice de type: ${type}`);
    
    // 3. Créer un thread de conversation
    const threadResponse = await createThread(organizationId, agentId);
    const threadId = threadResponse.id;
    
    console.log(`Thread créé avec succès, ID: ${threadId}`);
    
    // 4. Envoyer le message au thread
    const result = await createThreadMessage(organizationId, threadId, prompt);
    
    console.log('Réponse reçue de l\'IA');
    
    // 5. Traiter la réponse
    try {
      // Extraire le JSON de la réponse
      const jsonContent = extractJsonFromMarkdown(result.completion.content);
      const jsonResponse = JSON.parse(jsonContent);
      
      console.log('Réponse parsée avec succès');
      
      // 6. Validation et transformation selon le type d'exercice
      if (type === 'type1') {
        // Logique spécifique au type1
        // Exemple:
        if (!jsonResponse.score || !jsonResponse.feedback) {
          throw new Error('Réponse incomplète: score ou feedback manquant');
        }
      } else if (type === 'type2') {
        // Logique spécifique au type2
      } else {
        // Validation générique
        if (typeof jsonResponse.score !== 'number' || 
            typeof jsonResponse.feedback !== 'string') {
          throw new Error('Format de réponse invalide');
        }
      }
      
      return jsonResponse;
    } catch (error) {
      console.error('Erreur lors du parsing de la réponse:', error);
      console.error('Contenu de la réponse:', result.completion.content);
      
      // Réponse par défaut en cas d'erreur
      return {
        score: 0,
        feedback: "Une erreur est survenue lors de l'évaluation. Veuillez réessayer."
      };
    }
  } catch (error) {
    console.error('Erreur dans evaluateExercise:', error);
    throw error;
  }
}
```

### Étape 5: Services métier

Créez un service métier pour votre fonctionnalité spécifique:

```typescript
// src/features/yourFeature/services/yourFeatureService.ts
import { AIService } from '../../../services/AIService';
import { db } from '../../../lib/firebase'; // Adaptez selon votre base de données
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'; // Adaptez selon votre base de données

export interface YourExercise {
  id: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated';
  content: any; // Adaptez selon votre structure de données
  score?: number;
  feedback?: string;
  // Autres champs selon vos besoins
}

export class YourFeatureService {
  /**
   * Récupère l'exercice d'un utilisateur
   * @param userId ID de l'utilisateur
   * @returns Exercice ou null si non trouvé
   */
  async getExercise(userId: string): Promise<YourExercise | null> {
    try {
      const exerciseRef = doc(db, `users/${userId}/exercises/yourFeature`);
      const exerciseSnap = await getDoc(exerciseRef);
      
      if (exerciseSnap.exists()) {
        return exerciseSnap.data() as YourExercise;
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'exercice:', error);
      throw error;
    }
  }
  
  /**
   * Évalue un exercice avec l'IA Fabrile
   * @param userId ID de l'utilisateur
   * @returns Void
   */
  async evaluateWithAI(userId: string): Promise<void> {
    try {
      // 1. Récupérer l'exercice
      const exercise = await this.getExercise(userId);
      
      if (!exercise) {
        throw new Error('Exercice non trouvé');
      }
      
      // 2. Formater le contenu pour l'IA
      const formattedContent = JSON.stringify({
        // Adaptez selon votre structure de données
        title: exercise.title,
        sections: exercise.sections,
        responses: exercise.responses,
        // etc.
      });
      
      // 3. Appeler l'IA pour évaluation
      const evaluation = await AIService.evaluateExercise({
        type: 'type1', // Adaptez selon votre type d'exercice
        content: formattedContent,
        organizationId: import.meta.env.VITE_FABRILE_ORGANIZATION_ID,
      });
      
      // 4. Mettre à jour l'exercice avec les résultats
      const updatedExercise = {
        ...exercise,
        status: 'evaluated',
        score: evaluation.score || 0,
        feedback: evaluation.feedback,
        // Adaptez selon votre structure et les données reçues
        responses: evaluation.responses,
        lastUpdated: new Date().toISOString()
      };
      
      // 5. Sauvegarder les résultats
      const exerciseRef = doc(db, `users/${userId}/exercises/yourFeature`);
      await setDoc(exerciseRef, updatedExercise);
      
      console.log('Exercice évalué avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'évaluation avec l\'IA:', error);
      throw error;
    }
  }
}

// Exporter une instance du service
export const yourFeatureService = new YourFeatureService();
```

### Étape 6: Intégration UI

Créez un composant React pour intégrer l'évaluation IA dans votre interface:

```tsx
// src/components/AIEvaluationButton.tsx
import React, { useState } from 'react';
import { yourFeatureService } from '../features/yourFeature/services/yourFeatureService';

interface AIEvaluationButtonProps {
  userId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const AIEvaluationButton: React.FC<AIEvaluationButtonProps> = ({ 
  userId, 
  onSuccess, 
  onError 
}) => {
  const [loading, setLoading] = useState(false);
  
  const handleEvaluation = async () => {
    try {
      setLoading(true);
      await yourFeatureService.evaluateWithAI(userId);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Erreur lors de l'évaluation IA:", error);
      
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleEvaluation}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {loading ? "Évaluation en cours..." : "Évaluer avec l'IA"}
    </button>
  );
};
```

Utilisez ce composant dans votre page:

```tsx
// src/pages/YourFeaturePage.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext'; // Adaptez selon votre système d'authentification
import { AIEvaluationButton } from '../components/AIEvaluationButton';
import { toast } from 'react-toastify'; // Ou votre système de notification préféré

export const YourFeaturePage: React.FC = () => {
  const { currentUser } = useAuth();
  
  const handleEvaluationSuccess = () => {
    toast.success("L'exercice a été évalué avec succès par l'IA");
  };
  
  const handleEvaluationError = (error: Error) => {
    toast.error(`Erreur lors de l'évaluation: ${error.message}`);
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Votre exercice</h1>
      
      {/* Contenu de votre exercice */}
      
      <div className="mt-4">
        <AIEvaluationButton 
          userId={currentUser?.uid || ''}
          onSuccess={handleEvaluationSuccess}
          onError={handleEvaluationError}
        />
      </div>
    </div>
  );
};
```

## Exemples d'utilisation

### Exemple 1: Évaluation d'un exercice textuel

```typescript
// Préparation des données
const exerciseData = {
  title: "Exercice de rédaction",
  content: "Texte rédigé par l'utilisateur...",
  criteria: ["clarté", "pertinence", "structure"]
};

// Appel à l'IA
const result = await AIService.evaluateExercise({
  type: 'text_exercise',
  content: JSON.stringify(exerciseData),
  organizationId: import.meta.env.VITE_FABRILE_ORGANIZATION_ID
});

console.log('Score:', result.score);
console.log('Feedback:', result.feedback);
```

### Exemple 2: Évaluation d'un dialogue

```typescript
// Préparation des données de dialogue
const dialogueData = {
  title: "Simulation d'entretien commercial",
  dialogues: [
    { speaker: "commercial", text: "Bonjour, comment puis-je vous aider?" },
    { speaker: "client", text: "Je cherche une solution pour..." },
    // ...autres échanges
  ]
};

// Appel à l'IA
const result = await AIService.evaluateExercise({
  type: 'dialogue',
  content: JSON.stringify(dialogueData),
  organizationId: import.meta.env.VITE_FABRILE_ORGANIZATION_ID
});

// Traitement des résultats
dialogueData.dialogues.forEach((dialogue, index) => {
  if (dialogue.speaker === "commercial" && result.responses && result.responses[index]) {
    console.log(`Évaluation dialogue ${index}:`, result.responses[index].comment);
  }
});
```

## Bonnes pratiques

### Gestion des erreurs

- Implémentez une gestion robuste des erreurs à chaque niveau
- Prévoyez des réponses de secours en cas d'échec de l'IA
- Utilisez un système de journalisation pour suivre les problèmes

```typescript
try {
  // Code susceptible d'échouer
} catch (error) {
  console.error('Description précise de l\'erreur:', error);
  // Réponse de secours ou notification à l'utilisateur
}
```

### Optimisation des prompts

- Créez des prompts spécifiques et détaillés pour chaque type d'exercice
- Structurez vos instructions pour obtenir des réponses dans le format attendu
- Incluez des exemples de réponses idéales dans vos prompts

### Sécurité

- Ne stockez jamais les tokens API côté client (utilisez des variables d'environnement)
- Utilisez un proxy serveur pour les appels API sensibles si possible
- Limitez les permissions de l'API aux fonctionnalités nécessaires

## Dépannage

### Problème: L'IA ne renvoie pas de réponse

**Solutions possibles:**
- Vérifiez que votre token API est valide
- Assurez-vous que le format de votre requête est correct
- Vérifiez les logs pour des erreurs spécifiques

### Problème: La réponse JSON est malformée

**Solutions possibles:**
- Utilisez la fonction `extractJsonFromMarkdown` pour nettoyer la réponse
- Ajoutez des instructions explicites dans votre prompt pour obtenir un JSON valide
- Implémentez une logique de réparation de JSON comme celle fournie

### Problème: Les scores ou commentaires sont incohérents

**Solutions possibles:**
- Affinez votre prompt avec des exemples plus précis
- Ajoutez des critères d'évaluation spécifiques dans votre requête
- Contactez le support Fabrile pour des ajustements de l'IA

## Ressources

- [Documentation officielle de Fabrile](https://docs.fabrile.ai)
- [Guide des bonnes pratiques pour les prompts](https://docs.fabrile.ai/prompts)
- [Exemples de projets](https://github.com/fabrile/examples)

---

## Licence

Ce projet est sous licence MIT.

---

Créé avec ❤️ par [Votre Nom/Organisation]
