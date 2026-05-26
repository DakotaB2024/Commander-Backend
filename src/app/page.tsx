'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string; };
  }>;
}

interface WorkspaceItem { name: string; isDirectory: boolean; path: string; }

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<WorkspaceItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // --- INITIALIZATION ---
  useEffect(() => { refreshFiles(); fetchThreads(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // --- FINAL LOOP-PROOF EFFECT ---
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }

    const loadThreadMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/messages?threadId=${activeThreadId}`);
        const data = await res.json();
        
        // Ensure data is always an array
        const messagesData = Array.isArray(data) ? data : [];
        const formatted = messagesData.flatMap((m: any) => [
          { role: 'user', content: m.user_input },
          { role: 'assistant', content: m.agent_output }
        ]);
        setMessages(formatted);
      } catch (err) {
        console.error('Fetch failed:', err);
      }
    };

    loadThreadMessages();
  }, [activeThreadId]); // <--- Only runs when thread ID changes


  // --- DATA FETCHING ---
  const fetchThreads = async () => {
    try {
      const res = await fetch(`${API_URL}/api/threads`);
      const data = await res.json();
      setThreads(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Failed to fetch threads:', err); }
  };

  const refreshFiles = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch(`${API_URL}/api/files`);
      const data = await res.json();
      if (Array.isArray(data)) setFiles(data);
    } catch (err) { console.error('Failed to sync workspace files:', err); }
    finally { setIsSyncing(false); }
  };

  const createNewThread = async () => {
    const res = await fetch(`${API_URL}/api/threads/create`, { method: 'POST' });
    const { threadId } = await res.json();
    setActiveThreadId(threadId);
    setMessages([]);
    fetchThreads();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      const res = await fetch(`${API_URL}/api/threads/create`, { method: 'POST' });
      const data = await res.json();
      currentThreadId = data.threadId;
      setActiveThreadId(currentThreadId);
      fetchThreads();
    }

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, threadId: currentThreadId }),
      });
      const data = await response.json();
      if (data.messages) setMessages(data.messages);
      refreshFiles();
    } catch (error) { console.error(error); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-64 border-r border-slate-800 flex-col bg-slate-950">
        <div className="p-4 border-b border-slate-800">
           <button onClick={createNewThread} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono py-2 rounded transition">+ New Chat</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.map((t) => (
            <div key={t.id} onClick={() => setActiveThreadId(t.id)} className={`cursor-pointer p-2 rounded text-xs truncate ${activeThreadId === t.id ? 'bg-slate-800 text-white' : 'hover:bg-slate-900'}`}>
              {t.title || "Untitled Chat"}
            </div>
          ))}
        </div>
      </aside>

      {/* CHAT INTERFACE */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
           {messages.filter(m => m.role !== 'system').map((msg, index) => (
              <div key={index} className={`max-w-[85%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 ml-auto' : 'bg-slate-800'}`}>
               {msg.tool_calls ? (
                <div className="text-xs font-mono text-cyan-400">⚡ Action: {msg.tool_calls[0].function.name}...</div>
               ) : (
                 <p>{msg.content}</p>
               )}
              </div>
           ))}
           <div ref={chatEndRef} />
        </div>
        <footer className="p-4 border-t border-slate-800 bg-slate-900/80">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-slate-950 p-2 rounded border border-slate-800" placeholder="Ask OpenClaw..." />
            <button type="submit" className="bg-slate-100 text-slate-950 px-4 py-2 rounded">Send</button>
          </form>
        </footer>
      </main>
    </div>
  );
}
