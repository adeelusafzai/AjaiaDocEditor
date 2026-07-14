import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

export default function ShareModal({ documentId, title, onClose }) {
  const [shares, setShares] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { shares } = await api.listShares(documentId);
      setShares(shares);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.addShare(documentId, email, role);
      setEmail('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (userEmail, newRole) => {
    setError(null);
    try {
      await api.addShare(documentId, userEmail, newRole); // upsert
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (userId) => {
    setError(null);
    try {
      await api.removeShare(documentId, userId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share “{title}”</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="share-form" onSubmit={add}>
          <input
            type="email"
            placeholder="Add people by email (e.g. bob@demo.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Share'}
          </button>
        </form>

        {error && <div className="alert error">{error}</div>}

        <div className="share-list">
          <div className="share-list-title">People with access</div>
          {loading ? (
            <div className="muted tiny">Loading…</div>
          ) : shares.length === 0 ? (
            <div className="muted tiny">Only you have access. Add someone above.</div>
          ) : (
            shares.map((s) => (
              <div className="share-row" key={s.userId}>
                <div className="share-person">
                  <div className="share-name">{s.name}</div>
                  <div className="muted tiny">{s.email}</div>
                </div>
                <select value={s.role} onChange={(e) => changeRole(s.email, e.target.value)}>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button className="btn tiny ghost danger" onClick={() => remove(s.userId)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <div className="modal-footer">
          <span className="muted tiny">
            People you add see this document under “Shared with me”. Editors can edit; viewers are read-only.
          </span>
        </div>
      </div>
    </div>
  );
}
