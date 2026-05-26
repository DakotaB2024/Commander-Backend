import fs from 'fs';
import path from 'path';

export async function run(args: { query: string, directory?: string }, config: any) {
  try {
    const rootDir = path.resolve(process.cwd(), args.directory || '.');
    const results: string[] = [];

    function search(currentPath: string) {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        // Ignore node_modules and hidden folders for performance
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            search(fullPath);
          }
        } else if (entry.isFile()) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes(args.query)) {
            results.push(fullPath.replace(process.cwd(), ''));
          }
        }
      }
    }

    search(rootDir);
    return results.length > 0 ? results.join('\n') : "No matches found.";
  } catch (err) {
    return `Error searching workspace: ${err}`;
  }
}