import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const command = 'npx tsx src/server.ts';

exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) console.error(`Error: ${error.message}`);
    if (stderr) console.error(`Stderr: ${stderr}`);
    console.log(stdout);
});
