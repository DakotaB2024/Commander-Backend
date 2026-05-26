// tools/write_file.ts
import fs from 'fs';
import path from 'path';

export async function run(args: { filePath: string, content: string }, config: any) {
  try {
    const fullPath = path.resolve(process.cwd(), args.filePath);
    // Ensure the directory exists
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, args.content, 'utf8');
    return `Successfully wrote to ${args.filePath}`;
  } catch (err) {
    return `Error writing file: ${err}`;
  }
}