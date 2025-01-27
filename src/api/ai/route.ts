async function createThread(organizationId: string, agentId: string) {
  try {
    const token = import.meta.env.VITE_FABRILE_TOKEN;
    if (!token) {
      throw new Error("FABRILE_TOKEN is missing in the environment variables.");
    }

    console.log("Creating thread with:", { organizationId, agentId });

    const response = await fetch(`/api/v1/o/${organizationId}/threads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        agent_id: agentId,
      }),
    });

    console.log("Thread creation response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Thread creation error:", errorText);
      throw new Error(`Failed to create thread: ${response.status} - ${errorText}`);
    }

    const threadData = await response.json();
    console.log("Thread created successfully:", threadData);
    return threadData;
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
    if (!token) {
      throw new Error("FABRILE_TOKEN is missing in the environment variables.");
    }

    console.log("Creating message in thread:", { organizationId, threadId });

    const response = await fetch(`/api/v1/o/${organizationId}/threads/${threadId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
      }),
    });

    console.log("Message creation response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Message creation error:", errorText);
      throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
    }

    const messageData = await response.json();
    console.log("Message created successfully:", {
      status: messageData.status,
      completion: messageData.completion,
      error: messageData.error
    });
    return messageData;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error creating thread message:", error.message);
    } else {
      console.error("Unknown error creating thread message:", error);
    }
    throw error;
  }
}

export { createThread, createThreadMessage };
