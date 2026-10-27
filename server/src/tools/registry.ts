import { z } from 'zod';
import { dashboardTools } from './dashboardTools.js';
import { habitTools } from './habitTools.js';
import { nutritionTools } from './nutritionTools.js';
import { workoutTools } from './workoutTools.js';
import { progressTools } from './progressTools.js';
import { discoveryTools } from './discoveryTools.js';
import type { ToolDefinition, UserContext } from '../types.js';

export const allTools: ToolDefinition[] = [
  ...dashboardTools,
  ...habitTools,
  ...nutritionTools,
  ...workoutTools,
  ...progressTools,
  ...discoveryTools,
];

export const toolsMap = new Map<string, ToolDefinition>();
allTools.forEach((t) => toolsMap.set(t.name, t));

export function findTool(name: string): ToolDefinition | undefined {
  return toolsMap.get(name);
}

/**
 * Converts a ZodObject schema into standard JSON Schema for MCP and OpenAPI
 */
export function zodToJsonSchema(schema: z.ZodObject<any>): any {
  const shape = schema.shape;
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const prop = convertField(fieldSchema as z.ZodTypeAny);
    properties[key] = prop;

    // Check if required
    let isOptional = false;
    let s: any = fieldSchema;
    while (s) {
      if (s._def.typeName === 'ZodOptional' || s._def.typeName === 'ZodDefault') {
        isOptional = true;
        break;
      }
      s = s._def.innerType;
    }
    if (!isOptional) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

function convertField(field: z.ZodTypeAny): any {
  const def = (field as any)._def;
  const description = field.description;

  if (def.typeName === 'ZodOptional' || def.typeName === 'ZodDefault') {
    const inner = convertField(def.innerType);
    if (description) inner.description = description;
    return inner;
  }

  if (def.typeName === 'ZodString') {
    const res: any = { type: 'string' };
    if (description) res.description = description;
    return res;
  }

  if (def.typeName === 'ZodNumber') {
    const res: any = { type: 'number' };
    if (description) res.description = description;
    return res;
  }

  if (def.typeName === 'ZodBoolean') {
    const res: any = { type: 'boolean' };
    if (description) res.description = description;
    return res;
  }

  if (def.typeName === 'ZodEnum') {
    const res: any = { type: 'string', enum: def.values };
    if (description) res.description = description;
    return res;
  }

  if (def.typeName === 'ZodArray') {
    const res: any = {
      type: 'array',
      items: convertField(def.type),
    };
    if (description) res.description = description;
    return res;
  }

  if (def.typeName === 'ZodObject') {
    const res = zodToJsonSchema(field as z.ZodObject<any>);
    if (description) res.description = description;
    return res;
  }

  return { type: 'string', description };
}

export function toMCPToolFormat(tool: ToolDefinition) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.parameters),
  };
}

export async function executeTool(name: string, args: any, user: UserContext): Promise<any> {
  const tool = findTool(name);
  if (!tool) {
    throw new Error(`Tool '${name}' not found. Available tools: ${allTools.map((t) => t.name).join(', ')}`);
  }

  // Validate args with Zod schema
  const parseResult = tool.parameters.safeParse(args || {});
  if (!parseResult.success) {
    const issues = parseResult.error.issues
      .map((i: any) => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid arguments for tool '${name}': ${issues}`);
  }

  return await tool.execute(parseResult.data, user);
}
