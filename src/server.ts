import dotenv from 'dotenv';
dotenv.config(); // Must be called first!

import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import PocketBase from 'pocketbase';
import { fileTools, executionTools } from './fileManager';

const app = express();
const port = process.env.PORT || 5000;

// 1. Configure CORS to allow your frontend
app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// 2. Initialize Clients
if (!process.env.GROQ_API_KEY) {
  console.error("CRITICAL: GROQ_API_KEY is missing from environment!");
} else {
  console.log("API Key loaded successfully.");
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const pb = new PocketBase('http://127.0.0.1:8090');

// 3. Helper to save to PocketBase
async function saveChatToPocketBase(userMessage: string, agentResponse: string) {
  try {
    await pb.collection('chat_history').create({
      user_input: userMessage,
      agent_output: agentResponse,
      created: new Date().toISOString()
    });
  } catch (err) {
    console.error("PocketBase Save Error:", err);
  }
}

// 4. Tools Configuration
const agentToolsConfiguration: any[] = [
  { type: 'function', function: { name: 'list_files', description: 'Lists files in workspace.', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'read_file', description: 'Reads file contents.', parameters: { type: 'object', properties: { filePath: { type: 'string' } }, required: ['filePath'] } } },
  { type: 'function', function: { name: 'write_file', description: 'Writes file.', parameters: { type: 'object', properties: { filePath: { type: 'string' }, content: { type: 'string' } }, required: ['filePath', 'content'] } } },
  { type: 'function', function: { name: 'execute_command', description: 'Runs terminal commands.', parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } } }
];

// 5. Routes
app.get('/api/files', async (req, res) => {
  try {
    const files = await fileTools.listFiles();
    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      tools: agentToolsConfiguration,
      tool_choice: 'auto'
    });

    const responseMessage = response.choices[0].message;
    messages.push(responseMessage);

    if (responseMessage.tool_calls) {
      for (const toolCall of responseMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult = '';

        try {
          switch (toolName) {
            case 'list_files': toolResult = JSON.stringify(await fileTools.listFiles()); break;
            case 'read_file': toolResult = await fileTools.readFile(args.filePath); break;
            case 'write_file': toolResult = await fileTools.writeFile(args.filePath, args.content); break;
            case 'execute_command': toolResult = await executionTools.executeCommand(args.command); break;
          }
        } catch (execErr: any) { toolResult = `Error: ${execErr.message}`; }

        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult });
      }

      const secondaryResponse = await groq.chat.completions.create({ model: 'llama-3.3-70b-versatile', messages: messages });
      const finalReply = secondaryResponse.choices[0].message;
      messages.push(finalReply);
      
      // Save the chat to your 16TB drive via PocketBase
      await saveChatToPocketBase(messages[messages.length - 3]?.content || "Init", finalReply.content || "");
    }

    res.json({ messages });
  } catch (error: any) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => console.log(`[SERVER UP] Backend ready on port ${port}`));
