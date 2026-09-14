import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const storageKey = 'verse-warrior:state';
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-12T18:00:00Z') });
});
async function stored(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey);
}
async function seedDue(page: Page) {
  await page.goto('./');
  await page.evaluate((key) => {
    const p = {
      startedAt: '2026-01-01T18:00:00.000Z',
      lastPracticedAt: '2026-01-05T18:00:00.000Z',
      reference: null,
      review: {
        intervalStep: 2,
        dueDate: '2026-01-12',
        lastReviewedAt: '2026-01-05T18:00:00.000Z',
        lastRating: 'remembered',
        successfulReviewStreak: 2,
        masteredAt: null,
      },
    };
    localStorage.setItem(
      key,
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: '2026-01-05T18:00:00.000Z',
        activeCollectionIds: ['foundations', 'shared'],
        learningFocus: { collectionId: 'foundations', groupId: 'week-one' },
        passageProgress: {
          'practice-one': p,
          'practice-two': {
            ...p,
            review: { ...p.review, intervalStep: 0, successfulReviewStreak: 0 },
          },
        },
      }),
    );
  }, storageKey);
  await page.reload();
}
test('choose a collection, learn, enroll, refresh, and navigate with Back', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Choose a collection' }).click();
  const card = page.getByRole('article').filter({ hasText: 'Practice foundations' });
  await card.getByRole('button', { name: 'Activate collection' }).click();
  await card.getByRole('link', { name: 'Practice foundations' }).click();
  await page.getByRole('button', { name: 'Focus on this collection' }).click();
  await page.getByRole('link', { name: /Practice 1:1 Test wording/ }).click();
  await expect(
    page.getByText('Steady practice builds lasting memory.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Make it harder' }).click();
  await page.getByRole('button', { name: '100%' }).click();
  await expect(page.locator('.hinted-text')).not.toContainText('Steady');
  await page.getByRole('button', { name: 'Reveal word 1', exact: true }).click();
  await expect(page.locator('.hinted-text')).toContainText('Steady');
  await page.getByRole('link', { name: 'Use first letters' }).click();
  await page.getByRole('link', { name: 'Type from memory' }).click();
  await page
    .getByLabel('Type the passage from memory')
    .fill('Steady practice builds memory. Return with patience and begin again.');
  await page.getByRole('button', { name: 'Compare attempt' }).click();
  await expect(page.getByRole('region', { name: 'Attempt comparison' })).toContainText('lasting');
  await page.getByRole('link', { name: 'Test recall & start review' }).click();
  await expect(page.getByRole('button', { name: /Remembered/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal passage' }).click();
  await page.getByRole('button', { name: /Remembered/ }).click();
  await expect(page.getByText('Your review rhythm has begun.')).toBeVisible();
  await page.reload();
  expect((await stored(page)).passageProgress['practice-one'].review.dueDate).toBe('2026-01-13');
  await page.getByRole('link', { name: 'Back to Today' }).click();
  await expect(page.getByRole('heading', { name: 'Practice 1:2–3' })).toBeVisible();
  await page.goBack();
  await expect(page.getByText('Already in your review rhythm.')).toBeVisible();
});
test('due queue deduplicates, awards mastery, and resumes unfinished reviews', async ({ page }) => {
  await seedDue(page);
  await page.getByRole('link', { name: 'Start practice' }).click();
  await expect(page.getByText('Passage 1 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'Reveal passage' }).click();
  await page.getByRole('button', { name: /Remembered/ }).click();
  await expect(page.getByText('This passage is mastered.', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Passage 1 of 1')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Practice 1:2–3' })).toBeVisible();
  await expect(page.locator('.scripture')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal passage' }).click();
  await page.getByRole('button', { name: /^Forgot/ }).click();
  await expect(page.getByRole('link', { name: 'Practice with hints' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish review' }).click();
  const state = await stored(page);
  expect(state.passageProgress['practice-one'].review.masteredAt).not.toBeNull();
  expect(state.passageProgress['practice-two'].review.dueDate).toBe('2026-01-13');
});
test('backup download, invalid import, replacement, and reset round-trip', async ({ page }) => {
  await seedDue(page);
  await page.goto('./#/settings');
  const original = await stored(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download progress backup' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await stored(page)).toEqual(original);
  await page.getByRole('button', { name: 'Reset local progress' }).click();
  await page.getByRole('button', { name: 'Delete my progress' }).click();
  await page.locator('input[type=file]').setInputFiles(path!);
  await expect(page.getByRole('region', { name: 'Backup preview' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull();
  await page.getByRole('button', { name: 'Replace progress with this backup' }).click();
  await expect(page.getByRole('status')).toContainText('restored');
  expect(await stored(page)).toEqual(original);
});
test('reference answer stays concealed and narrow layouts do not overflow', async ({ page }) => {
  await page.goto('./#/practice/practice-one/reference');
  await expect(page.locator('main')).not.toContainText('Practice 1:1');
  await page.getByRole('button', { name: 'Reveal reference' }).click();
  await expect(page.getByRole('heading', { name: 'Practice 1:1' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('main')).not.toContainText('Practice 1:1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('adds a separate reference check without exposing its answer first', async ({ page }) => {
  await seedDue(page);
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.passageProgress['practice-two'].review.dueDate = '2026-02-01';
    localStorage.setItem(key, JSON.stringify(state));
  }, storageKey);
  await page.reload();
  await page.getByRole('link', { name: 'Start practice' }).click();
  await page.getByRole('button', { name: 'Reveal passage' }).click();
  await page.getByRole('button', { name: /^Remembered/ }).click();
  await page.getByRole('button', { name: 'Next passage' }).click();
  await expect(page.getByRole('heading', { name: 'Where are these words found?' })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Practice 1:2');
  await page.getByRole('button', { name: 'Reveal reference' }).click();
  await expect(page.getByRole('heading', { name: /Practice 1:2/ })).toBeVisible();
  await page.getByRole('button', { name: /^Remembered/ }).click();
  await expect(page.getByText('1 of 3 consecutive reference recalls.')).toBeVisible();
  expect(
    (await stored(page)).passageProgress['practice-two'].reference.successfulRecallStreak,
  ).toBe(1);
});
test('keyboard shortcuts reveal, rate, and advance a review without affecting typed attempts', async ({
  page,
}) => {
  await seedDue(page);
  await page.getByRole('link', { name: 'Start practice' }).click();
  await expect(page.getByRole('button', { name: 'Reveal passage' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: /Remembered/ })).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.getByText('A little stronger each time.')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Passage 2 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'I’d like to type it instead' }).click();
  await page.getByLabel('Your recall attempt').pressSequentially('1 ');
  await expect(page.getByLabel('Your recall attempt')).toHaveValue('1 ');
  await expect(page.getByRole('button', { name: 'Reveal and compare' })).toBeVisible();
});
test('simultaneous tabs cannot rate the same scheduled review twice', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Web Locks are not available in this browser target.');
  await seedDue(page);
  await page.goto('./#/review');
  const second = await context.newPage();
  await second.clock.install({ time: new Date('2026-01-12T18:00:00Z') });
  await second.goto('./#/review');
  await page.getByRole('button', { name: 'Reveal passage' }).click();
  await second.getByRole('button', { name: 'Reveal passage' }).click();
  await Promise.all([
    page.getByRole('button', { name: /Remembered/ }).click(),
    second.getByRole('button', { name: /Remembered/ }).click(),
  ]);
  await expect
    .poll(
      async () =>
        (await page.getByRole('alert').count()) + (await second.getByRole('alert').count()),
    )
    .toBeGreaterThan(0);
  expect((await stored(page)).passageProgress['practice-one'].review.intervalStep).toBe(3);
  await second.close();
});
