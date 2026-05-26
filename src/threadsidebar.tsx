import { useState, useEffect } from 'react';

export default function ThreadSidebar({ onSelectThread }) {
  const [threads, setThreads] = useState([]);

  const fetchThreads = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/threads');
      const data = await res.json();
      setThreads(data);
    } catch (err) {
      console.error("Failed to load threads:", err);
    }
  };

  const createNewThread = async () => {
    // Generate a unique title based on current time
    const defaultTitle = `Chat ${new Date().toLocaleTimeString()}`;
    
    try {
      const res = await fetch('http://localhost:5000/api/threads/create', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: defaultTitle })
      });
      const { threadId } = await res.json();
      
      onSelectThread(threadId);
      fetchThreads(); // Refresh the list
    } catch (err) {
      console.error("Failed to create thread:", err);
    }
  };

  useEffect(() => { 
    fetchThreads(); 
  }, []);

  return (
    <div className="w-64 bg-gray-900 p-4 h-screen overflow-y-auto">
      <button 
        onClick={createNewThread} 
        className="w-full bg-blue-600 p-2 rounded text-white mb-4 hover:bg-blue-700 transition"
      >
        + New Chat
      </button>
      
      <div className="space-y-2">
        {threads.map(t => (
          <div 
            key={t.id} 
            onClick={() => onSelectThread(t.id)} 
            className="text-gray-300 p-2 cursor-pointer hover:bg-gray-800 rounded transition truncate"
          >
            {t.title || "Untitled Chat"}
          </div>
        ))}
      </div>
    </div>
  );
}
