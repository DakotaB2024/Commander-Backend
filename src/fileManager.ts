import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';

const getWorkspacePath = () => process.env.WORKSPACE_DIR || path.resolve('.');

export const fileTools = {
  listFiles: async (relativePath: string = '.') => {
    try {
      const rootDir = getWorkspacePath();
      const targetDir = path.join(rootDir, relativePath);
      
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.relative(rootDir, path.join(targetDir, entry.name))
      }));
    } catch (error: any) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  },

  writeFile: async (filePath: string, content: string) => {
    try {
      const rootDir = getWorkspacePath();
      const fullPath = path.join(rootDir, filePath);
      
      // Ensure folder pathway exists natively before parsing output streams
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      return `Successfully saved file asset directly to: ${filePath}`;
    } catch (error: any) {
      throw new Error(`Failed to save file structural asset: ${error.message}`);
    }
  },

  readFile: async (filePath: string) => {
    try {
      const rootDir = getWorkspacePath();
      const fullPath = path.join(rootDir, filePath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to open text stream source trace: ${error.message}`);
    }
  }
};

export const executionTools = {
  executeCommand: (command: string): Promise<string> => {
    return new Promise((resolve) => {
      const workspacePath = getWorkspacePath();

      exec(command, { cwd: workspacePath }, (error, stdout, stderr) => {
        let output = '';
        if (stdout) output += stdout;
        if (stderr) output += `[STDERR] ${stderr}`;
        if (error) output += `\n[EXEC ERROR] ${error.message}`;
        
        resolve(output.trim() || 'Command executed with no output logs returning.');
      });
    });
  }
};
