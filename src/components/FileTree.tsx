// src/components/FileTree.tsx
export default function FileTree() {
  return (
    <div className="p-4 h-full flex flex-col bg-slate-950 text-slate-400 font-mono text-sm select-none">
      <div className="font-semibold text-slate-200 uppercase tracking-wider text-xs mb-4">
        📁 Workspace Workspace
      </div>
      <div className="space-y-2">
        <div className="text-emerald-400">📄 hello.py</div>
        <div className="opacity-50 hover:opacity-100 cursor-pointer">⏳ Fetching more files...</div>
      </div>
    </div>
  );
}
