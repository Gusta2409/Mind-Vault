
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FolderIcon, 
  FileText, 
  Share2, 
  Layout, 
  Search,
  Moon,
  Sun,
  Menu,
  Zap,
  PenTool,
  X,
  Cloud,
  CloudOff,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { Note, Folder, ViewMode, AppState } from './types';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import GraphView from './components/GraphView';
import CanvasView from './components/CanvasView';
import BlackboardView from './components/BlackboardView';
import { GoogleDriveService } from './services/googleDrive';

const Logo = () => (
  <div className="relative w-9 h-9 md:w-10 md:h-10 shrink-0 overflow-hidden rounded-xl shadow-lg shadow-indigo-500/20 bg-gradient-to-br from-[#8a3391] via-[#5b32a3] to-[#2d3a8c] flex items-center justify-center">
    <svg viewBox="0 0 100 100" className="w-7 h-7 md:w-8 md:h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M50 85C35 85 22 75 18 62C12 60 8 54 8 47C8 38 15 31 23 31C23 20 32 12 43 12C48 12 52 14 55 17C58 14 62 12 67 12C78 12 87 20 87 31C95 31 102 38 102 47C102 54 98 60 92 62C88 75 75 85 60 85H50Z" 
        stroke="white" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="opacity-90"
      />
      <circle cx="50" cy="48" r="16" fill="#3a2a7a" stroke="white" strokeWidth="2" />
      <path 
        d="M50 40C48.3431 40 47 41.3431 47 43C47 44.2536 47.7712 45.3268 48.865 45.7535L46.5 53H53.5L51.135 45.7535C52.2288 45.3268 53 44.2536 53 43C53 41.3431 51.6569 40 50 40Z" 
        fill="#FFD700"
      />
    </svg>
  </div>
);

const initialNotes: Note[] = [
  { id: '1', title: 'Bem-vindo ao Mind Vault', content: '<div><h1>Bem-vindo ao Mind Vault</h1><p>Este é o seu sistema de notas inteligente com suporte a <b>Rich Text</b>. Comece criando uma nota ou explorando o Canvas!</p></div>', folderId: null, tags: ['tutorial'], attachments: [], updatedAt: Date.now() },
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('nexus-state');
    if (saved) return JSON.parse(saved);
    return {
      notes: initialNotes,
      folders: [{ id: 'f1', name: 'Projetos', parentId: null }],
      currentNoteId: '1',
      viewMode: 'editor',
      theme: 'dark',
      canvasElements: [],
      canvasEdges: []
    };
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connecting' | 'synced' | 'syncing'>('disconnected');

  const syncWithDrive = useCallback(async (data: AppState) => {
    if (cloudStatus !== 'synced') return;
    setCloudStatus('syncing');
    try {
      const folderId = await GoogleDriveService.findOrCreateFolder('Mind Vault');
      await GoogleDriveService.saveFile(folderId, 'vault_data.json', data);
      setCloudStatus('synced');
    } catch (err) {
      console.error('Drive Sync Error:', err);
      // Mantém status sincronizado para tentar novamente no próximo intervalo
      setCloudStatus('synced');
    }
  }, [cloudStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (cloudStatus === 'synced') syncWithDrive(state);
    }, 5000); 
    return () => clearTimeout(timer);
  }, [state, cloudStatus, syncWithDrive]);

  const connectToDrive = async () => {
    // Se não houver Client ID configurado (DEFAULT_CLIENT_ID), pede ao administrador/usuário.
    // Em produção, você deixaria o DEFAULT_CLIENT_ID preenchido no service.
    let clientId = state.googleClientId || GoogleDriveService.DEFAULT_CLIENT_ID;
    
    if (!clientId) {
      clientId = prompt("Admin: Insira o Google Client ID da sua aplicação Web:") || "";
      if (clientId) {
        setState(prev => ({ ...prev, googleClientId: clientId }));
      } else {
        return;
      }
    }

    setCloudStatus('connecting');
    try {
      await GoogleDriveService.init(clientId);
      const authed = await GoogleDriveService.authenticate();
      if (authed) {
        const folderId = await GoogleDriveService.findOrCreateFolder('Mind Vault');
        const remoteData = await GoogleDriveService.readFile(folderId, 'vault_data.json');
        if (remoteData) {
          if (confirm("Dados encontrados no seu Google Drive. Deseja carregar agora?\n(Isso substituirá suas notas locais por esta versão da nuvem)")) {
            setState(remoteData);
          }
        }
        setCloudStatus('synced');
      } else {
        setCloudStatus('disconnected');
        alert("Autenticação cancelada ou falhou.");
      }
    } catch (err: any) {
      console.error("Connection error:", err);
      alert("Erro crítico na conexão: " + err.message + "\n\nVerifique se o Client ID está correto e se o domínio atual está autorizado no Google Cloud Console.");
      setCloudStatus('disconnected');
    }
  };

  const logoutDrive = async () => {
    await GoogleDriveService.logout();
    setCloudStatus('disconnected');
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('nexus-state', JSON.stringify(state));
  }, [state]);

  const toggleTheme = () => {
    setState(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  };

  const createNote = (folderId: string | null = null) => {
    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Nova Nota',
      content: '<div>Escreva algo aqui...</div>',
      folderId,
      tags: [],
      attachments: [],
      updatedAt: Date.now()
    };
    setState(prev => ({
      ...prev,
      notes: [...prev.notes, newNote],
      currentNoteId: newNote.id,
      viewMode: 'editor'
    }));
  };

  const activeNote = state.notes.find(n => n.id === state.currentNoteId);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-300 relative">
      <div className={`
        fixed md:relative inset-y-0 left-0 z-[1000]
        ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0'} 
        transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0d1117] shadow-2xl md:shadow-none
      `}>
        {isSidebarOpen && (
          <Sidebar 
            state={state} 
            setState={setState} 
            createNote={createNote}
            closeSidebar={() => setIsSidebarOpen(false)}
            connectDrive={connectToDrive}
            logoutDrive={logoutDrive}
            cloudStatus={cloudStatus}
          />
        )}
      </div>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-[900] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="flex flex-col md:flex-row md:h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0d1117] z-30">
          <div className="flex items-center justify-between px-4 py-3 md:py-0 md:px-6">
            <div className="flex items-center space-x-3">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="flex items-center space-x-3">
                <Logo />
                <span className="font-bold text-base md:text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">Mind Vault</span>
                
                <button 
                  onClick={toggleTheme}
                  className="ml-1 p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  {state.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                </button>
              </div>
            </div>
            
            {cloudStatus !== 'disconnected' && (
              <div className="md:hidden flex items-center space-x-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-[10px] font-bold">
                {cloudStatus === 'syncing' || cloudStatus === 'connecting' ? <RefreshCw size={10} className="animate-spin" /> : <Cloud size={10} />}
                <span>{cloudStatus === 'syncing' ? 'Salvando' : cloudStatus === 'connecting' ? 'Conectando' : 'Nuvem OK'}</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center px-4 pb-3 md:pb-0 md:px-4 overflow-x-auto no-scrollbar">
            <nav className="flex items-center bg-gray-100 dark:bg-gray-800/50 p-1 md:p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 w-full md:w-auto">
              {[
                { id: 'editor', label: 'Editor', icon: <FileText size={14} /> },
                { id: 'graph', label: 'Grafo', icon: <Share2 size={14} /> },
                { id: 'canvas', label: 'Canvas', icon: <Layout size={14} /> },
                { id: 'blackboard', label: 'Quadro', icon: <PenTool size={14} /> }
              ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setState(p => ({...p, viewMode: item.id as ViewMode}))}
                  className={`flex items-center justify-center space-x-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[11px] md:text-xs font-bold transition-all flex-1 md:flex-none whitespace-nowrap ${state.viewMode === item.id ? 'bg-white dark:bg-gray-700 shadow-md text-indigo-600 dark:text-indigo-400 scale-[1.02]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  {item.icon} <span className="hidden xs:inline">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center space-x-4 px-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Busca rápida..."
                className="bg-gray-100 dark:bg-gray-800/80 text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-40 lg:w-48 border border-transparent focus:border-indigo-500/50 transition-all"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {state.viewMode === 'editor' && activeNote && (
            <Editor 
              note={activeNote} 
              allNotes={state.notes}
              onNavigate={(id) => setState(prev => ({...prev, currentNoteId: id}))}
              onUpdate={(u) => setState(prev => ({...prev, notes: prev.notes.map(n => n.id === activeNote.id ? {...n, ...u, updatedAt: Date.now()} : n)}))} 
              onDelete={() => setState(p => ({...p, notes: p.notes.filter(n => n.id !== activeNote.id), currentNoteId: p.notes[0]?.id || null}))}
            />
          )}
          {state.viewMode === 'graph' && <GraphView notes={state.notes} onNoteClick={(id) => setState(p => ({...p, currentNoteId: id, viewMode: 'editor'}))} />}
          {state.viewMode === 'canvas' && <CanvasView state={state} setState={setState} />}
          {state.viewMode === 'blackboard' && <BlackboardView theme={state.theme} />}
          {!activeNote && state.viewMode === 'editor' && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40 p-6 text-center">
              <Logo />
              <p className="text-sm font-medium">Nenhuma nota selecionada</p>
              <button onClick={() => createNote()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg">Criar Primeira Nota</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
