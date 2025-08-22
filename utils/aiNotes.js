export function generateAINotes(transcript) {
  return `AI Notes (simulated):\n${transcript
    .split('.')
    .map((s) => s.trim() && `- ${s.trim()}`)
    .filter(Boolean)
    .join('\n')}`;
}
