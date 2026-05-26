import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import PocketBase from 'pocketbase';
import { fileTools, executionTools } from './fileManager.ts';

dotenv.config();

// Path Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:3001', credentials: true }));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const pb = new PocketBase('http://127.0.0.1:8090');
pb.autoCancellation(false);

// POCKETBASE ADMIN AUTHENTICATION
async function authenticateAdmin() {
    try {
        const authData = await pb.admins.authWithPassword(
            process.env.PB_ADMIN_EMAIL!, 
            process.env.PB_ADMIN_PASSWORD!
        );
        console.log("[POCKETBASE] Admin authenticated successfully.");
        pb.authStore.save(authData.token, authData.admin);
    } catch (err: any) {
        console.error("Auth Error:", err.message);
    }
}

// ROBUST THREAD FETCHING
app.get('/api/threads', async (req, res, next) => {
    try {
        console.log("[DEBUG] Testing absolute minimal fetch...");
        
        // No sort, no pagination params
        const result = await pb.collection('threads').getFullList();

        res.json(result);
    } catch (err: any) {
        console.error("--- MINIMAL FETCH ERROR ---");
        console.error(err);
        next(err);
    }
});


// THREAD MANAGEMENT ENDPOINTS
app.post('/api/threads/create', async (req, res) => {
    const { title } = req.body; 
    try {
        const thread = await pb.collection('threads').create({ 
            title: title || "New Chat" 
        });
        res.json({ threadId: thread.id });
    } catch (err: any) { 
        console.error("Create Thread Error:", err);
        res.status(500).json({ error: err.message }); 
    }
});

// CHAT AND HELPER ENDPOINTS
app.get('/api/health', (req, res) => res.json({ status: "alive" }));

async function getDynamicTools() {
  const toolsDir = path.join(ROOT_DIR, 'tools');
  if (!fs.existsSync(toolsDir)) fs.mkdirSync(toolsDir);
  const toolFiles = fs.readdirSync(toolsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  return toolFiles.map(file => ({ 
      type: 'function', 
      function: { name: path.parse(file).name, description: `Executes ${path.parse(file).name}`, parameters: { type: 'object', properties: {} } } 
  }));
}

async function saveChatToPocketBase(threadId: string, userMessage: string, agentResponse: string) {
  try {
    await pb.collection('chat_history').create({
      thread_id: threadId,
      user_input: userMessage,
      agent_output: agentResponse,
      created: new Date().toISOString()
    });
  } catch (err) { console.error("PocketBase Save Error:", err); }
}

app.get('/api/messages', async (req, res) => {
    const { threadId } = req.query;
    console.log(`[DEBUG] Attempting to fetch for thread: ${threadId}`);

    try {
        // Use a very simple filter. If your schema field is 'thread_id', this works.
        const records = await pb.collection('chat_history').getList(1, 50, {
            filter: `thread_id = "${threadId}"`,
        });
        
        console.log(`[DEBUG] Found ${records.items.length} records.`);
        res.json(records.items);
    } catch (err: any) {
        // Log the full error from PocketBase
        console.error("--- POCKETBASE ERROR ---");
        console.error(JSON.stringify(err.originalError || err, null, 2));
        res.status(500).json({ error: "DB Query failed" });
    }
});


// server.ts
app.post('/api/chat', async (req, res) => {
    const { messages, threadId } = req.body;

    // 1. Send messages to your AI model
    const response = await aiClient.chat.completions.create({
        messages,
        tools: [...yourToolDefinitions], // Ensure these are defined
        tool_choice: "auto"
    });

    const aiMessage = response.choices[0].message;

    // 2. If the AI wants to use a tool:
    if (aiMessage.tool_calls) {
        // Execute your local file system function here...
        const toolResult = await executeTool(aiMessage.tool_calls[0]);
        
        // 3. Save the result back to your PocketBase chat_history
        await pb.collection('chat_history').create({
            thread_id: threadId,
            user_input: "TOOL_EXECUTION",
            agent_output: JSON.stringify(toolResult)
        });
        
        // Return the tool result to the frontend
        return res.json({ messages: [...messages, aiMessage, toolResult] });
    }
    
    // ... normal chat response
});


// STARTUP
await authenticateAdmin();
app.listen(port, () => console.log(`[SERVER UP] Backend ready on port ${port}`));

// ERROR HANDLING
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("--- FULL ERROR STACK ---");
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
});
