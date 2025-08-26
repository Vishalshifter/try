import OpenAI from 'openai';
import { SummaryResult, ActionItem, Meeting } from '@/types';

export class SummarizationService {
  private openai: OpenAI;
  private config: {
    model: string;
    temperature: number;
    maxTokens: number;
    maxRetries: number;
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION,
    });

    this.config = {
      model: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 2000,
      maxRetries: 3,
    };
  }

  async generateMeetingSummary(
    transcript: string,
    meeting: Partial<Meeting>,
    options: {
      includeActionItems?: boolean;
      includeDecisions?: boolean;
      includeKeyTopics?: boolean;
      includeSentiment?: boolean;
      customPrompt?: string;
    } = {}
  ): Promise<SummaryResult> {
    try {
      const {
        includeActionItems = true,
        includeDecisions = true,
        includeKeyTopics = true,
        includeSentiment = true,
        customPrompt,
      } = options;

      const systemPrompt = this.buildSystemPrompt(includeActionItems, includeDecisions, includeKeyTopics, includeSentiment);
      const userPrompt = this.buildUserPrompt(transcript, meeting, customPrompt);

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return this.parseSummaryResponse(content, includeActionItems, includeDecisions, includeKeyTopics, includeSentiment);
    } catch (error) {
      console.error('Summary generation failed:', error);
      throw new Error(`Summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateActionItems(
    transcript: string,
    participants: string[]
  ): Promise<ActionItem[]> {
    try {
      const systemPrompt = `You are an expert at identifying action items from meeting transcripts. Extract all action items with the following format:
- Task: Clear description of what needs to be done
- Owner: Who is responsible (must be one of the participants)
- Due Date: When it needs to be completed (if mentioned)
- Priority: Low, Medium, or High based on urgency and importance

Return the response as a JSON array of action items.`;

      const userPrompt = `Participants: ${participants.join(', ')}

Transcript:
${transcript}

Extract all action items from this transcript.`;

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const parsed = JSON.parse(content);
      return this.parseActionItems(parsed.actionItems || parsed);
    } catch (error) {
      console.error('Action items generation failed:', error);
      throw new Error(`Action items generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateDecisions(
    transcript: string
  ): Promise<string[]> {
    try {
      const systemPrompt = `You are an expert at identifying key decisions made during meetings. Extract all decisions that were made or agreed upon. Focus on:
- Final decisions and agreements
- Policy changes
- Strategic directions
- Resource allocations
- Timeline commitments

Return the response as a JSON array of decision strings.`;

      const userPrompt = `Transcript:
${transcript}

Extract all key decisions from this transcript.`;

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const parsed = JSON.parse(content);
      return parsed.decisions || parsed || [];
    } catch (error) {
      console.error('Decisions generation failed:', error);
      throw new Error(`Decisions generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeSentiment(
    transcript: string
  ): Promise<'positive' | 'neutral' | 'negative'> {
    try {
      const systemPrompt = `Analyze the overall sentiment of this meeting transcript. Consider:
- Tone of discussion
- Agreement vs disagreement
- Positive vs negative language
- Overall mood and atmosphere

Return only one word: positive, neutral, or negative.`;

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        temperature: 0.1,
        max_tokens: 10,
      });

      const content = response.choices[0]?.message?.content?.toLowerCase().trim();
      if (content === 'positive' || content === 'negative') {
        return content;
      }
      return 'neutral';
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return 'neutral';
    }
  }

  private buildSystemPrompt(
    includeActionItems: boolean,
    includeDecisions: boolean,
    includeKeyTopics: boolean,
    includeSentiment: boolean
  ): string {
    let prompt = `You are an expert meeting assistant that creates comprehensive meeting summaries. `;
    
    if (includeActionItems) {
      prompt += `Extract action items with clear tasks, owners, and due dates. `;
    }
    
    if (includeDecisions) {
      prompt += `Identify key decisions and agreements made. `;
    }
    
    if (includeKeyTopics) {
      prompt += `Highlight main discussion topics and themes. `;
    }
    
    if (includeSentiment) {
      prompt += `Analyze the overall sentiment and tone. `;
    }
    
    prompt += `Provide a concise but comprehensive summary that captures the essence of the meeting.`;
    
    return prompt;
  }

  private buildUserPrompt(
    transcript: string,
    meeting: Partial<Meeting>,
    customPrompt?: string
  ): string {
    let prompt = `Meeting Title: ${meeting.title || 'Untitled'}\n`;
    
    if (meeting.participants) {
      prompt += `Participants: ${meeting.participants.map(p => p.name).join(', ')}\n`;
    }
    
    if (meeting.scheduledAt) {
      prompt += `Date: ${new Date(meeting.scheduledAt).toLocaleDateString()}\n`;
    }
    
    prompt += `\nTranscript:\n${transcript}`;
    
    if (customPrompt) {
      prompt += `\n\nAdditional Instructions: ${customPrompt}`;
    }
    
    return prompt;
  }

  private parseSummaryResponse(
    content: string,
    includeActionItems: boolean,
    includeDecisions: boolean,
    includeKeyTopics: boolean,
    includeSentiment: boolean
  ): SummaryResult {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      
      return {
        summary: parsed.summary || content,
        actionItems: includeActionItems ? this.parseActionItems(parsed.actionItems || []) : [],
        decisions: includeDecisions ? (parsed.decisions || []) : [],
        keyTopics: includeKeyTopics ? (parsed.keyTopics || []) : [],
        sentiment: includeSentiment ? (parsed.sentiment || 'neutral') : 'neutral',
        duration: parsed.duration || 0,
      };
    } catch {
      // Fallback to parsing plain text
      return {
        summary: content,
        actionItems: [],
        decisions: [],
        keyTopics: [],
        sentiment: 'neutral',
        duration: 0,
      };
    }
  }

  private parseActionItems(items: any[]): ActionItem[] {
    return items.map((item, index) => ({
      id: `action_${Date.now()}_${index}`,
      task: item.task || item.description || 'Unknown task',
      owner: item.owner || item.assignee || 'Unassigned',
      dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
      status: 'pending',
      priority: item.priority || 'medium',
      createdAt: new Date(),
    }));
  }

  // Alternative AI services
  async generateSummaryWithClaude(
    transcript: string,
    meeting: Partial<Meeting>
  ): Promise<SummaryResult> {
    // Implementation for Anthropic Claude
    throw new Error('Claude integration not implemented');
  }

  async generateSummaryWithGemini(
    transcript: string,
    meeting: Partial<Meeting>
  ): Promise<SummaryResult> {
    // Implementation for Google Gemini
    throw new Error('Gemini integration not implemented');
  }
}
