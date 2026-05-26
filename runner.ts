import { pathToFileURL } from 'url';
import path from 'path';

async function runTool(toolName: string) {
  try {
    // Construct the absolute path
    const toolFilePath = path.resolve(process.cwd(), 'tools', `${toolName}.ts`);
    
    // Convert to a file URL, which is the only reliable way to import local files in ESM
    const fileUrl = pathToFileURL(toolFilePath).href;
    
    console.log(`Executing ${toolName} from: ${toolFilePath}...`);

    // Dynamic import
    const toolModule = await import(fileUrl);

    // Run the function
    const result = await toolModule.run({}, {});
    console.log("Result:", result);
  } catch (err) {
    console.error(`Failed to run ${toolName}:`, err);
    process.exit(1); // Force exit on failure so the agent knows it failed
  }
}

const tool = process.argv[2];
if (tool) {
  runTool(tool);
} else {
  console.log("Please provide a tool name.");
}