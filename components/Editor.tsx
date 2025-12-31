
import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, 
  Clock, 
  Sparkles, 
  Loader2, 
  Bold, 
  Italic, 
  Underline, 
  FileSearch, 
  Search, 
  FileText,
  Palette,
  Type,
  ChevronDown
} from 'lucide-react';
import { Note } from '../types';
import { GoogleGenAI } from "@google/genai";

interface EditorProps {
  note: Note;
  allNotes: Note[];
  onUpdate: (updates: Partial<Note>) => void;
  onDelete: () => void;
  onNavigate: (id: string) => void;
}

const Editor: React.FC<EditorProps> = ({ note, allNotes, onUpdate, onDelete, onNavigate }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const lastRangeRef = useRef<Range | null>(null);
  const [title, setTitle] = useState(note.title);
  const [isLinkMenuOpen, setIsLinkMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");

  const textColors = [
    { name: 'Padrão', color: 'inherit' },
    { name: 'Indigo', color: '#6366f1' },
    { name: 'Esmeralda', color: '#10b981' },
    { name: 'Rosa', color: '#f472b6' },
    { name: 'Âmbar', color: '#f59e0b' },
    { name: 'Vermelho', color: '#ef4444' },
    { name: 'Céu', color: '#0ea5e9' },
  ];

  const fontSizes = [
    { label: 'Pequeno', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Médio', value: '4' },
    { label: 'Grande', value: '5' },
    { label: 'Extra G', value: '6' },
  ];

  useEffect(() => {
    setTitle(note.title);
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content;
    }
    lastRangeRef.current = null;
  }, [note.id]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        lastRangeRef.current = range.cloneRange();
      }
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (!sel) return;

    if (lastRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(lastRangeRef.current);
    } else {
      editorRef.current?.focus();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current!);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const internalLink = target.closest('[data-note-link]');
      if (internalLink) {
        e.preventDefault();
        e.stopPropagation();
        const noteId = internalLink.getAttribute('data-note-link');
        if (noteId) onNavigate(noteId);
      }
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('click', handleClick);
      return () => editor.removeEventListener('click', handleClick);
    }
  }, [onNavigate]);

  const handleBlur = () => {
    const content = editorRef.current?.innerHTML || "";
    if (content !== note.content || title !== note.title) {
      onUpdate({ content, title });
    }
  };

  const execCommand = (command: string, value: string = "") => {
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
    handleBlur();
  };

  const insertInternalLink = (linkedNote: Note) => {
    restoreSelection();
    
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('data-note-link', linkedNote.id);
    link.className = "text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-1.5 py-0.5 rounded transition-all cursor-pointer inline-block align-baseline whitespace-nowrap border border-indigo-200/50 dark:border-indigo-800/30 mx-0.5 leading-none shadow-sm";
    link.setAttribute('contenteditable', 'false');
    link.innerHTML = `🔗 ${linkedNote.title}`;

    insertNodeAtCursor(link);
    
    setIsLinkMenuOpen(false);
    setLinkSearch("");
    setTimeout(handleBlur, 10);
  };

  const insertNodeAtCursor = (node: Node) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(node);
      
      const space = document.createTextNode('\u00A0');
      node.parentNode?.insertBefore(space, node.nextSibling);
      
      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      lastRangeRef.current = newRange.cloneRange();
    }
  };

  const askAiForHelp = async () => {
    if (!process.env.API_KEY) {
      alert("Recurso AI requer uma API Key configurada.");
      return;
    }
    
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentText = editorRef.current?.innerText || "";
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Você é um assistente de escrita. Com base no título "${title}" e conteúdo "${currentText}", forneça 3 pontos para melhorar ou expandir esta nota. Saída APENAS em formato HTML (<ul><li>...).`,
        config: {
          systemInstruction: "Você é um assistente profissional de pesquisa. Ajude o usuário a melhorar suas notas com fatos relevantes e sugestões estruturais."
        }
      });
      
      const aiText = response.text;
      if (aiText && editorRef.current) {
        editorRef.current.innerHTML += "<br><hr class='my-8 border-gray-100 dark:border-white/5'><br><h3>✨ Sugestões da IA:</h3>" + aiText;
        handleBlur();
      }
    } catch (err) {
      console.error("AI Assistant Error:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredNotes = allNotes
    .filter(n => n.id !== note.id)
    .filter(n => n.title.toLowerCase().includes(linkSearch.toLowerCase()))
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0d1117] relative">
      {/* TOOLBAR COM Z-INDEX CONTROLADO PARA NÃO SOBREPOR SIDEBAR */}
      <div className="flex flex-col border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0d1117] z-20 relative">
        <div className="flex items-center justify-between px-4 md:px-6 py-2 md:py-3">
          <div className="flex items-center space-x-4 text-[10px] md:text-xs text-gray-400">
            <div className="flex items-center space-x-1">
              <Clock size={12} />
              <span>{new Date(note.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={askAiForHelp}
              disabled={isAiLoading}
              className="flex items-center space-x-2 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
            >
              {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              <span className="hidden xs:inline">Assistente AI</span>
            </button>
            <button 
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-1 px-4 md:px-6 pb-2 md:pb-3 relative overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-0.5">
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 transition-colors" title="Negrito">
              <Bold size={16} />
            </button>
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 transition-colors" title="Itálico">
              <Italic size={16} />
            </button>
            <button onMouseDown={(e) => { e.preventDefault(); execCommand('underline'); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 transition-colors" title="Sublinhado">
              <Underline size={16} />
            </button>
          </div>
          
          <div className="w-px h-6 bg-gray-100 dark:bg-gray-800 mx-1" />

          {/* Seletor de Tamanho */}
          <div className="relative">
            <button 
              onMouseDown={(e) => { e.preventDefault(); saveSelection(); setIsSizeMenuOpen(!isSizeMenuOpen); setIsColorMenuOpen(false); setIsLinkMenuOpen(false); }}
              className={`flex items-center space-x-1 p-2 rounded-xl transition-colors ${isSizeMenuOpen ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
              title="Tamanho da Fonte"
            >
              <Type size={16} />
              <ChevronDown size={10} />
            </button>
            {isSizeMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-[100] p-1.5 animate-in fade-in slide-in-from-top-1">
                {fontSizes.map((sz) => (
                  <button
                    key={sz.value}
                    onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', sz.value); setIsSizeMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seletor de Cor */}
          <div className="relative">
            <button 
              onMouseDown={(e) => { e.preventDefault(); saveSelection(); setIsColorMenuOpen(!isColorMenuOpen); setIsSizeMenuOpen(false); setIsLinkMenuOpen(false); }}
              className={`flex items-center space-x-1 p-2 rounded-xl transition-colors ${isColorMenuOpen ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
              title="Cor do Texto"
            >
              <Palette size={16} />
              <ChevronDown size={10} />
            </button>
            {isColorMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-[100] p-2 animate-in fade-in slide-in-from-top-1">
                <div className="grid grid-cols-5 gap-2 p-1">
                  {textColors.map((c) => (
                    <button
                      key={c.name}
                      onMouseDown={(e) => { e.preventDefault(); execCommand('foreColor', c.color); setIsColorMenuOpen(false); }}
                      className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 transition-transform hover:scale-110 active:scale-95"
                      style={{ backgroundColor: c.color === 'inherit' ? (note.content.includes('dark') ? 'white' : 'black') : c.color }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-100 dark:bg-gray-800 mx-1" />
          
          <button 
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); setIsLinkMenuOpen(!isLinkMenuOpen); setIsColorMenuOpen(false); setIsSizeMenuOpen(false); }} 
            className={`p-2 rounded-xl transition-colors ${isLinkMenuOpen ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
            title="Vincular Nota Interna"
          >
            <FileSearch size={16} />
          </button>

          {isLinkMenuOpen && (
            <div className="absolute top-full left-4 md:left-6 mt-2 w-[calc(100vw-2rem)] md:w-72 max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-[100] p-3 animate-in fade-in slide-in-from-top-2">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Pesquisar notas..."
                  className="w-full bg-gray-100 dark:bg-gray-700/50 text-xs pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
                {filteredNotes.length > 0 ? filteredNotes.map(n => (
                  <button
                    key={n.id}
                    onClick={() => insertInternalLink(n)}
                    className="w-full flex items-center space-x-3 p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors text-left"
                  >
                    <FileText size={14} className="text-gray-400" />
                    <span className="text-xs font-bold truncate">{n.title}</span>
                  </button>
                )) : (
                  <p className="text-[10px] text-center text-gray-500 py-6 uppercase font-black tracking-widest">Vazio</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 md:py-12 no-scrollbar">
        <div className="max-w-3xl mx-auto">
          <input 
            type="text"
            className="w-full text-3xl md:text-5xl font-black mb-6 md:mb-8 bg-transparent border-none focus:outline-none placeholder-gray-200 dark:placeholder-gray-800 tracking-tight text-gray-900 dark:text-white"
            placeholder="Título..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
          />
          <div 
            ref={editorRef}
            contentEditable
            onBlur={handleBlur}
            onInput={saveSelection}
            onKeyUp={saveSelection}
            onClick={saveSelection}
            className="prose prose-sm md:prose-lg prose-indigo dark:prose-invert max-w-none focus:outline-none min-h-[500px] text-gray-700 dark:text-gray-300 leading-relaxed"
            spellCheck="false"
          />
        </div>
      </div>
    </div>
  );
};

export default Editor;
