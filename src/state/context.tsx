import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Action } from '../domain/state';
import type { Catalog } from '../domain/types';
import { ProgressStore, STORAGE_KEY } from './storage';
import type { Snapshot } from './storage';

interface AppContext extends Snapshot {
  catalog: Catalog;
  now: Date;
  act: (action: Action) => Promise<void>;
  restore: (input: unknown) => Promise<void>;
  reset: () => Promise<void>;
  store: ProgressStore;
}
const Context = createContext<AppContext | null>(null);
async function locked(callback: () => void) {
  if (navigator.locks) await navigator.locks.request('verse-warrior:write', callback);
  else callback();
}
export function AppProvider({
  children,
  catalog,
  providedStore,
}: {
  children: ReactNode;
  catalog: Catalog;
  providedStore?: ProgressStore;
}) {
  const [store] = useState(
    () =>
      providedStore ??
      new ProgressStore({
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
        removeItem: (key) => window.localStorage.removeItem(key),
      }),
  );
  const [snapshot, publish] = useReducer(
    (_previous: Snapshot, next: Snapshot) => ({ ...next }),
    store.snapshot,
  );
  const [now, setNow] = useState(() => new Date());
  const storeRef = useRef(store);
  useEffect(() => {
    const update = () => {
      storeRef.current.refresh();
      publish(storeRef.current.snapshot);
      setNow(new Date());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) update();
    };
    let midnightTimer: number;
    const scheduleMidnight = () => {
      const current = new Date(),
        midnight = new Date(current);
      midnight.setHours(24, 0, 0, 25);
      midnightTimer = window.setTimeout(() => {
        update();
        scheduleMidnight();
      }, midnight.getTime() - current.getTime());
    };
    scheduleMidnight();
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      clearTimeout(midnightTimer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const change = useCallback(
    async (callback: () => void) => {
      try {
        await locked(callback);
      } finally {
        publish(store.snapshot);
        setNow(new Date());
      }
    },
    [store],
  );
  const act = useCallback(
    (action: Action) => change(() => store.dispatch(action)),
    [change, store],
  );
  const restore = useCallback(
    (input: unknown) => change(() => store.restore(input)),
    [change, store],
  );
  const reset = useCallback(() => change(() => store.reset()), [change, store]);
  return (
    <Context.Provider value={{ ...snapshot, catalog, now, store, act, restore, reset }}>
      {children}
    </Context.Provider>
  );
}
// The hook shares the context with the provider by design.
// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error('AppProvider is missing.');
  return context;
}
