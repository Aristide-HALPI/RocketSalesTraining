async function createThread(organizationId: string, agentId: string) {
  try {
    const token = import.meta.env.VITE_FABRILE_TOKEN;
    
    if (!token) {
      throw new Error("VITE_FABRILE_TOKEN is missing in the environment variables.");
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
      throw new Error(`Failed to create thread: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error creating thread:", error.message);
    } else {
      console.error("Unknown error creating thread:", error);
    }
    throw error;
  }
}

async function createThreadMessage(organizationId: string, threadId: string, message: string, maxRetries = 3, timeoutMs = 180000) {
  let lastError: Error | unknown = new Error('Unknown error');
  
  // Fonction pour effectuer une requête avec timeout
  const fetchWithTimeout = async (attempt: number): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      console.log(`🔄 Tentative d'appel API ${attempt}/${maxRetries} (timeout: ${timeoutMs/1000}s)`);
      
      const token = import.meta.env.VITE_FABRILE_TOKEN;
      if (!token) {
        throw new Error("VITE_FABRILE_TOKEN is missing in the environment variables.");
      }

      console.log(`📡 Envoi de la requête à /api/v1/threads/${threadId}/messages`);
      const response = await fetch(`/api/v1/threads/${threadId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create message: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Timeout dépassé après ${timeoutMs/1000} secondes`);
      }
      
      throw error;
    }
  };
  
  // Boucle de retry avec backoff exponentiel
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(attempt);
    } catch (error: unknown) {
      lastError = error;
      
      // Log de l'erreur
      if (error instanceof Error) {
        console.error(`❌ Erreur tentative ${attempt}/${maxRetries}:`, error.message);
      } else {
        console.error(`❌ Erreur inconnue tentative ${attempt}/${maxRetries}:`, error);
      }
      
      // Vérifier si c'est une erreur 504 ou un timeout
      const is504Error = error instanceof Error && 
                        (error.message.includes('504') || 
                         error.message.includes('Timeout'));
      
      // Si c'est une erreur 504 et qu'on n'a pas atteint le nombre max de tentatives
      if (is504Error && attempt < maxRetries) {
        // Backoff exponentiel: 2s, puis 4s, puis 8s, etc.
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`⏱️ Attente de ${delayMs/1000}s avant nouvelle tentative...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      // Si on arrive ici, soit ce n'est pas une erreur 504, soit on a épuisé les tentatives
      throw error;
    }
  }
  
  throw lastError;
}

export { createThread, createThreadMessage };
