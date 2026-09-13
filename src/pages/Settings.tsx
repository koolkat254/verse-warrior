import { useState } from 'react';
import { parseBackup } from '../domain/state';
import type { Backup } from '../domain/types';
import { useApp } from '../state/context';
import { downloadJson } from '../state/storage';
import { localDay } from '../domain/scheduler';

export function Settings() {
  const { catalog, state, store, raw, restore, reset, warning } = useApp();
  const [backup, setBackup] = useState<Backup | null>(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [resetConfirm, setResetConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  const exportProgress = () =>
    downloadJson(
      store.backup(catalog.contentVersion),
      `verse-warrior-progress-${localDay(new Date())}.json`,
    );
  async function readFile(file?: File) {
    setError('');
    setMessage('');
    setBackup(null);
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error('This file is too large. Choose a progress backup smaller than 5 MB.');
      setBackup(parseBackup(JSON.parse(await file.text())));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This backup could not be read.');
    }
  }
  async function confirmRestore() {
    if (!backup) return;
    setBusy(true);
    setError('');
    try {
      await restore(backup);
      setBackup(null);
      setMessage(
        store.snapshot.warning
          ? 'Backup loaded into this session. Browser storage still needs attention.'
          : 'Your progress has been restored.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed.');
    } finally {
      setBusy(false);
    }
  }
  async function confirmReset() {
    setBusy(true);
    setError('');
    try {
      await reset();
      setResetConfirm(false);
      setMessage('Verse Warrior progress has been reset. Other site data was left untouched.');
    } catch {
      setError('Browser storage could not be cleared. Your current progress has been retained.');
    } finally {
      setBusy(false);
    }
  }
  const known = new Set(catalog.passages.map((p) => p.id));
  const dormant = backup
    ? Object.keys(backup.state.passageProgress).filter((id) => !known.has(id)).length
    : 0;
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Your practice, your progress</p>
        <h1>Settings</h1>
        <p>A few simple ways to take care of what you’ve learned.</p>
      </div>
      <section className="panel settings-section">
        <h2>Saved in this browser</h2>
        <p>
          Your progress normally remains when you close the app or restart your browser. It stays on
          this device, in this browser; it does not sync automatically.
        </p>
        <p>
          Clearing site data removes it. Private browsing usually removes it when the private
          session ends. Download a backup to keep a copy or move to another device.
        </p>
        <div className="storage-summary">
          <span className={`save-dot ${warning ? 'unsaved' : ''}`} />
          <span>{warning ? 'Storage needs attention' : 'Browser storage ready'}</span>
          <span>{Object.keys(state.passageProgress).length} passages started</span>
        </div>
        {raw !== null && (
          <button
            className="button"
            onClick={() => downloadJson(raw, 'verse-warrior-original-data.json', true)}
          >
            Download original stored data
          </button>
        )}
      </section>
      <section className="panel settings-section">
        <h2>Back up your progress</h2>
        <p>
          Download a JSON file with your learning progress, review dates, and collection choices.
          Scripture text is not included.
        </p>
        <button className="button primary" onClick={exportProgress}>
          Download progress backup
        </button>
      </section>
      <section className="panel settings-section">
        <h2>Restore a backup</h2>
        <p>
          Restoring replaces the progress currently in this browser. We’ll check the file and show a
          preview before changing anything.
        </p>
        <label className="file-picker">
          Choose progress backup
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              void readFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        {backup && (
          <section className="restore-preview" aria-label="Backup preview">
            <h3>Review your backup</h3>
            <dl>
              <div>
                <dt>Exported</dt>
                <dd>{new Date(backup.exportedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Passages started</dt>
                <dd>{Object.keys(backup.state.passageProgress).length}</dd>
              </div>
              <div>
                <dt>Passages in review</dt>
                <dd>
                  {Object.values(backup.state.passageProgress).filter((p) => p.review).length}
                </dd>
              </div>
              <div>
                <dt>Mastered passages</dt>
                <dd>
                  {
                    Object.values(backup.state.passageProgress).filter((p) => p.review?.masteredAt)
                      .length
                  }
                </dd>
              </div>
            </dl>
            {backup.catalogVersion !== catalog.contentVersion && (
              <p>
                This backup uses catalog {backup.catalogVersion}; this app uses{' '}
                {catalog.contentVersion}.
              </p>
            )}
            {dormant > 0 && (
              <p>
                {dormant} passage records are not in the current catalog. They will be retained
                without appearing in reviews.
              </p>
            )}
            <p>
              <strong>This will replace all current Verse Warrior progress.</strong>
            </p>
            <div className="button-row">
              <button className="button" onClick={exportProgress}>
                Download current progress first
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => {
                  void confirmRestore();
                }}
              >
                Replace progress with this backup
              </button>
              <button className="text-button" disabled={busy} onClick={() => setBackup(null)}>
                Cancel restore
              </button>
            </div>
          </section>
        )}
      </section>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      <section className="settings-section reset-section">
        <h2>Start fresh</h2>
        <p>
          Remove this app’s saved progress from this browser. Your bundled collections will remain
          available.
        </p>
        {resetConfirm ? (
          <div className="notice">
            <p>
              <strong>Delete all Verse Warrior progress in this browser?</strong> Download a backup
              first if you may want it later.
            </p>
            <div className="button-row">
              <button className="button" onClick={exportProgress}>
                Download backup
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={() => {
                  void confirmReset();
                }}
              >
                Delete my progress
              </button>
              <button className="text-button" onClick={() => setResetConfirm(false)}>
                Cancel reset
              </button>
            </div>
          </div>
        ) : (
          <button className="text-button danger-text" onClick={() => setResetConfirm(true)}>
            Reset local progress
          </button>
        )}
      </section>
      <p className="small muted">Verse Warrior · Version 1.0 · Catalog {catalog.contentVersion}</p>
    </>
  );
}
