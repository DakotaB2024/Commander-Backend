// tools/read_file.ts
import fs from 'fs';
import path from 'path';

export async function run(args: { filePath: string }, config: any) {
  try {
    const fullPath = path.resolve(process.cwd(), args.filePath);
    return fs.readFileSync(fullPath, 'utf8');
  } catch (err) {
    return `Error reading file: ${err}`;
  }
}
}
}