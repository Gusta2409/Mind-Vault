
export type ViewMode = 'editor' | 'graph' | 'canvas' | 'blackboard';
export type CardShape = 'rectangle' | 'circle';

export interface Note {
  id: string;
  title: string;
  content: string; // Stored as HTML for rich text
  folderId: string | null;
  tags: string[];
  attachments: string[];
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface CanvasElement {
  id: string;
  noteId?: string;
  title?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'note' | 'text';
  // Style properties
  shape?: CardShape;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  color?: string;
}

export interface AppState {
  notes: Note[];
  folders: Folder[];
  currentNoteId: string | null;
  viewMode: ViewMode;
  theme: 'light' | 'dark';
  canvasElements: CanvasElement[];
  canvasEdges: CanvasEdge[];
  googleClientId?: string; // Novo campo para configuração dinâmica
}
