export function dateLabel(day: string) {
  const date = day.includes('T') ? new Date(day) : new Date(`${day}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
