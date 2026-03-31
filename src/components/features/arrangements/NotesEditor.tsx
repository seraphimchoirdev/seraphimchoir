'use client';

import { Bold, Highlighter, Italic, List, ListOrdered, Type } from 'lucide-react';

import { memo, useCallback, useEffect } from 'react';

import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// 글씨 크기 확장 (TextStyle 기반)
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

import { cn } from '@/lib/utils';

// 하이라이트 색상 팔레트
const HIGHLIGHT_COLORS = [
  { color: '#fef08a', label: '노랑' },
  { color: '#bbf7d0', label: '초록' },
  { color: '#bfdbfe', label: '파랑' },
  { color: '#fecaca', label: '빨강' },
  { color: '#e9d5ff', label: '보라' },
];

// 글씨 크기 옵션
const FONT_SIZES = [
  { label: '소', size: '12px' },
  { label: '중', size: '14px' },
  { label: '대', size: '18px' },
  { label: '특대', size: '22px' },
];

// 특수문자/화살표 팔레트
const SYMBOLS = [
  { group: '화살표', chars: ['→', '←', '↑', '↓', '↔', '⇒', '⇐', '⇔'] },
  { group: '기호', chars: ['★', '●', '■', '▶', '◆', '※', '◎', '▲'] },
  { group: '구분', chars: ['│', '─', '┃', '━', '|', '·', '…', '〓'] },
];

interface NotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const NotesEditor = memo(function NotesEditor({
  value,
  onChange,
  readOnly = false,
}: NotesEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontSize,
    ],
    content: value || '',
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'focus:outline-none min-h-[80px] px-3 py-2 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5',
      },
    },
  });

  // 외부 value 변경 시 에디터 내용 동기화 (초기 로드 등)
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || '');
    }
  }, [editor, value]);

  const insertSymbol = useCallback(
    (char: string) => {
      editor?.chain().focus().insertContent(char).run();
    },
    [editor]
  );

  const setFontSize = useCallback(
    (size: string) => {
      if (!editor) return;
      const currentSize = editor.getAttributes('textStyle').fontSize;
      if (currentSize === size) {
        // 같은 크기 다시 클릭하면 기본 크기로 복원
        editor.chain().focus().unsetMark('textStyle').run();
      } else {
        editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
      }
    },
    [editor]
  );

  const toggleHighlight = useCallback(
    (color: string) => {
      if (!editor) return;
      if (editor.isActive('highlight', { color })) {
        editor.chain().focus().unsetHighlight().run();
      } else {
        editor.chain().focus().setHighlight({ color }).run();
      }
    },
    [editor]
  );

  if (readOnly) {
    return (
      <div
        className="max-w-none text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
        dangerouslySetInnerHTML={{ __html: value || '' }}
      />
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface)]">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border-default)] px-2 py-1.5">
        {/* 서식 버튼 */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={cn(
            'rounded p-1.5 transition-colors hover:bg-[var(--color-background-secondary)]',
            editor?.isActive('bold') && 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)]'
          )}
          title="굵게"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={cn(
            'rounded p-1.5 transition-colors hover:bg-[var(--color-background-secondary)]',
            editor?.isActive('italic') && 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)]'
          )}
          title="기울임"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>

        {/* 리스트 */}
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={cn(
            'rounded p-1.5 transition-colors hover:bg-[var(--color-background-secondary)]',
            editor?.isActive('bulletList') && 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)]'
          )}
          title="불릿 리스트"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={cn(
            'rounded p-1.5 transition-colors hover:bg-[var(--color-background-secondary)]',
            editor?.isActive('orderedList') && 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)]'
          )}
          title="번호 리스트"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1 h-4 w-px bg-[var(--color-border-default)]" />

        {/* 글씨 크기 */}
        <div className="flex items-center gap-0.5">
          {FONT_SIZES.map(({ label, size }) => (
            <button
              key={size}
              type="button"
              onClick={() => setFontSize(size)}
              className={cn(
                'rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-[var(--color-background-secondary)]',
                editor?.getAttributes('textStyle').fontSize === size &&
                  'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] font-semibold'
              )}
              title={`글씨 크기: ${label}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mx-1 h-4 w-px bg-[var(--color-border-default)]" />

        {/* 하이라이트 색상 */}
        <div className="flex items-center gap-0.5">
          <Highlighter className="mr-0.5 h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
          {HIGHLIGHT_COLORS.map(({ color, label }) => (
            <button
              key={color}
              type="button"
              onClick={() => toggleHighlight(color)}
              className={cn(
                'h-5 w-5 rounded-sm border transition-all hover:scale-110',
                editor?.isActive('highlight', { color })
                  ? 'border-[var(--color-primary-500)] ring-1 ring-[var(--color-primary-300)]'
                  : 'border-neutral-300'
              )}
              style={{ backgroundColor: color }}
              title={`${label} 하이라이트`}
            />
          ))}
          {editor?.isActive('highlight') && (
            <button
              type="button"
              onClick={() => editor?.chain().focus().unsetHighlight().run()}
              className="ml-0.5 rounded px-1 py-0.5 text-[10px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-background-secondary)]"
              title="하이라이트 제거"
            >
              ✕
            </button>
          )}
        </div>

        <div className="mx-1 h-4 w-px bg-[var(--color-border-default)]" />

        {/* 특수문자 삽입 */}
        <div className="flex items-center gap-0.5">
          <Type className="mr-0.5 h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
          {SYMBOLS.map(({ group, chars }) => (
            <div key={group} className="flex gap-px">
              {chars.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => insertSymbol(char)}
                  className="flex h-6 w-6 items-center justify-center rounded text-xs transition-colors hover:bg-[var(--color-background-secondary)]"
                  title={`${char} 삽입`}
                >
                  {char}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 에디터 영역 */}
      <EditorContent editor={editor} />
    </div>
  );
});

export default NotesEditor;
