export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { transcript } = req.body;
  // Simulate AI note generation (replace with OpenAI API in real app)
  const aiNotes = `AI Notes (simulated):\n${transcript
    .split('.')
    .map((s, i) => s.trim() && `- ${s.trim()}`)
    .filter(Boolean)
    .join('\n')}`;
  res.status(200).json({ notes: aiNotes });
}
