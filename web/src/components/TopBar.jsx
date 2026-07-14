import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

function initials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function TopBar({ children }) {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand">
        <span className="logo-dot" /> Ajaia Docs
      </Link>
      <div className="topbar-center">{children}</div>
      <div className="topbar-user">
        <span className="avatar" title={user?.email}>{initials(user?.name)}</span>
        <span className="user-name">{user?.name}</span>
        <button className="btn small ghost" onClick={logout}>Sign out</button>
      </div>
    </header>
  );
}
