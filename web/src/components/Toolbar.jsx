import { useEffect, useState } from 'react';

function Btn({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      className={`tb-btn${active ? ' active' : ''}`}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={!!active}
    >
      {children}
    </button>
  );
}

export default function Toolbar({ editor }) {
  // Re-render on selection/transaction changes so active states stay in sync.
  const [, force] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const update = () => force((n) => n + 1);
    editor.on('transaction', update);
    editor.on('selectionUpdate', update);
    return () => {
      editor.off('transaction', update);
      editor.off('selectionUpdate', update);
    };
  }, [editor]);

  if (!editor) return null;
  const chain = () => editor.chain().focus();

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <div className="tb-group">
        <Btn title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}>
          <b>B</b>
        </Btn>
        <Btn title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}>
          <i>I</i>
        </Btn>
        <Btn title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()}>
          <u>U</u>
        </Btn>
        <Btn title="Strikethrough" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()}>
          <s>S</s>
        </Btn>
      </div>

      <div className="tb-sep" />

      <div className="tb-group">
        <Btn title="Paragraph" active={editor.isActive('paragraph')} onClick={() => chain().setParagraph().run()}>
          ¶
        </Btn>
        <Btn title="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => chain().toggleHeading({ level: 1 }).run()}>
          H1
        </Btn>
        <Btn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
          H2
        </Btn>
        <Btn title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
          H3
        </Btn>
      </div>

      <div className="tb-sep" />

      <div className="tb-group">
        <Btn title="Bulleted list" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()}>
          • List
        </Btn>
        <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()}>
          1. List
        </Btn>
        <Btn title="Quote" active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()}>
          &ldquo; &rdquo;
        </Btn>
        <Btn title="Code block" active={editor.isActive('codeBlock')} onClick={() => chain().toggleCodeBlock().run()}>
          {'</>'}
        </Btn>
      </div>

      <div className="tb-sep" />

      <div className="tb-group">
        <Btn title="Undo (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>
          ↶
        </Btn>
        <Btn title="Redo (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>
          ↷
        </Btn>
      </div>
    </div>
  );
}
