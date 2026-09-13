import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import rawCatalog from './content/catalog.json';
import { parseCatalog } from './domain/catalog';
import { AppProvider } from './state/context';
import { App } from './App';
import './styles.css';

async function start() {
  const root = createRoot(document.getElementById('root')!);
  try {
    // This branch is eliminated from normal builds. Fixtures never ship in production.
    const source =
      import.meta.env.MODE === 'test-e2e'
        ? (await import('../tests/fixtures/catalog.json')).default
        : rawCatalog;
    const catalog = parseCatalog(source);
    root.render(
      <StrictMode>
        <HashRouter>
          <AppProvider catalog={catalog}>
            <App />
          </AppProvider>
        </HashRouter>
      </StrictMode>,
    );
  } catch (error) {
    root.render(
      <main className="main">
        <section className="panel">
          <h1>Verse Warrior couldn’t load its collections.</h1>
          <p>Your saved progress has not been changed.</p>
          <p>{error instanceof Error ? error.message : 'Please try again later.'}</p>
        </section>
      </main>,
    );
  }
}
void start();
