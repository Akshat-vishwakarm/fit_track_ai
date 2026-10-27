import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { allTools, executeTool, toMCPToolFormat } from '../tools/registry.js';
import type { UserContext } from '../types.js';

export function createMcpServer(user: UserContext) {
  const server = new Server(
    {
      name: 'fittrack-ai-mcp',
      version: '2.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // 1. Tool Listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map((tool) => toMCPToolFormat(tool)),
    };
  });

  // 2. Tool Execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await executeTool(name, args, user);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: err.message || 'Tool execution failed',
                tool: name,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  });

  // 3. Resources Listing
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'fittrack://agent-instructions',
          name: 'FitTrack AI Agent Instructions',
          description: 'System prompt and behavioral guidelines for ChatGPT when interacting with FitTrack AI.',
          mimeType: 'text/markdown',
        },
        {
          uri: 'fittrack://user-schema',
          name: 'FitTrack AI User Data Schema',
          description: 'Data model definitions for habits, workouts, nutrition, and progress.',
          mimeType: 'application/json',
        },
      ],
    };
  });

  // 4. Resource Read
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    if (uri === 'fittrack://agent-instructions') {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: `# FitTrack AI Assistant — Agent Guidelines

You are the user's dedicated AI Sports Scientist, Personal Trainer, and Sports Nutritionist, integrated directly with their live FitTrack AI web application.

## Core Behavioral Rules:
1. **Always retrieve live data**: Never assume or invent values for habits, workouts, or meals. Query the relevant tools (e.g. \`get_todays_workout\`, \`get_completed_tasks\`, \`get_daily_nutrition_totals\`) before answering questions.
2. **Combine holistic data**: When analyzing progress, correlate workout consistency, habit streaks, nutrition macros, and weight trends together.
3. **Identify gaps**: Explicitly highlight missed habits or incomplete workouts for today.
4. **Compare targets vs actuals**: Compare consumed calories and protein against their active targets.
5. **Suggest high-impact next actions**: Based on what remains incomplete today, advise on the best immediate action (e.g., remaining protein needed, today's pending workout).
6. **Confirm write operations**: When the user asks to mark a habit complete or log food, execute the appropriate tool and verify success.
`,
          },
        ],
      };
    }

    if (uri === 'fittrack://user-schema') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                platform: 'FitTrack AI',
                version: '2.0.0',
                entities: ['habits', 'habitCompletions', 'workoutPlans', 'workoutLogs', 'nutritionGoals', 'mealEntries', 'progressEntries', 'goals'],
              },
              null,
              2
            ),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });

  // 5. Prompts Listing
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'daily-fitness-checkin',
          description: 'Complete daily check-in analyzing completed habits, pending habits, workout schedule, and nutrition.',
        },
        {
          name: 'nutrition-audit',
          description: 'Audit today and weekly nutrition logs against calorie and protein targets.',
        },
        {
          name: 'workout-progression-critique',
          description: 'Audit the weekly training split, lifting volume, and exercise progressive overload.',
        },
      ],
    };
  });

  // 6. Prompts Get
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const promptName = request.params.name;
    if (promptName === 'daily-fitness-checkin') {
      return {
        description: 'Daily check-in for FitTrack AI',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Give me my full daily fitness check-in: what tasks/habits have I completed today, what is pending, what is my scheduled workout, and how are my calories and protein tracking against my goals?',
            },
          },
        ],
      };
    }
    if (promptName === 'nutrition-audit') {
      return {
        description: 'Nutrition audit',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Analyze all my nutrition logs against my daily calorie and protein targets. How is my meal quality, macro distribution, and adherence?',
            },
          },
        ],
      };
    }
    if (promptName === 'workout-progression-critique') {
      return {
        description: 'Workout progression critique',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Review my weekly training split and recent workout history. What is my total volume, are there any muscle group imbalances, and how should I progress weight/reps next?',
            },
          },
        ],
      };
    }

    throw new Error(`Prompt not found: ${promptName}`);
  });

  return server;
}
