import { z } from "zod";
import { getReflectTaskPrompt } from "../../prompts/index.js";

// Task reflection tool
export const reflectTaskSchema = z.object({
  summary: z
    .string()
    .min(10, {
      message: "Task summary cannot be less than 10 characters, please provide more detailed description to ensure task objectives are clear",
    })
    .describe("Structured task summary, maintain consistency with analysis phase to ensure continuity"),
  analysis: z
    .string()
    .min(100, {
      message: "Technical analysis content is not detailed enough, please provide complete technical analysis and implementation plan",
    })
    .describe(
      "Complete and detailed technical analysis results, including all technical details, dependency components and implementation plans, if code needs to be provided use pseudocode format and only provide high-level logic flow and key steps avoiding complete code"
    ),
  projectName: z
    .string()
    .describe("Project name or ID for task reflection context. Must specify a valid project name or ID."),
});

export async function reflectTask({
  summary,
  analysis,
  projectName,
}: z.infer<typeof reflectTaskSchema>) {
  // Always use the provided project name for context
  const projectContext = `project "${projectName}"`;
  
  
  // Use prompt generator to get final prompt
  const prompt = getReflectTaskPrompt({
    summary,
    analysis,
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
