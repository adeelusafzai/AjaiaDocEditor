import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import Editor from '../components/Editor.jsx';
import ShareModal from '../components/ShareModal.jsx';
import TopBar from '../components/TopBar.jsx';

const SAVE_DELAY = 700;

function SaveStatus({ status }) {
  const map = {
    saved: 'All changes saved',
    saving: 'Saving…',
    unsaved: 'Unsaved changes',
    error: 'Save failed — retrying on next edit',
  };
  return <span className={`save-status ${status}`}>{map[status]}</span>;
}

export default function DocumentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('saved');
  const [loadError, setLoadError] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  const titleRef = useRef('');
  const contentRef = useRef('');
  const dirtyRef = useRef(false);
  const timerRef = useRef(null);
  const editableRef = useRef(false);

  const editable = !!doc && (doc.access === 'owner' || doc.access === 'editor');
  editableRef.current = editable;

  useEffect(() => {
    let active = true;
    setDoc(null);
    setLoadError(null);
    (async () => {
      try {
        const { document } = await api.getDocument(id);
        if (!active) return;
        setDoc(document);
        setTitle(document.title);
        titleRef.current = document.title;
        contentRef.current = document.content;
        setStatus('saved');
      } catch (err) {
        if (active) setLoadError(err);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    setShareOpen(searchParams.get('share') === '1');
  }, [searchParams]);

  const saveNow = useCallback(async () => {
    if (!editableRef.current || !dirtyRef.current) return;
    dirtyRef.current = false;
    setStatus('saving');
    try {
      await api.updateDocument(id, {
        title: titleRef.current.trim() || 'Untitled document',
        content: contentRef.current,
      });
      setStatus('saved');
    } catch {
      dirtyRef.current = true;
      setStatus('error');
    }
  }, [id]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setStatus('unsaved');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveNow, SAVE_DELAY);
  }, [saveNow]);

  // Flush any pending edits when leaving the page.
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      if (dirtyRef.current && editableRef.current) {
        api
          .updateDocument(id, {
            title: titleRef.current.trim() || 'Untitled document',
            content: contentRef.current,
          })
          .catch(() => {});
      }
    };
  }, [id]);

  const onTitleChange = (e) => {
    setTitle(e.target.value);
    titleRef.current = e.target.value;
    if (editable) scheduleSave();
  };

  const onContentChange = (html) => {
    contentRef.current = html;
    if (editable) scheduleSave();
  };

  const closeShare = () => {
    setShareOpen(false);
    if (searchParams.get('share')) {
      searchParams.delete('share');
      setSearchParams(searchParams, { replace: true });
    }
  };

  if (loadError) {
    return (
      <div className="app-shell">
        <TopBar />
        <div className="center-screen col">
          <h2>{loadError.status === 404 ? 'Document not found' : 'Could not open document'}</h2>
          <p className="muted">
            {loadError.status === 404
              ? "It may have been deleted, or you don't have access."
              : loadError.message}
          </p>
          <Link to="/" className="btn primary">Back to documents</Link>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="app-shell">
        <TopBar />
        <div className="center-screen">Loading document…</div>
      </div>
    );
  }

  const isOwner = doc.access === 'owner';

  return (
    <div className="app-shell">
      <TopBar>
        <div className="doc-header">
          <button className="btn small ghost" onClick={() => navigate('/')} title="Back">←</button>
          <input
            className="doc-title-input"
            value={title}
            onChange={onTitleChange}
            onBlur={() => {
              if (!title.trim()) {
                setTitle('Untitled document');
                titleRef.current = 'Untitled document';
                if (editable) scheduleSave();
              }
            }}
            disabled={!editable}
            aria-label="Document title"
          />
          <SaveStatus status={editable ? status : 'saved'} />
        </div>
      </TopBar>

      <div className="doc-subbar">
        <span className={`badge ${doc.access}`}>{doc.access}</span>
        {!editable && <span className="muted tiny">View only — you cannot edit this document.</span>}
        <div className="spacer" />
        {isOwner && (
          <button className="btn small primary" onClick={() => setShareOpen(true)}>
            Share
          </button>
        )}
      </div>

      <main className="doc-main">
        <div className="page">
          <Editor
            key={doc.id}
            content={doc.content}
            editable={editable}
            onChange={onContentChange}
          />
        </div>
      </main>

      {shareOpen && isOwner && <ShareModal documentId={doc.id} title={doc.title} onClose={closeShare} />}
    </div>
  );
}
