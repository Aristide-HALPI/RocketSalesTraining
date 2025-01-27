import { doc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { createThread, createThreadMessage } from "../../../api/ai/route";
import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../lib/firebase";
import { DialogueSection } from "../components/DialogueSection";
import { EvaluationGrid } from "../components/EvaluationGrid";
import { ScoreDisplay } from "../components/ScoreDisplay";
import { goalkeeperService } from "../services/goalkeeperService";
import type { GoalkeeperExercise } from "../types";
import {
  EvaluationCriterion,
  GOALKEEPER_EVALUATION_CRITERIA,
  SubCriterion,
} from "../types";

interface LocalEvaluation {
  criteria: EvaluationCriterion[];
  totalScore: number;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

interface StorageData {
  feedbacks: { [key: string]: string };
  evaluation: LocalEvaluation;
}

// Default evaluation
const defaultEvaluation: LocalEvaluation = {
  criteria: GOALKEEPER_EVALUATION_CRITERIA.map(
    (criterion: EvaluationCriterion) => ({
      ...criterion,
      subCriteria: criterion.subCriteria.map((sub: SubCriterion) => ({
        ...sub,
        score: 0,
        feedback: "",
      })),
    })
  ),
  totalScore: 0,
};

const GoalkeeperExercise: React.FC = () => {
  const { userProfile } = useAuth();
  const { studentId: pathStudentId } = useParams();
  const [searchParams] = useSearchParams();
  const queryStudentId = searchParams.get("studentId");

  const studentId = pathStudentId || queryStudentId;
  const isFormateur =
    userProfile?.role === "trainer" || userProfile?.role === "admin";
  const userId = studentId || userProfile?.uid || "";

  const [exercise, setExercise] = useState<GoalkeeperExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [debouncedUpdate, setDebouncedUpdate] = useState<NodeJS.Timeout | null>(
    null
  );

  const [localFeedbacks, setLocalFeedbacks] = useState<{
    [key: string]: string;
  }>({});
  const [localEvaluation, setLocalEvaluation] =
    useState<LocalEvaluation>(defaultEvaluation);
  const [aiLoading, setAiLoading] = useState(false);

  // Save comments and evaluations locally
  const saveToLocalStorage = (userId: string, data: StorageData) => {
    localStorage.setItem(`goalkeeper_feedback_${userId}`, JSON.stringify(data));
  };

  // Load comments and evaluations from local storage
  useEffect(() => {
    if (userId) {
      const savedData = localStorage.getItem(`goalkeeper_feedback_${userId}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setLocalFeedbacks(parsedData.feedbacks || {});
        if (parsedData.evaluation?.totalScore !== undefined) {
          const evaluation: LocalEvaluation = {
            criteria: parsedData.evaluation.criteria.map(
              (criterion: EvaluationCriterion) => ({
                ...criterion,
                subCriteria: criterion.subCriteria.map((sub: SubCriterion) => ({
                  ...sub,
                  score: Number(sub.score) || 0,
                  feedback: sub.feedback || "",
                })),
              })
            ),
            totalScore: Number(parsedData.evaluation.totalScore),
            evaluatedBy: parsedData.evaluation.evaluatedBy,
            evaluatedAt: parsedData.evaluation.evaluatedAt,
          };
          setLocalEvaluation(evaluation);
        }
      }
    }
  }, [userId]);

  // Publish evaluation
  const handlePublishEvaluation = async () => {
    if (!exercise || !userId || !isFormateur || !userProfile) return;

    try {
      const updatedEvaluation: LocalEvaluation = {
        ...localEvaluation,
        evaluatedBy: userProfile.email || "Unknown",
        evaluatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, `users/${userId}/exercises`, "goalkeeper"), {
        status: "evaluated",
        evaluation: updatedEvaluation,
      });

      // Update local state immediately
      setExercise((prev) =>
        prev
          ? {
              ...prev,
              status: "evaluated",
              evaluation: updatedEvaluation,
            }
          : prev
      );

      toast.success("Evaluation published successfully!");
    } catch (error) {
      console.error("Error during publication:", error);
      toast.error("Error publishing the evaluation");
    }
  };

  // Update score for a criterion
  const handleUpdateScore = (
    criterionId: string,
    subCriterionId: string,
    score: number
  ) => {
    if (!exercise || !exercise.evaluation) return;

    // Ensure we have a local evaluation initialized
    const currentEvaluation: LocalEvaluation = localEvaluation;

    // Update the score for the specific sub-criterion
    const updatedCriteria = currentEvaluation.criteria.map(
      (criterion: EvaluationCriterion) => {
        if (criterion.id === criterionId) {
          return {
            ...criterion,
            subCriteria: criterion.subCriteria.map((sub: SubCriterion) => {
              if (sub.id === subCriterionId) {
                return { ...sub, score };
              }
              return sub;
            }),
          };
        }
        return criterion;
      }
    );

    // Calculate new total score
    const totalScore = updatedCriteria.reduce(
      (total: number, criterion: EvaluationCriterion) =>
        total +
        criterion.subCriteria.reduce(
          (subTotal: number, sub: SubCriterion) =>
            subTotal + (Number(sub.score) || 0),
          0
        ),
      0
    );

    // Create new evaluation
    const updatedEvaluation: LocalEvaluation = {
      ...currentEvaluation,
      criteria: updatedCriteria,
      totalScore,
    };

    // Update local state
    setLocalEvaluation(updatedEvaluation);
    saveToLocalStorage(userId, {
      feedbacks: localFeedbacks,
      evaluation: updatedEvaluation,
    });
  };

  // Update feedback for a criterion in the grid
  const handleUpdateCriterionFeedback = (
    criterionId: string,
    subCriterionId: string,
    feedback: string
  ) => {
    if (!exercise || !exercise.evaluation) return;

    // Ensure we have a local evaluation initialized
    const currentEvaluation: LocalEvaluation = localEvaluation;

    // Update the feedback for the specific sub-criterion
    const updatedCriteria = currentEvaluation.criteria.map(
      (criterion: EvaluationCriterion) => {
        if (criterion.id === criterionId) {
          return {
            ...criterion,
            subCriteria: criterion.subCriteria.map((sub: SubCriterion) => {
              if (sub.id === subCriterionId) {
                return { ...sub, feedback };
              }
              return sub;
            }),
          };
        }
        return criterion;
      }
    );

    // Create new evaluation
    const updatedEvaluation: LocalEvaluation = {
      ...currentEvaluation,
      criteria: updatedCriteria,
    };

    // Update local state
    setLocalEvaluation(updatedEvaluation);
    saveToLocalStorage(userId, {
      feedbacks: localFeedbacks,
      evaluation: updatedEvaluation,
    });
  };

  // Update feedback for a dialogue line
  const handleDialogueFeedbackUpdate = (
    section: "firstCall" | "secondCall",
    index: number,
    feedback: string
  ) => {
    if (!exercise || !userId || !isFormateur) return;

    const feedbackKey = `${section}_${index}`;
    const updatedFeedbacks = {
      ...localFeedbacks,
      [feedbackKey]: feedback,
    };

    // Update local state immediately
    setLocalFeedbacks(updatedFeedbacks);

    // Save to local storage
    saveToLocalStorage(userId, {
      feedbacks: updatedFeedbacks,
      evaluation: localEvaluation,
    });

    // Cancel previous update if it exists
    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    // Create a copy of the current exercise for update
    const updatedExercise = {
      ...exercise,
      [section]: {
        ...exercise[section],
        lines: exercise[section].lines.map((line, i) =>
          i === index ? { ...line, feedback } : line
        ),
      },
    };

    // Update local exercise immediately for better responsiveness
    setExercise(updatedExercise);

    // Update Firestore with a longer delay
    const newTimeout = setTimeout(() => {
      goalkeeperService
        .updateExercise(userId, updatedExercise)
        .catch((error) => {
          console.error("Error updating feedback:", error);
          // In case of error, revert to previous state
          setLocalFeedbacks((prev) => ({
            ...prev,
            [feedbackKey]: exercise[section].lines[index].feedback || "",
          }));
          setExercise(exercise);
        });
    }, 2000); // Increased to 2 seconds

    setDebouncedUpdate(newTimeout);
  };

  // Submit exercise
  const handleSubmit = async () => {
    if (!exercise || !userId) return;

    try {
      await goalkeeperService.submitExercise(userId);
      // Update local state immediately
      setExercise((prev) =>
        prev
          ? {
              ...prev,
              status: "submitted",
            }
          : prev
      );

      toast.success("Exercise submitted successfully!");
    } catch (error) {
      console.error("Error during submission:", error);
      toast.error("Error submitting the exercise");
    }
  };

  const handleLineUpdate = (
    sectionKey: "firstCall" | "secondCall",
    index: number,
    text: string
  ) => {
    if (!exercise) return;

    const updatedExercise = {
      ...exercise,
      [sectionKey]: {
        ...exercise[sectionKey],
        lines: exercise[sectionKey].lines.map((line, i) =>
          i === index ? { ...line, text } : line
        ),
      },
    };

    setExercise(updatedExercise);

    if (debouncedUpdate) {
      clearTimeout(debouncedUpdate);
    }

    const newTimeout = setTimeout(() => {
      goalkeeperService.updateExercise(userId, updatedExercise);
    }, 1000);

    setDebouncedUpdate(newTimeout);
  };

  const handleAddLine = (
    section: "firstCall" | "secondCall",
    speaker: "goalkeeper" | "commercial"
  ) => {
    if (!exercise || !userId || exercise.status === "submitted") return;

    const updatedExercise = {
      ...exercise,
      [section]: {
        ...exercise[section],
        lines: [
          ...exercise[section].lines,
          {
            id: crypto.randomUUID(),
            speaker,
            text: "",
            feedback: "",
          },
        ],
      },
    };

    goalkeeperService.updateExercise(userId, updatedExercise);
  };

  const handleRemoveLine = (section: "firstCall" | "secondCall") => {
    if (!exercise || !userId || exercise.status === "submitted") return;

    const updatedExercise = {
      ...exercise,
      [section]: {
        ...exercise[section],
        lines: exercise[section].lines.slice(0, -1),
      },
    };

    goalkeeperService.updateExercise(userId, updatedExercise);
  };

  // AI evaluation function
  const handleAIEvaluation = async () => {
    if (!exercise || !userId) return;

    setAiLoading(true);

    const organizationId = import.meta.env.VITE_FABRILE_ORG_ID;
    const botId = import.meta.env.VITE_FABRILE_BOT_ID;
    const token = import.meta.env.VITE_FABRILE_TOKEN;

    if (!organizationId || !botId || !token) {
      console.error("Missing environment variables for AI evaluation");
      toast.error("Error: Missing configuration for AI evaluation");
      setAiLoading(false);
      return;
    }

    try {
      const thread = await createThread(organizationId, botId);

      // Prepare the dialogue with line numbers for reference
      const firstCallLines = exercise.firstCall.lines.map(
        (line, index) => `[${index + 1}] ${line.speaker}: ${line.text}`
      );
      const secondCallLines = exercise.secondCall.lines.map(
        (line, index) =>
          `[${firstCallLines.length + index + 1}] ${line.speaker}: ${line.text}`
      );

      const dialogue = [...firstCallLines, ...secondCallLines].join("\n");

      const prompt = `Please evaluate this goalkeeper exercise dialogue and provide feedback:
        ${dialogue}
        
        For each line of dialogue, provide specific feedback in this format:
        [line_number] Feedback for this specific line
        
        Then, evaluate based on the following criteria:
        ${GOALKEEPER_EVALUATION_CRITERIA.map((criterion) =>
          criterion.subCriteria
            .map(
              (subCriteria) =>
                `${subCriteria.name}: ${subCriteria.maxPoints} points`
            )
            .join("\n")
        ).join("\n")}
        
        For each criteria evaluated, provide a score and detailed feedback in this format:
        criteria_name | score | max_points | feedback`;

      const result = await createThreadMessage(
        organizationId,
        thread.id,
        prompt
      );

      if (!result || !result.completion || !result.completion.content) {
        throw new Error("No valid response received from AI");
      }

      const feedbackData = result.completion.content;

      // Process the AI feedback
      const { evaluation: aiEvaluation, lineFeedback } =
        processAIFeedback(feedbackData);

      console.log("lineFeedback", lineFeedback);
      console.log("exercise.firstCall.lines", exercise.firstCall.lines);
      // Update exercise with line-specific feedback
      const updatedExercise = {
        ...exercise,
        status: "evaluated",
        evaluation: aiEvaluation,
        firstCall: {
          ...exercise.firstCall,
          lines: exercise.firstCall.lines.map((line, index) => ({
            ...line,
            feedback: lineFeedback[index + 1] || line.feedback || "",
          })),
        },
        secondCall: {
          ...exercise.secondCall,
          lines: exercise.secondCall.lines.map((line, index) => ({
            ...line,
            feedback:
              lineFeedback[exercise.firstCall.lines.length + index + 1] ||
              line.feedback ||
              "",
          })),
        },
      } as GoalkeeperExercise;

      setExercise(updatedExercise);
      await goalkeeperService.updateExercise(userId, updatedExercise);

      setLocalEvaluation(aiEvaluation);
      saveToLocalStorage(userId, {
        feedbacks: localFeedbacks,
        evaluation: aiEvaluation,
      });

      toast.success("AI evaluation completed successfully!");
    } catch (error) {
      console.error("Error during AI evaluation:", error);
      toast.error(
        "Error during AI evaluation. Please check the console for more details."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const processAIFeedback = (
    feedback: string
  ): {
    evaluation: LocalEvaluation;
    lineFeedback: { [key: number]: string };
  } => {
    const evaluation: LocalEvaluation = {
      criteria: GOALKEEPER_EVALUATION_CRITERIA.map((criterion) => ({
        ...criterion,
        subCriteria: criterion.subCriteria.map((sub) => ({
          ...sub,
        })),
      })),
      totalScore: 0,
      evaluatedBy: "AI",
      evaluatedAt: new Date().toISOString(),
    };

    const lineFeedback: { [key: number]: string } = {};
const lineMatches = [...feedback.matchAll(/Feedback(?:\s*for.*)?\s*:\s*(.+)/g)];

lineMatches.forEach((lineMatch, index) => {
  console.log("lineMatch", lineMatch);
  const [, feedbackText] = lineMatch; // Extract the feedback text
  lineFeedback[index + 1] = feedbackText.trim(); // Use index + 1 as line number
});

console.log(lineFeedback);



    for (let i = 0; i < GOALKEEPER_EVALUATION_CRITERIA.length; i++) {
      const criterion = GOALKEEPER_EVALUATION_CRITERIA[i];
      // Loop over subcriteria to find scores and feedback
      for (let j = 0; j < criterion.subCriteria.length; j++) {
        const subCriterion = criterion.subCriteria[j];
        const subCriterionMatch = feedback.match(
          new RegExp(
            `${subCriterion.name}[\\*\\s]*\\| (\\d+) \\| (\\d+)\\s*\\|?[\\*\\s]*(.*)`
          )
        );
        if (subCriterionMatch) {
          const [,score, maxPoints, subFeedback] = subCriterionMatch;
          evaluation.criteria[i].subCriteria[j].score = Number.parseInt(
            score,
            10
          );
          evaluation.criteria[i].subCriteria[j].feedback = subFeedback.trim();
        }
      }
    }

    evaluation.totalScore = evaluation.criteria.reduce(
      (total, criterion) =>
        total +
        criterion.subCriteria.reduce(
          (subTotal, sub) => subTotal + sub.score,
          0
        ),
      0
    );

    return { evaluation, lineFeedback };
  };

  // Initial exercise loading
  useEffect(() => {
    if (!userId) {
      console.log("No user ID available");
      return;
    }

    const loadExercise = async () => {
      try {
        // First, retrieve or create the exercise
        const initialExercise = await goalkeeperService.getExercise(userId);
        if (initialExercise) {
          setExercise(initialExercise);

          // Initialize local feedbacks from the exercise
          const initialFeedbacks: { [key: string]: string } = {};
          initialExercise.firstCall.lines.forEach(
            (line: any, index: number) => {
              initialFeedbacks[`firstCall_${index}`] = line.feedback || "";
            }
          );
          initialExercise.secondCall.lines.forEach(
            (line: any, index: number) => {
              initialFeedbacks[`secondCall_${index}`] = line.feedback || "";
            }
          );
          setLocalFeedbacks(initialFeedbacks);
        }

        // Then, subscribe to updates, but ignore updates
        // if they match our local state to avoid loops
        const unsubscribe = goalkeeperService.subscribeToExercise(
          userId,
          (updatedExercise: GoalkeeperExercise) => {
            console.log("Exercise updated:", updatedExercise);
            setExercise((prev) => {
              // Don't update if it's our own update
              if (
                prev &&
                JSON.stringify(prev) === JSON.stringify(updatedExercise)
              ) {
                return prev;
              }
              return updatedExercise;
            });
            setLoading(false);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error("Error loading exercise:", error);
        setLoading(false);
      }
    };

    loadExercise();
  }, [userId]);

  // Component rendering
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="flex justify-center items-center h-screen">
        Error loading exercise
      </div>
    );
  }

  // Conditional rendering of the evaluation grid
  const showEvaluationGrid = isFormateur || exercise?.status === "submitted";
  console.log("Debug - Evaluation Grid:", {
    isFormateur,
    status: exercise?.status,
    showEvaluationGrid,
    hasEvaluation: !!exercise?.evaluation,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center text-green-600 hover:text-green-800 mb-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
        Back to Dashboard
      </Link>

      {isFormateur && (
        <div className="bg-blue-100 p-4 mb-6 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800">Trainer Mode</h2>
          <p className="text-blue-600 mb-4">
            You are correcting the learner's exercise.
          </p>
          <button
            onClick={handleAIEvaluation}
            className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
            disabled={aiLoading}
          >
            {aiLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Evaluating...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                Evaluate with AI
              </>
            )}
          </button>
        </div>
      )}

      <div className="flex gap-4 mb-8">
        {exercise.status === "evaluated" && (
          <ScoreDisplay
            totalScore={exercise.evaluation?.totalScore || 0}
            maxScore={GOALKEEPER_EVALUATION_CRITERIA.reduce(
              (sum, criterion) => sum + criterion.maxPoints,
              0
            )}
          />
        )}

        {exercise.status !== "in_progress" && (
          <div
            className={`p-4 rounded-lg flex-grow ${
              exercise.status === "evaluated" ? "bg-green-100" : "bg-yellow-100"
            }`}
          >
            <h2
              className={`text-lg font-semibold ${
                exercise.status === "evaluated"
                  ? "text-green-800"
                  : "text-yellow-800"
              }`}
            >
              Exercise Status
            </h2>
            <p
              className={`mt-2 ${
                exercise.status === "evaluated"
                  ? "text-green-600"
                  : "text-yellow-600"
              }`}
            >
              {exercise.status === "evaluated"
                ? "Exercise corrected"
                : "Awaiting correction"}
            </p>
            {exercise.status === "evaluated" &&
              exercise.evaluation?.evaluatedAt && (
                <p className="text-sm text-green-600 mt-1">
                  Corrected on{" "}
                  {new Date(
                    exercise.evaluation.evaluatedAt
                  ).toLocaleDateString()}
                </p>
              )}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">
          Pass the Goalkeeper
        </h1>
        <p className="text-gray-700 mb-6">
          Write a complete dialogue of a phone conversation with the
          "goalkeeper" with the aim of getting them to pass you to the
          decision-maker (using the techniques learned during the training)
        </p>
      </div>

      {exercise.firstCall && (
        <>
          <DialogueSection
            title="First Call"
            section={exercise.firstCall}
            isFormateur={isFormateur}
            isSubmitted={exercise.status !== "in_progress"}
            onAddLine={(speaker) => handleAddLine("firstCall", speaker)}
            onRemoveLine={() => handleRemoveLine("firstCall")}
            onUpdateLine={(index, text) =>
              handleLineUpdate("firstCall", index, text)
            }
            onUpdateFeedback={(index, feedback) =>
              handleDialogueFeedbackUpdate("firstCall", index, feedback)
            }
          />
        </>
      )}

      {exercise.secondCall && (
        <>
          <DialogueSection
            title="Second Call"
            section={exercise.secondCall}
            isFormateur={isFormateur}
            isSubmitted={exercise.status !== "in_progress"}
            onAddLine={(speaker) => handleAddLine("secondCall", speaker)}
            onRemoveLine={() => handleRemoveLine("secondCall")}
            onUpdateLine={(index, text) =>
              handleLineUpdate("secondCall", index, text)
            }
            onUpdateFeedback={(index, feedback) =>
              handleDialogueFeedbackUpdate("secondCall", index, feedback)
            }
          />
        </>
      )}

      {!isFormateur && exercise.status === "in_progress" && (
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Submit
          </button>
        </div>
      )}

      {(showEvaluationGrid || exercise.status === "evaluated") &&
        exercise.evaluation && (
          <div className="mt-12 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Evaluation Grid</h2>
              {exercise.status === "submitted" && (
                <div className="bg-yellow-100 px-4 py-2 rounded-lg">
                  <p className="text-yellow-800">Awaiting trainer evaluation</p>
                </div>
              )}
            </div>
            <EvaluationGrid
              isFormateur={isFormateur}
              evaluation={localEvaluation}
              onUpdateScore={handleUpdateScore}
              onUpdateFeedback={handleUpdateCriterionFeedback}
            />
            {isFormateur && (
              <div className="mt-8 flex justify-end gap-4">
                <button
                  onClick={handlePublishEvaluation}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Publish Evaluation
                </button>
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default GoalkeeperExercise;
