// Prompt generation functions for MCP prompts
// Depends only on types - maintains dependency hierarchy

/**
 * Helper functions to generate prompt content for MCP prompts
 * Each function takes arguments and returns a formatted prompt string
 */

/**
 * Generate prompt content for creating development tasks
 * @param args Arguments containing description, projectName, and requirements
 * @returns Formatted prompt string for task creation
 */
export function generateTaskCreationPrompt(args: any): string {
  const { description, projectName = "default", requirements = "" } = args || {};
  
  return `I need help creating a structured development task using the Shrimp Task Manager Enhanced.

**Task Description:** ${description}
**Project:** ${projectName}
${requirements ? `**Requirements:** ${requirements}` : ""}

Please use the available task management tools to:
1. First analyze the task requirements using \`analyze_task\`
2. Plan the implementation using \`plan_task\` 
3. Break it down into subtasks using \`split_tasks\` if needed
4. Add the task to the project using \`add_task\`

Focus on creating clear, actionable tasks with proper dependencies, verification criteria, and implementation guidance.`;
}

/**
 * Generate prompt content for codebase analysis
 * @param args Arguments containing codebaseDescription, projectName, and focusArea
 * @returns Formatted prompt string for codebase analysis
 */
export function generateCodebaseAnalysisPrompt(args: any): string {
  const { codebaseDescription, projectName = "default", focusArea = "" } = args || {};
  
  return `I need to analyze a codebase and break it down into manageable development tasks.

**Codebase:** ${codebaseDescription}
**Project Context:** ${projectName}
${focusArea ? `**Focus Area:** ${focusArea}` : ""}

Please help me:
1. Use \`research_mode\` to systematically analyze the codebase structure
2. Identify the main components and their relationships
3. Use \`plan_task\` to create a development roadmap
4. Break down the work using \`split_tasks\` into specific, actionable tasks
5. Create tasks using \`add_task\` with proper dependencies

The goal is to transform this codebase analysis into a structured task workflow that guides systematic development.`;
}

/**
 * Generate prompt content for research planning
 * @param args Arguments containing topic, currentKnowledge, and goals
 * @returns Formatted prompt string for research planning
 */
export function generateResearchPlanPrompt(args: any): string {
  const { topic, currentKnowledge = "", goals = "" } = args || {};
  
  return `I need to create a systematic research plan for a technical topic.

**Research Topic:** ${topic}
${currentKnowledge ? `**Current Knowledge:** ${currentKnowledge}` : ""}
${goals ? `**Research Goals:** ${goals}` : ""}

Please help me:
1. Use \`research_mode\` to enter systematic research mode
2. Use \`process_thought\` to break down the research into logical phases
3. Create research tasks using \`plan_task\` and \`split_tasks\`
4. Set up a project structure using \`create_project\` if needed

The goal is to create a structured approach to learning about this topic with clear milestones and deliverables.`;
}

/**
 * Generate prompt content for workflow debugging
 * @param args Arguments containing projectName and issueDescription
 * @returns Formatted prompt string for workflow debugging
 */
export function generateWorkflowDebugPrompt(args: any): string {
  const { projectName = "default", issueDescription = "" } = args || {};
  
  return `I need help debugging and optimizing my task management workflow.

**Project:** ${projectName}
${issueDescription ? `**Issue:** ${issueDescription}` : ""}

Please help me:
1. Use \`list_tasks\` to review current tasks and their status
2. Use \`get_project_info\` to understand project structure
3. Identify workflow bottlenecks, dependency issues, or stuck tasks
4. Use \`process_thought\` to analyze the workflow systematically
5. Suggest improvements and optimizations

The goal is to improve productivity and task completion rates in this project.`;
}
