export function normalizeWords(text: string): string[] {
  return text
    .normalize('NFC')
    .toLocaleLowerCase('en')
    .replace(/['’‘ʼ]/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/u)
    .filter(Boolean);
}
export function normalizeReference(reference: string): string {
  return reference
    .normalize('NFC')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]/gu, '');
}
export interface Difference {
  kind: 'correct' | 'missing' | 'extra' | 'incorrect';
  expected?: string;
  actual?: string;
}
export function compareWords(expected: string, actual: string): Difference[] {
  const a = normalizeWords(expected),
    b = normalizeWords(actual);
  const rows = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      rows[i][j] =
        a[i] === b[j] ? 1 + rows[i + 1][j + 1] : Math.max(rows[i + 1][j], rows[i][j + 1]);
  const raw: Difference[] = [];
  let i = 0,
    j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      raw.push({ kind: 'correct', expected: a[i++], actual: b[j++] });
    } else if (i < a.length && (j === b.length || rows[i + 1][j] >= rows[i][j + 1]))
      raw.push({ kind: 'missing', expected: a[i++] });
    else raw.push({ kind: 'extra', actual: b[j++] });
  }
  const result: Difference[] = [];
  for (let k = 0; k < raw.length;) {
    if (raw[k].kind === 'correct') {
      result.push(raw[k++]);
      continue;
    }
    const missing: string[] = [],
      extra: string[] = [];
    while (k < raw.length && raw[k].kind !== 'correct') {
      if (raw[k].expected) missing.push(raw[k].expected!);
      if (raw[k].actual) extra.push(raw[k].actual!);
      k++;
    }
    for (let n = 0; n < Math.max(missing.length, extra.length); n++)
      result.push({
        kind: missing[n] && extra[n] ? 'incorrect' : missing[n] ? 'missing' : 'extra',
        expected: missing[n],
        actual: extra[n],
      });
  }
  return result;
}
export function tokens(text: string): string[] {
  return text.match(/\s+|[^\s]+/gu) ?? [];
}
export function wordOrder(length: number, random = Math.random): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
export function firstLetter(word: string): string {
  let seen = false;
  return word.replace(/[\p{L}\p{N}]+/gu, (part) => {
    if (seen) return '';
    seen = true;
    return [...part][0];
  });
}
