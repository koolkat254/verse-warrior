import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { AppProvider } from '../src/state/context';
import { parseCatalog } from '../src/domain/catalog';
import { ProgressStore, STORAGE_KEY } from '../src/state/storage';
import { WordHints, Typing } from '../src/components/Exercises';
import fixture from './fixtures/catalog.json';

function app(route: string) {
  const store = new ProgressStore(localStorage);
  render(
    <MemoryRouter initialEntries={[route]}>
      <AppProvider catalog={parseCatalog(fixture)} providedStore={store}>
        <App />
      </AppProvider>
    </MemoryRouter>,
  );
  return store;
}
describe('learning interactions', () => {
  it('hides full words from both rendered text and accessible labels', async () => {
    render(<WordHints text="Steady practice builds memory." />);
    await userEvent.click(screen.getByRole('button', { name: '100%' }));
    expect(document.body.textContent).not.toContain('Steady');
    expect(screen.queryByRole('button', { name: /Steady/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Reveal word 1' }));
    expect(document.body.textContent).toContain('Steady');
  });
  it('reveals the next concealed word with Space or Right Arrow', async () => {
    render(<WordHints text="Steady practice builds memory." />);
    await userEvent.click(screen.getByRole('button', { name: '100%' }));
    await userEvent.keyboard('{ArrowRight}');
    expect(document.body.textContent).toContain('Steady');
    await userEvent.keyboard(' ');
    expect(document.body.textContent).toContain('practice');
  });
  it('does not compare a typed attempt before submission', async () => {
    render(<Typing text="One two three." />);
    expect(document.body.textContent).not.toContain('One two three');
    await userEvent.type(screen.getByLabelText('Type the passage from memory'), 'one three');
    expect(screen.queryByRole('region', { name: 'Attempt comparison' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Compare attempt' }));
    expect(screen.getByRole('region', { name: 'Attempt comparison' })).toHaveTextContent('two');
  });
  it('reference mode conceals the reference until reveal and never enrolls automatically', async () => {
    const store = app('/practice/practice-one/reference');
    expect(document.body.textContent).not.toContain('Practice 1:1');
    await waitFor(() => expect(store.snapshot.state.passageProgress['practice-one']).toBeDefined());
    expect(store.snapshot.state.passageProgress['practice-one'].review).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Reveal reference' }));
    expect(screen.getByRole('heading', { name: 'Practice 1:1' })).toBeInTheDocument();
  });
  it('enrollment requires reveal and a submitted self-rating', async () => {
    const store = app('/practice/practice-one/enroll');
    expect(screen.queryByRole('button', { name: /Remembered/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Reveal passage' }));
    await userEvent.click(screen.getByRole('button', { name: /Remembered/ }));
    await waitFor(() =>
      expect(store.snapshot.state.passageProgress['practice-one'].review?.intervalStep).toBe(0),
    );
    expect(
      store.snapshot.state.passageProgress['practice-one'].review?.successfulReviewStreak,
    ).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('practice-one');
  });
  it('supports fast recall shortcuts without capturing keyboard input', async () => {
    const store = app('/practice/practice-one/enroll');
    await userEvent.keyboard(' ');
    expect(screen.getByRole('button', { name: /Remembered/ })).toBeInTheDocument();
    await userEvent.keyboard('1');
    await waitFor(() =>
      expect(store.snapshot.state.passageProgress['practice-one'].review?.lastRating).toBe(
        'remembered',
      ),
    );
    const typingStore = app('/practice/practice-two/enroll');
    await userEvent.click(screen.getByRole('button', { name: 'I’d like to type it instead' }));
    const input = screen.getByLabelText('Your recall attempt');
    await userEvent.click(input);
    await userEvent.keyboard('1 ');
    expect(input).toHaveValue('1 ');
    expect(typingStore.snapshot.state.passageProgress['practice-two'].review).toBeNull();
  });
  it('provides recovery for unknown routes', () => {
    app('/practice/missing/read');
    expect(screen.getByRole('link', { name: 'Go to Collections' })).toBeInTheDocument();
  });
  it('requires explicit reset confirmation', async () => {
    localStorage.setItem('other-site', 'keep');
    const store = app('/settings');
    store.dispatch({ type: 'practice', id: 'one', now: new Date() });
    await userEvent.click(screen.getByRole('button', { name: 'Reset local progress' }));
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Delete my progress' }));
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeNull());
    expect(localStorage.getItem('other-site')).toBe('keep');
  });
});
