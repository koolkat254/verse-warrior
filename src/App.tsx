import { useEffect, useRef } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Icon, Recovery } from './components/ui';
import { Collections, CollectionDetail } from './pages/Collections';
import { Today } from './pages/Today';
import { Practice } from './pages/Practice';
import { ReviewSession } from './pages/Review';
import { ReferenceDrill } from './pages/ReferenceDrill';
import { Settings } from './pages/Settings';
import { useApp } from './state/context';

export function App() {
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const { warning } = useApp();
  const practicing = location.pathname.startsWith('/practice/') || location.pathname === '/review';
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!practicing) main.current?.focus();
    document.title = 'Verse Warrior';
  }, [location.pathname, practicing]);
  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <Icon name="book" size={23} />
            </span>
            <span>Verse Warrior</span>
          </Link>
          {practicing ? (
            <Link className="exit-practice" to="/">
              Exit practice <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <nav className="primary-nav" aria-label="Main navigation">
              <NavLink end to="/">
                <Icon name="sun" />
                <span>Today</span>
              </NavLink>
              <NavLink to="/collections">
                <Icon name="book" />
                <span>Collections</span>
              </NavLink>
              <NavLink to="/settings">
                <Icon name="settings" />
                <span>Settings</span>
              </NavLink>
            </nav>
          )}
        </div>
      </header>
      <main
        ref={main}
        id="main-content"
        tabIndex={-1}
        className={practicing ? 'main practice-main' : 'main'}
      >
        {warning && (
          <aside className="notice storage-warning" role="alert">
            <p>{warning}</p>
            <Link to="/settings">Open backup & recovery</Link>
          </aside>
        )}
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:collectionId" element={<CollectionDetail />} />
          <Route path="/practice/:passageId/:mode" element={<Practice />} />
          <Route path="/reference/:collectionId/:mode" element={<ReferenceDrill />} />
          <Route
            path="/reference/:collectionId/groups/:groupId/:mode"
            element={<ReferenceDrill />}
          />
          <Route path="/review" element={<ReviewSession />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Recovery />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <span>Rooted in practice.</span>
        <span>Verse Warrior</span>
      </footer>
    </>
  );
}
