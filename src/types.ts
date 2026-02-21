export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  noteFile?: string;
}

export interface TodoStore {
  todos: Todo[];
}

export type Mode = 'todo' | 'notes';

export interface Workspace {
  name: string;
  createdAt: string;
}

export interface WorkspaceRegistry {
  workspaces: Workspace[];
  defaultWorkspace: string;
}
