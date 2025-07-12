import { z } from "zod";
import { getAnalyzeTaskPrompt } from "../../prompts/index.js";

// Task analysis tool
export const analyzeTaskSchema = z.object({
  summary: z
    .string()
    .min(10, {
      message: "Task summary cannot be less than 10 characters, please provide more detailed description to ensure task objectives are clear",
    })
    .describe(
      "Structured task summary, including task objectives, scope and key technical challenges, minimum 10 characters"
    ),
  initialConcept: z
    .string()
    .min(50, {
      message:
        "Initial concept cannot be less than 50 characters, please provide more detailed content to ensure technical solution is clear",
    })
    .describe(
      "Minimum 50 characters initial solution concept, including technical solution, architecture design and implementation strategy, if code needs to be provided use pseudocode format and only provide high-level logic flow and key steps avoiding complete code"
    ),
  previousAnalysis: z
    .string()
    .optional()
    .describe("Previous iteration analysis results, used for continuous solution improvement (only provide when re-analyzing)"),
  projectName: z
    .string()
    .describe("Project name or ID for task analysis context. Must specify a valid project name or ID."),
});

export async function analyzeTask({
  summary,
  initialConcept,
  previousAnalysis,
  projectName,
}: z.infer<typeof analyzeTaskSchema>) {
  let projectContext = "current project";
  
  if (projectName) {
    projectContext = `project "${projectName}"`;
  }
  
  // Use prompt generator to get final prompt
  const prompt = getAnalyzeTaskPrompt({
    summary,
    initialConcept,
    previousAnalysis,
    projectContext,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: prompt,
      },
    ],
  };
}
