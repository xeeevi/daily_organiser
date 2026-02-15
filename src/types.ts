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
