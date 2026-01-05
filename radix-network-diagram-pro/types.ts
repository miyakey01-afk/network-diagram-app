
export enum DiagramType {
  TWO_D_PICTO = '2D 標準アイコン',
  THREE_D_FLAT = '3D フラットビュー',
  THREE_D_PERSPECTIVE = '3D 立体パース'
}

export interface GeneratedDiagram {
  id: string;
  type: DiagramType;
  imageUrl: string;
  loading: boolean;
  error?: string;
  variant: number; // 1 or 2
}

export interface ImageProcessingState {
  originalImage: string | null;
  diagrams: GeneratedDiagram[];
  selectedDiagramId: string | null;
  isGlobalLoading: boolean;
  isEditing: boolean;
}
