// ============================================================================
// SEAT LAYOUT EDITOR - REDUCER (Undo/Redo & Transaction Management)
// ============================================================================

import { ClassroomLayout, EditorHistoryState } from './types';

export type EditorAction =
  | { type: 'SET_LAYOUT'; payload: ClassroomLayout }
  | { type: 'COMMIT_LAYOUT'; payload: ClassroomLayout }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; payload: ClassroomLayout };

const MAX_HISTORY_LENGTH = 30;

export function editorReducer(state: EditorHistoryState, action: EditorAction): EditorHistoryState {
  switch (action.type) {
    case 'SET_LAYOUT': {
      return {
        ...state,
        present: action.payload
      };
    }

    case 'COMMIT_LAYOUT': {
      // Bỏ qua nếu layout không thay đổi
      if (state.present === action.payload) return state;

      const newPast = [...state.past, state.present];
      if (newPast.length > MAX_HISTORY_LENGTH) {
        newPast.shift(); // Giữ tối đa 30 bước hoàn tác
      }

      return {
        past: newPast,
        present: action.payload,
        future: [] // Xóa nhánh redo sau khi có thao tác mới
      };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;

      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future]
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;

      const next = state.future[0];
      const newFuture = state.future.slice(1);

      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture
      };
    }

    case 'RESET': {
      return {
        past: [],
        present: action.payload,
        future: []
      };
    }

    default:
      return state;
  }
}
