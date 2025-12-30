'use client';

import { useEffect } from 'react';
import { useArrangementStore } from '@/store/arrangement-store';

/**
 * 좌석 배치 Undo/Redo 키보드 단축키 훅
 * - Ctrl+Z / Cmd+Z: Undo (실행 취소)
 * - Ctrl+Shift+Z / Cmd+Shift+Z: Redo (다시 실행)
 * - Ctrl+Y: Redo (Windows 스타일)
 */
export function useUndoRedoShortcuts() {
    const undo = useArrangementStore((state) => state.undo);
    const redo = useArrangementStore((state) => state.redo);
    const canUndo = useArrangementStore((state) => state.canUndo);
    const canRedo = useArrangementStore((state) => state.canRedo);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl (Windows) or Cmd (Mac)
            const isModifier = e.ctrlKey || e.metaKey;
            if (!isModifier) return;

            // Prevent shortcuts when typing in input fields
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            if (e.key === 'z' || e.key === 'Z') {
                e.preventDefault();
                if (e.shiftKey) {
                    // Redo: Ctrl+Shift+Z or Cmd+Shift+Z
                    if (canRedo()) {
                        redo();
                    }
                } else {
                    // Undo: Ctrl+Z or Cmd+Z
                    if (canUndo()) {
                        undo();
                    }
                }
            }

            // Alternative Redo: Ctrl+Y (Windows convention)
            if ((e.key === 'y' || e.key === 'Y') && !e.shiftKey) {
                e.preventDefault();
                if (canRedo()) {
                    redo();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, canUndo, canRedo]);
}
