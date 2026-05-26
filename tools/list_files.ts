import fs from 'fs';
import path from 'path';

export async function run(args: any, config: any) {
  try {
    // Get list of files in the current working directory
    const files = fs.readdirSync(process.cwd());
    // Return a clean string for the LLM to read
    return files.join(", ");
  } catch (err) {
    return "Error reading directory: " + err;
  }
}