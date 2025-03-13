async function createThread(organizationId: string, agentId: string) {
  try {
    const token = import.meta.env.VITE_FABRILE_TOKEN;
    const apiUrl = import.meta.env.VITE_FABRILE_API_URL || '';
    
    if (!token) {
      throw new Error("VITE_FABRILE_TOKEN is missing in the environment variables.");
    }

    const response = await fetch(`${apiUrl}/api/v1/threads`, {
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

async function createThreadMessage(organizationId: string, threadId: string, message: string) {
  try {
    const token = import.meta.env.VITE_FABRILE_TOKEN;
    const apiUrl = import.meta.env.VITE_FABRILE_API_URL || '';
    
    if (!token) {
      throw new Error("VITE_FABRILE_TOKEN is missing in the environment variables.");
    }

    console.log(organizationId, threadId);
    const response = await fetch(`${apiUrl}/api/v1/threads/${threadId}/messages`, {
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
      throw new Error(`Failed to create message: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error creating message:", error.message);
    } else {
      console.error("Unknown error creating message:", error);
    }
    throw error;
  }
}

export { createThread, createThreadMessage };
