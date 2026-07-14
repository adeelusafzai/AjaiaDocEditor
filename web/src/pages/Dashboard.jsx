import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';

const SUPPORTED = '.txt, .md, .docx';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function RoleBadge({ access }) {
  return <span className={`badge ${access}`}>{access}</span>;
}

function DocCard({ doc, onOpen, onShare, onDelete, showOwner }) {
  return (
    <div className="doc-card" onClick={() => onOpen(doc.id)} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(doc.id)}>
      <div className="doc-card-top">
        <div className="doc-thumb" aria-hidden />
        <RoleBadge access={doc.access} />
      </div>
      <div className="doc-card-body">
        <div className="doc-title" title={doc.title}>{doc.title}</div>
        {showOwner ? (
          <div className="muted tiny">Owned by {doc.owner.name}</div>
        ) : (
          <div className="muted tiny">Edited {formatDate(doc.updatedAt)}</div>
        )}
      </div>
      {doc.access === 'owner' && (
        <div className="doc-card-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn tiny ghost" onClick={() => onShare(doc)}>Share</button>
          <button className="btn tiny ghost danger" onClick={() => onDelete(doc)}>Delete</button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState({ owned: [], shared: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await api.listDocuments());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createDoc = async () => {
    setBusy(true);
    setError(null);
    try {
      const { document } = await api.createDocument({ title: 'Untitled document' });
      navigate(`/doc/${document.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { document } = await api.importDocument(file);
      navigate(`/doc/${document.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const onDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteDocument(doc.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onShare = (doc) => navigate(`/doc/${doc.id}?share=1`);
  const open = (id) => navigate(`/doc/${id}`);

  return (
    <div className="app-shell">
      <TopBar />
      <main className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Your documents</h1>
            <p className="muted">Welcome back, {user?.name}.</p>
          </div>
          <div className="dashboard-actions">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.markdown,.docx"
              onChange={onImport}
              hidden
            />
            <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
              Import file
            </button>
            <button className="btn primary" disabled={busy} onClick={createDoc}>
              + New document
            </button>
          </div>
        </div>

        <p className="muted tiny">Import supports {SUPPORTED} (legacy .doc not supported; 5&nbsp;MB max).</p>

        {error && <div className="alert error">{error}</div>}

        {loading ? (
          <div className="muted">Loading documents…</div>
        ) : (
          <>
            <section>
              <h2 className="section-title">My documents</h2>
              {data.owned.length === 0 ? (
                <div className="empty">No documents yet. Create one or import a file to get started.</div>
              ) : (
                <div className="doc-grid">
                  {data.owned.map((doc) => (
                    <DocCard key={doc.id} doc={doc} onOpen={open} onShare={onShare} onDelete={onDelete} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="section-title">Shared with me</h2>
              {data.shared.length === 0 ? (
                <div className="empty">Nothing shared with you yet.</div>
              ) : (
                <div className="doc-grid">
                  {data.shared.map((doc) => (
                    <DocCard key={doc.id} doc={doc} onOpen={open} showOwner />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
