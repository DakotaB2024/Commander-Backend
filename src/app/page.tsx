'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface WorkspaceItem {
  name: string;
  isDirectory: boolean;
  path: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<WorkspaceItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Fetch true directory tree layout from backend
  const refreshFiles = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch(`${API_URL}/api/files`);
      const data = await res.json();
      if (Array.isArray(data)) setFiles(data);
    } catch (err) {
      console.error('Failed to sync workspace files:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    refreshFiles();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
        // Refresh sidebar tree if the agent potentially altered files
        refreshFiles();
      }
    } catch (error) {
      console.error('Failed to communicate with agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden">
      
      {/* SIDEBAR PANELS */}
      <aside className="hidden lg:flex w-64 border-r border-slate-800 flex-shrink-0">
        <div className="p-4 h-full w-full flex flex-col bg-slate-950 text-slate-400 font-mono text-sm select-none">
          <div className="font-semibold text-slate-200 uppercase tracking-wider text-xs mb-4 flex justify-between items-center">
            <span>📁 Workspace</span>
            <button onClick={refreshFiles} className="text-slate-500 hover:text-slate-300 text-xs">↻</button>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
            {files.map((file) => (
              <div 
                key={file.path} 
                className={`truncate text-xs ${file.isDirectory ? 'text-blue-400 font-semibold' : 'text-emerald-400'}`}
              >
                {file.isDirectory ? '📁' : '📄'} {file.name}
              </div>
            ))}
            {files.length === 0 && !isSyncing && (
              <div className="text-xs opacity-40 italic">Workspace Empty</div>
            )}
            {isSyncing && (
              <div className="opacity-50 text-xs animate-pulse">⏳ Syncing file system...</div>
            )}
          </div>
        </div>
      </aside>

      {/* CORE CHAT ENGINE INTERFACE */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-14 border-b border-slate-800 flex items-center px-6 bg-slate-900/50 backdrop-blur-md justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="font-mono font-bold tracking-tight text-sm">OpenClaw // Groq Core</h1>
          </div>
          <span className="text-xs font-mono text-slate-500 hidden sm:inline">Tailscale Secured</span>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-4xl w-full mx-auto">
          {messages.filter(m => m.role !== 'system').map((msg, index) => {
            if (msg.role === 'tool') {
              return (
                <div key={index} className="flex items-center space-x-2 font-mono text-xs bg-slate-950/60 text-slate-400 p-2.5 rounded-md border border-slate-800/80 w-fit">
                  <span className="text-amber-500 font-bold">[TOOL RESULT]</span>
                  <span className="truncate max-w-md md:max-w-xl">{msg.content}</span>
                </div>
              );
            }

            if (msg.tool_calls) {
              return msg.tool_calls.map((call) => (
                <div key={call.id} className="flex items-center space-x-2 font-mono text-xs bg-slate-950/40 text-cyan-400 p-2.5 rounded-md border border-slate-800/50 w-fit">
                  <span className="animate-pulse">⚡</span>
                  <span className="font-bold">Agent Action:</span>
                  <span className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-300">{call.function.name}</span>
                </div>
              ));
            }

            const isUser = msg.role === 'user';
            return (
              <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] md:max-w-[75%] rounded-xl px-4 py-3 text-sm md:text-base shadow-sm ${
                  isUser 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/50'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl rounded-bl-none px-4 py-3 text-sm text-slate-400 flex items-center space-x-2">
                <span className="font-mono text-xs animate-bounce">Processing Workspace...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-4 border-t border-slate-800 bg-slate-900/80">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 focus-within:border-slate-700 transition">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Groq to inspect, write, or alter workspace files..."
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-slate-100 hover:bg-white text-slate-950 font-medium text-xs font-mono uppercase tracking-wider px-4 py-2 rounded-lg disabled:opacity-30 disabled:hover:bg-slate-100 transition duration-150 h-9"
            >
              Send
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}
