// AI Notes Generation Utility

export interface AINotesOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface MeetingSummary {
  summary: string;
  actionItems: string[];
  decisions: string[];
  keyPoints: string[];
}

export async function generateAINotes(
  transcript: string,
  options: AINotesOptions = {}
): Promise<string> {
  const {
    model = 'gpt-3.5-turbo',
    maxTokens = 512,
    temperature = 0.7
  } = options;

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are an expert meeting assistant. Analyze the meeting transcript and generate structured notes including:
1. Meeting Summary: A concise overview of the meeting
2. Action Items: Specific tasks with owners and deadlines
3. Decisions Made: Key decisions and agreements
4. Key Points: Important discussion points and insights

Format the response in a clear, structured markdown format.`
          },
          {
            role: 'user',
            content: `Please analyze this meeting transcript and generate comprehensive meeting notes:\n\n${transcript}`
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No notes generated.';
  } catch (error) {
    console.error('Error generating AI notes:', error);
    throw error;
  }
}

export async function parseStructuredNotes(notes: string): Promise<MeetingSummary> {
  // Parse the AI-generated notes into structured data
  const summary: MeetingSummary = {
    summary: '',
    actionItems: [],
    decisions: [],
    keyPoints: []
  };

  const lines = notes.split('\n');
  let currentSection: keyof MeetingSummary | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.match(/^#+\s*summary/i)) {
      currentSection = 'summary';
    } else if (trimmedLine.match(/^#+\s*action\s*items/i)) {
      currentSection = 'actionItems';
    } else if (trimmedLine.match(/^#+\s*decisions/i)) {
      currentSection = 'decisions';
    } else if (trimmedLine.match(/^#+\s*key\s*points/i)) {
      currentSection = 'keyPoints';
    } else if (currentSection && trimmedLine) {
      if (currentSection === 'summary') {
        summary.summary += trimmedLine + ' ';
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        summary[currentSection].push(trimmedLine.substring(2).trim());
      }
    }
  }

  // Clean up summary
  summary.summary = summary.summary.trim();

  return summary;
}

export function simulateTranscript(meetingTitle: string, participants: string[]): string {
  const topics = [
    'Project planning and timeline discussion',
    'Budget review and allocation',
    'Team updates and progress reports',
    'Client feedback and requirements',
    'Technical challenges and solutions',
    'Next steps and action items'
  ];

  const phrases = [
    'Let me start by saying...',
    'I think we should consider...',
    'From my perspective...',
    'What if we tried...',
    'I agree with that approach...',
    'We need to prioritize...',
    'The main challenge is...',
    'I suggest we...',
    'Let me clarify that point...',
    'To summarize what we discussed...'
  ];

  let transcript = `Meeting: ${meetingTitle}\n`;
  transcript += `Participants: ${participants.join(', ')}\n\n`;
  transcript += `Date: ${new Date().toLocaleDateString()}\n\n`;

  // Generate conversation
  for (let i = 0; i < 5; i++) {
    const speaker = participants[Math.floor(Math.random() * participants.length)];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    transcript += `${speaker}: ${phrase} Regarding ${topic.toLowerCase()}.\n`;
  }

  transcript += `\nMeeting concluded with action items and next steps.`;

  return transcript;
}
