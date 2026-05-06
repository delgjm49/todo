import { create } from "zustand";
import type { AppDocumentSnapshot } from "../types/app";

export type HistoryTransactionKind = "typing" | "drag" | "sort" | "formatting";

export interface HistoryTransaction {
  kind: HistoryTransactionKind;
  startedAt: string;
  updatedAt: string;
  pendingSnapshot: AppDocumentSnapshot | null;
}

export interface HistoryStoreState {
  historyDepth: number;
  past: AppDocumentSnapshot[];
  present: AppDocumentSnapshot | null;
  future: AppDocumentSnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  currentTransaction: HistoryTransaction | null;
  initializeHistory: (snapshot: AppDocumentSnapshot) => void;
  clearHistory: (snapshot?: AppDocumentSnapshot) => void;
  beginTransaction: (kind: HistoryTransactionKind, snapshot?: AppDocumentSnapshot) => void;
  updateTransaction: (snapshot: AppDocumentSnapshot) => void;
  commitSnapshot: (
    snapshot: AppDocumentSnapshot,
    kind: HistoryTransactionKind
  ) => AppDocumentSnapshot | null;
  commitTransaction: () => AppDocumentSnapshot | null;
  undo: () => AppDocumentSnapshot | null;
  redo: () => AppDocumentSnapshot | null;
}

const DEFAULT_HISTORY_DEPTH = 100;

function cloneSnapshot(snapshot: AppDocumentSnapshot): AppDocumentSnapshot {
  return structuredClone(snapshot);
}

function snapshotsEqual(left: AppDocumentSnapshot, right: AppDocumentSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function refreshAvailability(state: Pick<HistoryStoreState, "past" | "future">): Pick<HistoryStoreState, "canUndo" | "canRedo"> {
  return {
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}

function capPastSnapshots(past: AppDocumentSnapshot[], historyDepth: number): AppDocumentSnapshot[] {
  if (past.length <= historyDepth) {
    return past;
  }

  return past.slice(past.length - historyDepth);
}

function createTransaction(
  kind: HistoryTransactionKind,
  snapshot: AppDocumentSnapshot | null,
  existing?: HistoryTransaction | null
): HistoryTransaction {
  const now = new Date().toISOString();
  return {
    kind,
    startedAt: existing?.kind === kind ? existing.startedAt : now,
    updatedAt: now,
    pendingSnapshot: snapshot ? cloneSnapshot(snapshot) : existing?.pendingSnapshot ?? null,
  };
}

function finalizeCommit(
  currentState: HistoryStoreState,
  snapshot: AppDocumentSnapshot
): {
  nextState: Pick<HistoryStoreState, "past" | "present" | "future" | "canUndo" | "canRedo" | "currentTransaction">;
  changed: boolean;
} {
  const normalizedSnapshot = cloneSnapshot(snapshot);
  const present = currentState.present;

  if (present && snapshotsEqual(present, normalizedSnapshot)) {
    return {
      changed: false,
      nextState: {
        past: currentState.past,
        present,
        future: currentState.future,
        ...refreshAvailability(currentState),
        currentTransaction: null,
      },
    };
  }

  const nextPast = present ? [...currentState.past, cloneSnapshot(present)] : currentState.past.slice();
  const cappedPast = capPastSnapshots(nextPast, currentState.historyDepth);

  return {
    changed: true,
    nextState: {
      past: cappedPast,
      present: normalizedSnapshot,
      future: [],
      canUndo: cappedPast.length > 0,
      canRedo: false,
      currentTransaction: null,
    },
  };
}

export const useHistoryStore = create<HistoryStoreState>()((set, get) => ({
  historyDepth: DEFAULT_HISTORY_DEPTH,
  past: [],
  present: null,
  future: [],
  canUndo: false,
  canRedo: false,
  currentTransaction: null,
  initializeHistory: (snapshot) => {
    const normalizedSnapshot = cloneSnapshot(snapshot);
    set({
      past: [],
      present: normalizedSnapshot,
      future: [],
      canUndo: false,
      canRedo: false,
      currentTransaction: null,
    });
  },
  clearHistory: (snapshot) => {
    if (snapshot) {
      const normalizedSnapshot = cloneSnapshot(snapshot);
      set({
        past: [],
        present: normalizedSnapshot,
        future: [],
        canUndo: false,
        canRedo: false,
        currentTransaction: null,
      });
      return;
    }

    set({
      past: [],
      present: null,
      future: [],
      canUndo: false,
      canRedo: false,
      currentTransaction: null,
    });
  },
  beginTransaction: (kind, snapshot) => {
    set((state) => ({
      currentTransaction: createTransaction(kind, snapshot ?? state.present, state.currentTransaction),
    }));
  },
  updateTransaction: (snapshot) => {
    set((state) => {
      if (!state.currentTransaction) {
        return state;
      }

      return {
        currentTransaction: {
          ...state.currentTransaction,
          updatedAt: new Date().toISOString(),
          pendingSnapshot: cloneSnapshot(snapshot),
        },
      };
    });
  },
  commitSnapshot: (snapshot, kind) => {
    void kind;
    let committed: AppDocumentSnapshot | null = null;
    set((state) => {
      const result = finalizeCommit(state, snapshot);
      committed = result.changed && result.nextState.present ? cloneSnapshot(result.nextState.present) : null;
      return result.nextState;
    });

    return committed;
  },
  commitTransaction: () => {
    const state = get();
    const pendingSnapshot = state.currentTransaction?.pendingSnapshot;
    if (!pendingSnapshot) {
      set({ currentTransaction: null });
      return null;
    }

    let committed: AppDocumentSnapshot | null = null;
    set((currentState) => {
      const result = finalizeCommit(currentState, pendingSnapshot);
      committed = result.changed && result.nextState.present ? cloneSnapshot(result.nextState.present) : null;
      return result.nextState;
    });

    return committed;
  },
  undo: () => {
    const state = get();
    if (!state.present || state.past.length === 0) {
      set({ currentTransaction: null });
      return null;
    }

    const previous = state.past[state.past.length - 1];
    const nextPast = state.past.slice(0, -1);
    const nextFuture = [...state.future, cloneSnapshot(state.present)];

    set({
      past: nextPast,
      present: cloneSnapshot(previous),
      future: nextFuture,
      canUndo: nextPast.length > 0,
      canRedo: true,
      currentTransaction: null,
    });

    return cloneSnapshot(previous);
  },
  redo: () => {
    const state = get();
    if (!state.present || state.future.length === 0) {
      set({ currentTransaction: null });
      return null;
    }

    const nextSnapshot = state.future[state.future.length - 1];
    const nextFuture = state.future.slice(0, -1);
    const nextPast = capPastSnapshots([...state.past, cloneSnapshot(state.present)], state.historyDepth);

    set({
      past: nextPast,
      present: cloneSnapshot(nextSnapshot),
      future: nextFuture,
      canUndo: nextPast.length > 0,
      canRedo: nextFuture.length > 0,
      currentTransaction: null,
    });

    return cloneSnapshot(nextSnapshot);
  },
}));

export { DEFAULT_HISTORY_DEPTH };
