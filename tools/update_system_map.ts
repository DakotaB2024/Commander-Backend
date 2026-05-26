import * as fs from 'fs';

function list_files(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    fs.readdir('.', (err, files) => {
      if (err) {
        reject(err);
      } else {
        const fileInfos = files.map((file) => {
          return {
            name: file,
            description: 'No description available'
          };
        });
        resolve(fileInfos);
      }
    });
  });
}

function write_file({ content, filePath }: { content: string, filePath: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, content, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export const definition = { type: 'function', function: { name: 'update_system_map', description: 'Updates the system map with the latest file structure information', parameters: { type: 'object', properties: {} } } }; export async function run(args: any, context: any) { const files = await list_files(); const fileDescriptions = {}; files.forEach(file => { fileDescriptions[file.name] = file.description; }); const systemMapContent = Object.keys(fileDescriptions).map(file => `${file}: ${fileDescriptions[file]}`).join('\n'); await write_file({ content: systemMapContent, filePath: 'system_map.txt' }); return 'System map updated successfully'; }