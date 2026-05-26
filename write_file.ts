import fs from 'fs';
import path from 'path';

export async function run(args: any, config: any) {
  try {
    // Defensive extraction: check different possible ways the LLM might send the path
    const filePath = args.filePath || args.path || args[0];
    const content = args.content || args[1] || "";

    if (!filePath) {
      return "ERROR: Missing 'filePath' argument.";
    }

    // Resolve the path safely
    const fullPath = path.resolve(process.cwd(), filePath);
    
    // Create the directory if it doesn't exist
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    return `SUCCESS: File written to ${filePath}`;
  } catch (err: any) {
    // IMPORTANT: Return the error as a string to the LLM
    // Do NOT throw it, or your server will crash!
    return `TOOL_FAILURE: ${err.message || String(err)}`;
  }
}