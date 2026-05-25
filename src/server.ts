import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import { fileTools, executionTools } from './fileManager';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Definitions schema sent directly to guide Groq's engine responses
const agentToolsConfiguration: any[] = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'Lists files and directories inside the workspace.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Reads and displays raw text contents of a target workspace file layout.',
      parameters: {
        type: 'object',
        properties: { filePath: { type: 'string', description: 'Relative path of target file.' } },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Creates or completely overrides contents of a workspace file container directly.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Relative target path destination.' },
          content: { type: 'string', description: 'Full source string code contents.' }
        },
        required: ['filePath', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Executes a native terminal shell sequence securely inside the active runtime workspace environment workspace path directly.',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'Exact text system string execution shell command (e.g., python hello.py).' } },
        required: ['command']
      }
    }
  }
];

// File Synchronization Endpoint 
app.get('/api/files', async (req, res) => {
  try {
    const list = await fileTools.listFiles('.');
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sidebar Interactive Read File Link API Endpoint
app.get('/api/files/read', async (req, res) => {
  try {
    const target = req.query.path as string;
    if (!target) return res.status(400).json({ error: 'Missing parameter path target' });
    const fileSource = await fileTools.readFile(target);
    res.json({ contents: fileSource });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Unified Loop Orchestration Chat Agent Engine
app.post('/api/chat', async (req, res) => {
  try {
    let { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid payload execution trace array structure.' });
    }

    const systemPrompt = {
      role: 'system',
      content: 'You are OpenClaw, an autonomous workspace developer agent powered by Groq models. You can review structures, write code, or execute live runtime checks using tools.'
    };

    // Keep system context pinned neatly to first item array reference 
    if (messages[0]?.role !== 'system') {
      messages = [systemPrompt, ...messages];
    }

    // Direct invocation processing to Groq context engines
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      tools: agentToolsConfiguration,
      tool_choice: 'auto'
    });

    const responseMessage = response.choices[0].message;

    // Append standard parsing choices arrays back into rolling chat state
    messages.push(responseMessage);

    if (responseMessage.tool_calls) {
      for (const toolCall of responseMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult = '';

        try {
          switch (toolName) {
            case 'list_files':
              const files = await fileTools.listFiles('.');
              toolResult = JSON.stringify(files);
              break;
            case 'read_file':
              toolResult = await fileTools.readFile(args.filePath);
              break;
            case 'write_file':
              toolResult = await fileTools.writeFile(args.filePath, args.content);
              break;
            case 'execute_command':
              toolResult = await executionTools.executeCommand(args.command);
              break;
            default:
              toolResult = `Error: Tool selector named '${toolName}' does not exist inside backend configurations.`;
          }
        } catch (execErr: any) {
          toolResult = `Tool execution failure exception error: ${execErr.message}`;
        }

        // Return tool results to loop array sequence cleanly
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult
        });
      }

      // Final pass execution resolution to Groq so it speaks directly on the outputs
      const secondaryResponse = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: messages
      });
      
      messages.push(secondaryResponse.choices[0].message);
    }

    res.json({ messages });
  } catch (error: any) {
    console.error('Core Chat Loop Routing Failure Exception:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`[SERVER UP] OpenClaw backend core streaming on: http://localhost:${port}`);
});
