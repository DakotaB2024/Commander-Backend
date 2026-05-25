// src/tools.ts
import { fileTools } from './fileManager';

export const groqToolsDefinition = [
  {
    type: "function" as const,
    function: {
      name: "list_files",
      description: "List files and directories in a given relative path inside the workspace.",
      parameters: {
        type: "object",
        properties: {
          dirPath: { type: "string", description: "Relative directory path (defaults to '.')" }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "Read the exact text contents of a file inside the workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path to the file" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description: "Write or overwrite contents into a specified file inside the workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path to the file" },
          content: { type: "string", description: "Full string content to write to the file" }
        },
        required: ["path", "content"]
      }
    }
  }
];

// Router to map Groq tool responses back to our actual file managers
export async function executeTool(name: string, args: any) {
  switch (name) {
    case 'list_files':
      return JSON.stringify(await fileTools.listFiles(args.dirPath));
    case 'read_file':
      return await fileTools.readFile(args.path);
    case 'write_file':
      return await fileTools.writeFile(args.path, args.content);
    default:
      throw new Error(`Tool ${name} not found.`);
  }
}
