
import React, { useState } from 'react';
import { 
  FolderIcon, 
  FileText, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Trash2,
  X,
  PlusCircle,
  Cloud,
  CloudOff,
  RefreshCw,
  Settings,
  LogOut,
  Info
} from 'lucide-react';
import { AppState, Note, Folder } from '../types';

interface SidebarProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  createNote: (folderId: string | null) => void;
  closeSidebar: () => void;
  connectDrive: () => void;
  logoutDrive: () => void;
  cloudStatus: 'disconnected' | 'connecting' | 'synced' | 'syncing';
}

const Sidebar: React.FC<SidebarProps> = ({ state, setState, createNote, closeSidebar, connectDrive, logoutDrive, cloudStatus }) => {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['f1']));
  const [isCloudSettingsOpen, setIsCloudSettingsOpen] = useState(false);

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

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4">
        <div className="space-y-1">
          {rootFolders.map(f => renderFolder(f))}
          {rootNotes.map(n => renderNote(n))}
        </div>
      </div>

      {/* Cloud Sync Section */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
        {isCloudSettingsOpen ? (
          <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-indigo-100 dark:border-indigo-900/30 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configuração Cloud</span>
              <button onClick={() => setIsCloudSettingsOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-gray-500 uppercase ml-1">Client ID do Desenvolvedor</label>
              <input 
                type="text"
                placeholder="Insira o Client ID OAuth..."
                value={state.googleClientId || ''}
                onChange={(e) => setState(prev => ({ ...prev, googleClientId: e.target.value }))}
                className="w-full text-[10px] bg-gray-50 dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-xl flex items-start space-x-2 border border-amber-100 dark:border-amber-900/30">
              <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[9px] text-amber-700 dark:text-amber-400 leading-tight">
                Se o login der erro <b>400</b>, certifique-se de que a URL deste site está na lista de "JavaScript Origins" no Google Cloud Console.
              </p>
            </div>

            <button 
              onClick={() => { setIsCloudSettingsOpen(false); connectDrive(); }}
              className="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              Salvar e Conectar
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            {cloudStatus === 'disconnected' ? (
              <button 
                onClick={connectDrive}
                className="flex-1 flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:shadow-lg transition-all group active:scale-[0.98]"
              >
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Cloud size={18} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Google Drive</span>
                  <span className="text-[9px] text-gray-400">Clique para conectar</span>
                </div>
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-between p-3 bg-green-50/50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500 text-white rounded-xl shadow-lg shadow-green-500/20">
                    {cloudStatus === 'syncing' || cloudStatus === 'connecting' ? <RefreshCw size={18} className="animate-spin" /> : <Cloud size={18} />}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Sincronizado</span>
                    <span className="text-[9px] text-green-600/60 dark:text-green-400/50">Google Drive Ativo</span>
                  </div>
                </div>
                <button onClick={logoutDrive} className="p-1.5 text-green-700 hover:text-red-500 transition-colors" title="Desconectar">
                  <LogOut size={16} />
                </button>
              </div>
            )}
            
            <button 
              onClick={() => setIsCloudSettingsOpen(true)}
              className="p-3 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 transition-all active:scale-95"
              title="Configurações Avançadas de Nuvem"
            >
              <Settings size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
