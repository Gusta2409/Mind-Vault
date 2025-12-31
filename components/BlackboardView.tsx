
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Pencil, 
  Eraser, 
  Type, 
  Sparkles, 
  Trash2,
  Undo2,
  Redo2
} from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  type: 'path';
  points: Point[];
  tool: 'pen' | 'magic';
  brushSize: number;
}

interface TextItem {
  id: string;
  type: 'text';
  x: number;
  y: number;
  value: string;
  brushSize: number;
}

type BlackboardItem = Stroke | TextItem;

interface BlackboardViewProps {
  theme: 'light' | 'dark';
}

const BlackboardView: React.FC<BlackboardViewProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [items, setItems] = useState<BlackboardItem[]>([]);
  const [history, setHistory] = useState<BlackboardItem[][]>([]);
  const [redoStack, setRedoStack] = useState<BlackboardItem[][]>([]);
  
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'magic' | 'eraser' | 'text'>('pen');
  const [brushSize, setBrushSize] = useState(4);
  const [textInput, setTextInput] = useState<{ x: number, y: number, value: string } | null>(null);

  const getStrokeColor = useCallback(() => {
    return theme === 'dark' ? '#ffffff' : '#000000';
  }, [theme]);

  const saveToHistory = useCallback((currentItems: BlackboardItem[]) => {
    setHistory(prev => [...prev, currentItems]);
    setRedoStack([]); // Limpa o refazer ao criar nova ação
  }, []);

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [items, ...prev]);
    setItems(previous);
    setHistory(prev => prev.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory(prev => [...prev, items]);
    setItems(next);
    setRedoStack(prev => prev.slice(1));
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const color = getStrokeColor();

    items.forEach(item => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = item.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (item.type === 'path') {
        if (item.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        item.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (item.type === 'text') {
        ctx.font = `bold ${item.brushSize * 6}px Inter, sans-serif`;
        ctx.fillText(item.value, item.x, item.y);
      }
    });

    if (isDrawing && currentPoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      currentPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
  }, [items, isDrawing, currentPoints, brushSize, getStrokeColor]);

  useEffect(() => {
    render();
  }, [theme, items, render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        render();
      }
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, [render]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    if (tool === 'text') {
      setTextInput({ ...pos, value: '' });
      return;
    }
    
    if (tool === 'eraser') {
      const newItems = items.filter(item => {
        if (item.type === 'path') {
          return !item.points.some(p => Math.sqrt(Math.pow(p.x - pos.x, 2) + Math.pow(p.y - pos.y, 2)) < brushSize * 5);
        }
        return Math.sqrt(Math.pow(item.x - pos.x, 2) + Math.pow(item.y - pos.y, 2)) > 50;
      });
      if (newItems.length !== items.length) {
        saveToHistory(items);
        setItems(newItems);
      }
      return;
    }

    setIsDrawing(true);
    setCurrentPoints([pos]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'eraser' && !('touches' in e ? false : (e as React.MouseEvent).buttons === 1)) return;
    const pos = getPos(e);
    if (tool === 'eraser') {
      const newItems = items.filter(item => {
        if (item.type === 'path') {
          return !item.points.some(p => Math.sqrt(Math.pow(p.x - pos.x, 2) + Math.pow(p.y - pos.y, 2)) < brushSize * 5);
        }
        return true;
      });
      if (newItems.length !== items.length) setItems(newItems);
      return;
    }
    if (!isDrawing) return;
    setCurrentPoints(prev => [...prev, pos]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPoints.length > 1) {
      saveToHistory(items);
      let pointsToSave = [...currentPoints];
      
      if (tool === 'magic') {
        const start = pointsToSave[0];
        const end = pointsToSave[pointsToSave.length - 1];
        const minX = Math.min(...pointsToSave.map(p => p.x));
        const maxX = Math.max(...pointsToSave.map(p => p.x));
        const minY = Math.min(...pointsToSave.map(p => p.y));
        const maxY = Math.max(...pointsToSave.map(p => p.y));
        const width = maxX - minX;
        const height = maxY - minY;
        const distToStart = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

        // Se for uma forma fechada (ou quase fechada)
        if (distToStart < 100 && width > 20 && height > 20) {
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          
          // Heurística de variância para decidir entre círculo ou quadrado
          const idealRadius = (width + height) / 4;
          let variance = 0;
          pointsToSave.forEach(p => {
            const d = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
            variance += Math.abs(d - idealRadius);
          });
          variance /= pointsToSave.length;

          // Se a variância for baixa, é um círculo. Se for alta (cantos), é um quadrado.
          if (variance < idealRadius * 0.15) {
            // Gerar Círculo
            pointsToSave = [];
            for (let i = 0; i <= 60; i++) {
              const angle = (i / 60) * Math.PI * 2;
              pointsToSave.push({
                x: centerX + Math.cos(angle) * idealRadius,
                y: centerY + Math.sin(angle) * idealRadius
              });
            }
          } else {
            // Gerar Quadrado/Retângulo
            pointsToSave = [
              { x: minX, y: minY },
              { x: maxX, y: minY },
              { x: maxX, y: maxY },
              { x: minX, y: maxY },
              { x: minX, y: minY }
            ];
          }
        } else {
          // Linha Reta
          pointsToSave = [start, end];
        }
      }

      const newStroke: Stroke = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'path',
        points: pointsToSave,
        tool: tool as 'pen' | 'magic',
        brushSize
      };
      setItems(prev => [...prev, newStroke]);
    }
    setCurrentPoints([]);
  };

  const handleTextSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && textInput && textInput.value.trim() !== '') {
      saveToHistory(items);
      const newText: TextItem = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        x: textInput.x,
        y: textInput.y,
        value: textInput.value,
        brushSize
      };
      setItems(prev => [...prev, newText]);
      setTextInput(null);
    }
    if (e.key === 'Escape') setTextInput(null);
  };

  const clearBoard = () => {
    if (items.length === 0) return;
    saveToHistory(items);
    setItems([]);
  };

  return (
    <div className="relative w-full h-full bg-white dark:bg-[#0d1117] overflow-hidden flex flex-col transition-colors duration-500">
      <div className="flex-1 relative cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full touch-none bg-transparent"
        />

        {textInput && (
          <div className="absolute z-50 flex flex-col" style={{ left: textInput.x, top: textInput.y - 40 }}>
            <input
              autoFocus
              type="text"
              placeholder="Digite e Enter..."
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-indigo-500 rounded-lg px-3 py-1.5 focus:outline-none text-gray-900 dark:text-white shadow-2xl min-w-[200px]"
              value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onKeyDown={handleTextSubmit}
            />
          </div>
        )}
      </div>

      {/* Toolbar Inferior Principal */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-white/90 dark:bg-gray-800/95 backdrop-blur-2xl p-2.5 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[60]">
        
        {/* Undo/Redo Group */}
        <div className="flex items-center space-x-1 pr-3 border-r border-gray-200 dark:border-gray-700">
          <button 
            onClick={undo} 
            disabled={history.length === 0}
            className={`p-2.5 rounded-2xl transition-all ${history.length > 0 ? 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 size={20} />
          </button>
          <button 
            onClick={redo} 
            disabled={redoStack.length === 0}
            className={`p-2.5 rounded-2xl transition-all ${redoStack.length > 0 ? 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 size={20} />
          </button>
        </div>

        {/* Tools Group */}
        <div className="flex items-center space-x-1 pr-3 border-r border-gray-200 dark:border-gray-700">
          <button onClick={() => setTool('pen')} className={`p-2.5 rounded-2xl transition-all ${tool === 'pen' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><Pencil size={20} /></button>
          <button onClick={() => setTool('magic')} className={`p-2.5 rounded-2xl transition-all ${tool === 'magic' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><Sparkles size={20} /></button>
          <button onClick={() => setTool('text')} className={`p-2.5 rounded-2xl transition-all ${tool === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><Type size={20} /></button>
          <button onClick={() => setTool('eraser')} className={`p-2.5 rounded-2xl transition-all ${tool === 'eraser' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><Eraser size={20} /></button>
        </div>

        {/* Brush Size Group */}
        <div className="flex items-center space-x-4 px-3 border-r border-gray-200 dark:border-gray-700">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Pincel</span>
            <input type="range" min="1" max="20" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
          </div>
          <div className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm transition-transform duration-100" style={{ backgroundColor: getStrokeColor(), transform: `scale(${brushSize/12 + 0.4})` }} />
        </div>

        <button 
          onClick={clearBoard} 
          className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
          title="Limpar Tudo"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="absolute top-8 left-8 pointer-events-none flex flex-col space-y-2">
        <div className="flex items-center space-x-2 bg-white/50 dark:bg-black/20 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/20 dark:border-white/5 shadow-sm">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase">Mind Vault Sketchboard</span>
        </div>
        {items.length > 0 && (
           <span className="text-[9px] text-gray-400 px-1 uppercase font-medium">{items.length} elementos no quadro</span>
        )}
      </div>
    </div>
  );
};

export default BlackboardView;
