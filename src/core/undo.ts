import type { UndoAction } from './types';

/** Caretaker / Memento — undo & redo stacks. */
export class UndoRedo {
  readonly undoStack: UndoAction[] = [];
  readonly redoStack: UndoAction[] = [];
  constructor(private readonly limit = 200) {}

  push(action: UndoAction): void {
    this.undoStack.push(action);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
  }
  undo(): boolean {
    const a = this.undoStack.pop();
    if (!a) return false;
    a.undo(); this.redoStack.push(a); return true;
  }
  redo(): boolean {
    const a = this.redoStack.pop();
    if (!a) return false;
    a.redo(); this.undoStack.push(a); return true;
  }
  clear(): void { this.undoStack.length = 0; this.redoStack.length = 0; }
}
