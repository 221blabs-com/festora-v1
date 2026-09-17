'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-violet-400 hover:text-violet-300 underline',
        },
      }),
      Image,
    ],
    content: value,
    immediatelyRender: false, // Fix SSR hydration issue
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-white',
      },
    },
  });

  // Show loading state while editor is initializing
  if (!editor) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="border-b border-gray-700/50 p-3">
          <div className="flex gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-8 h-8 bg-gray-700/50 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="min-h-[200px] p-4 flex items-center justify-center">
          <div className="text-gray-400">Loading editor...</div>
        </div>
      </div>
    );
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-gray-700/50 p-3 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded-lg transition-all ${
            editor.isActive('bold') ? 'bg-violet-500/20 text-violet-400' : 'text-gray-400 hover:bg-gray-700/50'
          }`}
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded-lg transition-all ${
            editor.isActive('italic') ? 'bg-violet-500/20 text-violet-400' : 'text-gray-400 hover:bg-gray-700/50'
          }`}
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-px bg-gray-700/50 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-lg transition-all ${
            editor.isActive('bulletList') ? 'bg-violet-500/20 text-violet-400' : 'text-gray-400 hover:bg-gray-700/50'
          }`}
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded-lg transition-all ${
            editor.isActive('orderedList') ? 'bg-violet-500/20 text-violet-400' : 'text-gray-400 hover:bg-gray-700/50'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px bg-gray-700/50 mx-1" />

        <button
          type="button"
          onClick={addLink}
          className={`p-2 rounded-lg transition-all ${
            editor.isActive('link') ? 'bg-violet-500/20 text-violet-400' : 'text-gray-400 hover:bg-gray-700/50'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={addImage}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-700/50 transition-all"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <div className="w-px bg-gray-700/50 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Undo className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editor */}
      <div className="min-h-[200px]">
        <EditorContent
          editor={editor}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
