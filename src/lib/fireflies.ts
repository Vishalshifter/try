interface FirefliesConfig {
  apiKey: string;
  userId: string;
  baseUrl?: string;
}

interface MeetingInvite {
  title: string;
  start_time: string;
  end_time?: string;
  attendees: Array<{
    name: string;
    email: string;
  }>;
  meeting_url?: string;
  timezone?: string;
}

interface TranscriptData {
  id: string;
  title: string;
  meeting_url: string;
  transcript_url: string;
  summary: string;
  action_items: string[];
  keywords: string[];
  duration: number;
  date: string;
}

export class FirefliesClient {
  private config: FirefliesConfig;
  private baseUrl: string;

  constructor(config: FirefliesConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.fireflies.ai/graphql';
  }

  private async makeRequest(query: string, variables?: any) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Fireflies API error: ${response.statusText}`);
    }

    return response.json();
  }

  async inviteToMeeting(meetingData: MeetingInvite) {
    const mutation = `
      mutation CreateMeetingInvite($input: MeetingInviteInput!) {
        createMeetingInvite(input: $input) {
          id
          status
        }
      }
    `;

    return this.makeRequest(mutation, { input: meetingData });
  }

  async getTranscripts(limit = 10) {
    const query = `
      query GetTranscripts($userId: String!, $limit: Int) {
        transcripts(user_id: $userId, limit: $limit) {
          id
          title
          meeting_url
          transcript_url
          summary
          action_items
          keywords
          duration
          date
        }
      }
    `;

    return this.makeRequest(query, { 
      userId: this.config.userId, 
      limit 
    });
  }

  async getTranscriptById(transcriptId: string): Promise<TranscriptData> {
    const query = `
      query GetTranscript($transcriptId: String!) {
        transcript(id: $transcriptId) {
          id
          title
          meeting_url
          transcript_url
          summary
          action_items
          keywords
          duration
          date
          sentences {
            text
            speaker_name
            start_time
            end_time
          }
        }
      }
    `;

    const result = await this.makeRequest(query, { transcriptId });
    return result.data.transcript;
  }
}

export const fireflies = new FirefliesClient({
  apiKey: process.env.FIREFLIES_API_KEY!,
  userId: process.env.FIREFLIES_USER_ID!,
});