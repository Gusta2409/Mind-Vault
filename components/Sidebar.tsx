
import React, { useState } from 'react';
import { 
  FolderIcon, 
  FileText, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Trash2,
  X,
  PlusCircle
} from 'lucide-react';
import { AppState, Note, Folder } from '../types';

interface SidebarProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  createNote: (folderId: string | null) => void;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ state, setState, createNote, closeSidebar }) => {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['f1']));

  const toggleFolder = (id: string) => {
    const next = new Set(openFolders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenFolders(next);
  };

  const createFolder = (parentId: string | null = null) => {
    const name = prompt('Nome da pasta:');
    if (!name) return;
    const newFolder: Folder = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      parentId
    };
    setState(prev => ({ ...prev, folders: [...prev.folders, newFolder] }));
  };

  const deleteFolder = (id: string) => {
    if (!confirm('Tem certeza? Isso excluirá apenas a pasta (as notas serão movidas para a raiz).')) return;
    setState(prev => ({
      ...prev,
      folders: prev.folders.filter(f => f.id !== id),
      notes: prev.notes.map(n => n.folderId === id ? { ...n, folderId: null } : n)
    }));
  };

  const renderFolder = (folder: Folder, depth: number = 0) => {
    const isOpen = openFolders.has(folder.id);
    const childFolders = state.folders.filter(f => f.parentId === folder.id);
    const childNotes = state.notes.filter(n => n.folderId === folder.id);

    return (
      <div key={folder.id} className="mt-1">
        <div 
          className="flex items-center justify-between group px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl cursor-pointer transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => toggleFolder(folder.id)}
        >
          <div className="flex items-center space-x-2 truncate">
            {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
            <FolderIcon size={18} className="text-indigo-500/80" />
            <span className="text-sm font-semibold truncate text-gray-700 dark:text-gray-300">{folder.name}</span>
          </div>
          <div className="flex md:hidden group-hover:flex items-center space-x-1">
            <button onClick={(e) => { e.stopPropagation(); createNote(folder.id); }} className="p-1.5 hover:text-indigo-600 dark:hover:text-indigo-400" title="Nova Nota"><Plus size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }} className="p-1.5 hover:text-red-500" title="Excluir Pasta"><Trash2 size={14} /></button>
          </div>
        </div>

        {isOpen && (
          <div className="animate-in fade-in slide-in-from-left-1 duration-200">
            {childFolders.map(f => renderFolder(f, depth + 1))}
            {childNotes.map(n => renderNote(n, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderNote = (note: Note, depth: number = 0) => {
    const isActive = state.currentNoteId === note.id;
    return (
      <div 
        key={note.id}
        className={`
          flex items-center justify-between group px-3 py-2 mt-0.5 rounded-xl cursor-pointer transition-all
          ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'}
        `}
        style={{ paddingLeft: `${depth * 12 + 28}px` }}
        onClick={() => setState(prev => ({ ...prev, currentNoteId: note.id, viewMode: 'editor' }))}
      >
        <div className="flex items-center space-x-3 truncate">
          <FileText size={16} className={isActive ? 'text-indigo-500' : 'text-gray-400'} />
          <span className="text-sm font-medium truncate">{note.title || 'Sem título'}</span>
        </div>
      </div>
    );
  };

  const rootFolders = state.folders.filter(f => f.parentId === null);
  const rootNotes = state.notes.filter(n => n.folderId === null);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d1117] overflow-hidden">
      <div className="flex items-center justify-between p-4 mb-2">
        <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em]">Cofre de Notas</h2>
        <div className="flex items-center space-x-1">
          <button onClick={() => createFolder()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 transition-colors" title="Nova Pasta">
            <FolderIcon size={18} />
          </button>
          <button onClick={() => createNote(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 transition-colors" title="Nova Nota">
            <PlusCircle size={18} />
          </button>
          <button onClick={closeSidebar} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-8">
        <div className="space-y-1">
          {rootFolders.length === 0 && rootNotes.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-xs text-gray-400 font-medium italic">Seu cofre está vazio...</p>
            </div>
          )}
          {rootFolders.map(f => renderFolder(f))}
          {rootNotes.map(n => renderNote(n))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
