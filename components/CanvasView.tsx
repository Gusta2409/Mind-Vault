
import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  MousePointer2, 
  Link as LinkIcon, 
  X, 
  Square, 
  Circle, 
  Palette, 
  Bold, 
  Italic, 
  Underline,
  Type,
  Trash2,
  Settings2,
  MousePointer
} from 'lucide-react';
import { AppState, CanvasElement, CanvasEdge, CardShape } from '../types';

interface CanvasViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const CanvasView: React.FC<CanvasViewProps> = ({ state, setState }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const onDragStart = (id: string, e: React.MouseEvent) => {
    if (editingId === id) return;
    e.stopPropagation();
    setSelectedId(id);
    setIsDragging(id);
    const element = state.canvasElements.find(el => el.id === id);
    if (element) {
      setOffset({
        x: e.clientX - element.x,
        y: e.clientY - element.y
      });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setState(prev => ({
        ...prev,
        canvasElements: prev.canvasElements.map(el => 
          el.id === isDragging 
            ? { ...el, x: e.clientX - offset.x, y: e.clientY - offset.y } 
            : el
        )
      }));
    }
  };

  const onMouseUp = () => setIsDragging(null);

  const addNewCard = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newEl: CanvasElement = {
      id: newId,
      type: 'text',
      title: 'Novo Insight',
      text: 'Conteúdo do insight...',
      x: 200 + Math.random() * 50,
      y: 200 + Math.random() * 50,
      width: 220,
      height: 220,
      shape: 'rectangle',
      backgroundColor: state.theme === 'dark' ? '#1f2937' : '#ffffff',
      textColor: state.theme === 'dark' ? '#f3f4f6' : '#1f2937',
      fontSize: '14px',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    };
    setState(prev => ({ ...prev, canvasElements: [...prev.canvasElements, newEl] }));
    setSelectedId(newId);
    setEditingId(newId);
  };

  const handleCardClick = (id: string) => {
    if (linkingFromId) {
      if (linkingFromId !== id) {
        const newEdge: CanvasEdge = {
          id: `e-${linkingFromId}-${id}`,
          from: linkingFromId,
          to: id,
          color: state.theme === 'dark' ? '#6366f1' : '#4f46e5'
        };
        const exists = state.canvasEdges.some(e => 
          (e.from === linkingFromId && e.to === id) || (e.from === id && e.to === linkingFromId)
        );
        if (!exists) {
          setState(prev => ({ ...prev, canvasEdges: [...prev.canvasEdges, newEdge] }));
        }
      }
      setLinkingFromId(null);
    } else {
      setSelectedId(id);
    }
  };

  const updateCard = (id: string, updates: Partial<CanvasElement>) => {
    setState(prev => ({
      ...prev,
      canvasElements: prev.canvasElements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      )
    }));
  };

  const updateEdgeColor = (fromId: string, color: string) => {
    setState(prev => ({
      ...prev,
      canvasEdges: prev.canvasEdges.map(edge => 
        edge.from === fromId ? { ...edge, color } : edge
      )
    }));
  };

  const deleteElement = (id: string) => {
    setState(prev => ({
      ...prev,
      canvasElements: prev.canvasElements.filter(el => el.id !== id),
      canvasEdges: prev.canvasEdges.filter(edge => edge.from !== id && edge.to !== id),
      currentNoteId: prev.currentNoteId === id ? null : prev.currentNoteId
    }));
    setSelectedId(null);
  };

  const selectedCard = state.canvasElements.find(el => el.id === selectedId);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-[#f8fafc] dark:bg-[#0d1117] overflow-hidden relative cursor-default select-none"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={() => { 
        if (!linkingFromId) {
          setSelectedId(null); 
          setEditingId(null); 
        }
      }}
      style={{
        backgroundImage: state.theme === 'dark' 
          ? 'radial-gradient(circle, #21262d 1px, transparent 1px)' 
          : 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}
    >
      {/* Barra de Ferramentas de Estilo (Aparece quando um card é selecionado) */}
      {selectedCard && (
        <div 
          onClick={e => e.stopPropagation()}
          className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-2xl shadow-2xl flex items-center space-x-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4"
        >
          <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-700 pr-3">
            <button 
              onClick={() => updateCard(selectedCard.id, { shape: 'rectangle' })} 
              className={`p-2 rounded-lg transition-colors ${selectedCard.shape === 'rectangle' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="Formato Retangular"
            >
              <Square size={18}/>
            </button>
            <button 
              onClick={() => updateCard(selectedCard.id, { shape: 'circle' })} 
              className={`p-2 rounded-lg transition-colors ${selectedCard.shape === 'circle' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="Formato Circular"
            >
              <Circle size={18}/>
            </button>
          </div>

          <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-700 pr-3">
            <button 
              onClick={() => updateCard(selectedCard.id, { fontWeight: selectedCard.fontWeight === 'bold' ? 'normal' : 'bold' })} 
              className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold transition-colors ${selectedCard.fontWeight === 'bold' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="Negrito"
            >
              <Bold size={18} />
            </button>
            <button 
              onClick={() => updateCard(selectedCard.id, { fontStyle: selectedCard.fontStyle === 'italic' ? 'normal' : 'italic' })} 
              className={`w-9 h-9 flex items-center justify-center rounded-lg italic transition-colors ${selectedCard.fontStyle === 'italic' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="Itálico"
            >
              <Italic size={18} />
            </button>
            <button 
              onClick={() => updateCard(selectedCard.id, { textDecoration: selectedCard.textDecoration === 'underline' ? 'none' : 'underline' })} 
              className={`w-9 h-9 flex items-center justify-center rounded-lg underline transition-colors ${selectedCard.textDecoration === 'underline' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="Sublinhado"
            >
              <Underline size={18} />
            </button>
          </div>

          <div className="flex items-center space-x-2 border-r border-gray-200 dark:border-gray-700 pr-3">
             <div className="flex flex-col items-center">
               <span className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Card</span>
               <input 
                 type="color" 
                 value={selectedCard.backgroundColor} 
                 onChange={e => updateCard(selectedCard.id, { backgroundColor: e.target.value })} 
                 className="w-7 h-7 p-0 border-none bg-transparent cursor-pointer"
               />
             </div>
             <div className="flex flex-col items-center">
               <span className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Text</span>
               <input 
                 type="color" 
                 value={selectedCard.textColor} 
                 onChange={e => updateCard(selectedCard.id, { textColor: e.target.value })} 
                 className="w-7 h-7 p-0 border-none bg-transparent cursor-pointer"
               />
             </div>
             <div className="flex flex-col items-center">
               <span className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Link</span>
               <input 
                 type="color" 
                 value={state.canvasEdges.find(e => e.from === selectedCard.id)?.color || '#6366f1'} 
                 onChange={e => updateEdgeColor(selectedCard.id, e.target.value)} 
                 className="w-7 h-7 p-0 border-none bg-transparent cursor-pointer"
               />
             </div>
          </div>

          <div className="flex items-center space-x-1">
            <select 
              className="bg-transparent text-xs font-semibold focus:outline-none dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5"
              value={selectedCard.fontSize}
              onChange={e => updateCard(selectedCard.id, { fontSize: e.target.value })}
            >
              <option value="12px">Pequeno</option>
              <option value="14px">Médio</option>
              <option value="18px">Grande</option>
              <option value="24px">Extra G</option>
            </select>
            
            <button 
              onClick={() => setLinkingFromId(selectedCard.id)}
              className={`p-2 rounded-lg transition-all ${linkingFromId === selectedCard.id ? 'bg-indigo-600 text-white animate-pulse' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100'}`}
              title="Criar Vínculo (Selecione outro card)"
            >
              <LinkIcon size={18} />
            </button>

            <button 
              onClick={() => deleteElement(selectedCard.id)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Excluir Card"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Barra de Ferramentas Principal */}
      <div className="absolute bottom-10 left-10 flex flex-col space-y-3 z-50">
        <button 
          onClick={(e) => { e.stopPropagation(); addNewCard(); }} 
          className="p-4 bg-indigo-600 text-white rounded-3xl hover:bg-indigo-700 transition-all hover:scale-110 shadow-2xl flex items-center justify-center"
          title="Adicionar Card de Insight"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Camada de Conexões */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" className="opacity-40" />
          </marker>
        </defs>
        {state.canvasEdges.map(edge => {
          const from = state.canvasElements.find(el => el.id === edge.from);
          const to = state.canvasElements.find(el => el.id === edge.to);
          if (!from || !to) return null;
          
          return (
            <line 
              key={edge.id}
              x1={from.x + from.width / 2}
              y1={from.y + from.height / 2}
              x2={to.x + to.width / 2}
              y2={to.y + to.height / 2}
              stroke={edge.color || "#6366f1"}
              strokeWidth="2.5"
              strokeDasharray="8"
              className="opacity-50"
              style={{ animation: 'dash 30s linear infinite' }}
            />
          );
        })}
      </svg>

      {/* Renderização dos Cards */}
      {state.canvasElements.map(element => {
        const isSelected = selectedId === element.id;
        const isEditing = editingId === element.id;
        const isLinking = linkingFromId === element.id;
        const isLinkTarget = linkingFromId && linkingFromId !== element.id;

        const textStyle: React.CSSProperties = {
          color: element.textColor,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight as any,
          fontStyle: element.fontStyle,
          textDecoration: element.textDecoration,
        };

        return (
          <div 
            key={element.id}
            onMouseDown={(e) => onDragStart(element.id, e)}
            onDoubleClick={(e) => { e.stopPropagation(); setEditingId(element.id); }}
            onClick={(e) => { e.stopPropagation(); handleCardClick(element.id); }}
            className={`
              absolute border-2 shadow-xl group transition-all duration-200 flex flex-col p-6
              ${isSelected ? 'z-40 ring-4 ring-indigo-500/10' : 'z-10'}
              ${isDragging === element.id ? 'cursor-grabbing border-indigo-500 scale-[1.02]' : 'cursor-grab border-transparent'}
              ${isEditing ? 'z-50 border-indigo-400 shadow-2xl' : ''}
              ${isLinking ? 'border-indigo-600 ring-8 ring-indigo-500/20' : ''}
              ${isLinkTarget ? 'hover:border-indigo-400 cursor-pointer scale-105' : ''}
            `}
            style={{
              left: element.x,
              top: element.y,
              width: element.width,
              height: element.height,
              backgroundColor: element.backgroundColor,
              borderRadius: element.shape === 'circle' ? '50%' : '2rem',
              alignItems: element.shape === 'circle' ? 'center' : 'stretch',
              justifyContent: element.shape === 'circle' ? 'center' : 'flex-start',
              textAlign: element.shape === 'circle' ? 'center' : 'left',
              ...textStyle
            }}
          >
            {/* Indicador de Seleção Visual */}
            {isSelected && !isEditing && (
              <div className="absolute inset-0 border-2 border-indigo-500/50 rounded-[inherit] pointer-events-none" />
            )}

            {/* Conteúdo Editável */}
            {isEditing ? (
              <div className="flex flex-col h-full w-full">
                <input
                  autoFocus
                  className="w-full font-bold mb-3 bg-transparent border-b border-indigo-200/20 focus:outline-none"
                  value={element.title || ''}
                  onChange={(e) => updateCard(element.id, { title: e.target.value })}
                  placeholder="Título"
                  onClick={(e) => e.stopPropagation()}
                  style={{ ...textStyle, fontSize: `calc(${element.fontSize} + 4px)` }}
                />
                <textarea
                  className="w-full flex-1 bg-transparent border-none focus:outline-none leading-relaxed resize-none"
                  value={element.text || ''}
                  onChange={(e) => updateCard(element.id, { text: e.target.value })}
                  placeholder="Descreva seu insight..."
                  onClick={(e) => e.stopPropagation()}
                  style={textStyle}
                />
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <h4 className="font-bold mb-2 truncate opacity-95" style={{ fontSize: `calc(${element.fontSize} + 4px)` }}>
                  {element.title || 'Sem Título'}
                </h4>
                <div className={`leading-relaxed opacity-85 overflow-hidden ${element.shape === 'circle' ? 'line-clamp-4' : 'line-clamp-10'}`}>
                  {element.text}
                </div>
              </div>
            )}

            {/* Overlay de Vinculação */}
            {isLinking && (
              <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-sm flex items-center justify-center rounded-[inherit] pointer-events-none">
                <div className="bg-indigo-600 text-white text-[10px] font-bold px-4 py-2 rounded-full animate-bounce shadow-xl">
                  ORIGEM DO VÍNCULO
                </div>
              </div>
            )}
            {isLinkTarget && (
              <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-sm flex items-center justify-center rounded-[inherit] pointer-events-none border-2 border-emerald-500/50">
                <div className="bg-emerald-500 text-white text-[10px] font-bold px-4 py-2 rounded-full shadow-xl">
                  CONECTAR AQUI
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Info Panel Inferior */}
      <div className="absolute bottom-6 right-8 text-[10px] font-bold text-gray-400 dark:text-gray-600 tracking-[0.2em] pointer-events-none flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <span>SISTEMA DE NEXOS ATIVO</span>
        </div>
        <span>{state.canvasElements.length} OBJETOS</span>
        <span>{state.canvasEdges.length} CONEXÕES</span>
      </div>

      {/* Dica de Vinculação (Aparece quando está no modo de link) */}
      {linkingFromId && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[110] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center space-x-3 animate-bounce">
          <LinkIcon size={20} />
          <span>Selecione outro card para criar a conexão</span>
          <button 
            onClick={() => setLinkingFromId(null)}
            className="ml-4 p-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CanvasView;
