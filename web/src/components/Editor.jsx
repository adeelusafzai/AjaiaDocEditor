import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Toolbar from './Toolbar.jsx';

/**
 * Rich-text editor. The parent remounts this (via `key={doc.id}`) when opening a
 * different document, so `content` is only used as the initial value.
 */
export default function Editor({ content, editable, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: 'Start writing your document…' }),
    ],
    content: content || '',
    editable,
    editorProps: {
      attributes: { class: 'prose', spellcheck: 'true' },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  return (
    <div className="editor-wrap">
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
