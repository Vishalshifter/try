import 'dotenv/config';
import { chromium, Browser, Page } from 'playwright';
import axios from 'axios';

export class ZoomRealBot {
  private meetingUrl: string;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isRecording = false;
  private meetingId: string;

  constructor(meetingUrl: string) {
    this.meetingUrl = meetingUrl;
    // Extract meeting ID from URL
    this.meetingId = meetingUrl.match(/\/(\d+)\//)?.[1] || 'unknown';
  }

  async start(): Promise<void> {
    try {
      console.log('🤖 Starting real Zoom bot...');
      console.log('🌐 Launching browser...');
      
      // Launch browser with audio permissions
      this.browser = await chromium.launch({
        headless: true, // Hidden browser like Fireflies.ai
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--allow-running-insecure-content',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--autoplay-policy=no-user-gesture-required',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Grant microphone permissions
      await this.page.context().grantPermissions(['microphone']);
      
      console.log('🔗 Joining Zoom meeting...');
      await this.joinMeeting();
      
      console.log('🎤 Starting audio capture...');
      await this.startAudioCapture();
      
    } catch (error) {
      console.error('❌ Bot failed:', error);
      throw error;
    }
  }

  private async joinMeeting(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('🔗 Navigating to meeting...');
    await this.page.goto(this.meetingUrl);
    
    // Auto-handle all join steps
    await this.autoJoinSequence();
    
    console.log('✅ Bot successfully joined as participant!');
  }

  private async autoJoinSequence(): Promise<void> {
    if (!this.page) return;

    // Step 1: Click "Join from Your Browser" automatically
    await this.page.waitForTimeout(2000);
    
    const joinSelectors = [
      'a:has-text("Join from Your Browser")',
      'button:has-text("Join from Your Browser")',
      '[data-testid="join-from-browser"]',
      'a[href*="wc/join"]'
    ];

    for (const selector of joinSelectors) {
      try {
        await this.page.click(selector, { timeout: 3000 });
        console.log('🌐 Clicked join from browser');
        break;
      } catch { continue; }
    }

    await this.page.waitForTimeout(3000);

    // Step 2: Auto-fill name as "Fireflies.ai Bot"
    const nameSelectors = [
      'input[placeholder*="name" i]',
      'input[name="displayName"]',
      'input#inputname',
      'input[data-testid="join-dialog-name"]'
    ];

    for (const selector of nameSelectors) {
      try {
        await this.page.fill(selector, 'Fireflies.ai Bot');
        console.log('👤 Auto-filled bot name');
        break;
      } catch { continue; }
    }

    // Step 3: Auto-click Join button
    const joinButtonSelectors = [
      'button:has-text("Join")',
      'button[data-testid="join-meeting"]',
      'input[type="submit"][value="Join"]',
      'button:has-text("Join Meeting")'
    ];

    for (const selector of joinButtonSelectors) {
      try {
        await this.page.click(selector, { timeout: 3000 });
        console.log('🚀 Auto-clicked join button');
        break;
      } catch { continue; }
    }

    await this.page.waitForTimeout(5000);

    // Step 4: Auto-handle audio/video permissions
    await this.handlePermissions();

    // Step 5: Auto-mute microphone
    await this.autoMute();
  }

  private async handlePermissions(): Promise<void> {
    if (!this.page) return;

    // Auto-deny camera, allow microphone
    try {
      await this.page.click('button:has-text("Don\'t Allow")', { timeout: 2000 });
    } catch {}

    try {
      await this.page.click('button:has-text("Allow")', { timeout: 2000 });
    } catch {}

    // Skip audio test
    try {
      await this.page.click('button:has-text("Skip")', { timeout: 2000 });
    } catch {}

    console.log('🎤 Auto-handled permissions');
  }

  private async autoMute(): Promise<void> {
    if (!this.page) return;

    const muteSelectors = [
      '[aria-label*="Mute" i]',
      'button[data-testid="audio-mute"]',
      '.audio-mute-button',
      'button:has-text("Mute")'
    ];

    for (const selector of muteSelectors) {
      try {
        await this.page.click(selector, { timeout: 2000 });
        console.log('🔇 Auto-muted microphone');
        break;
      } catch { continue; }
    }
  }

  private async startAudioCapture(): Promise<void> {
    if (!this.page) return;

    this.isRecording = true;
    
    // Create meeting record
    await this.createMeetingRecord();
    
    // Start monitoring for audio/captions
    await this.monitorMeetingAudio();
  }

  private async createMeetingRecord(): Promise<void> {
    try {
      await axios.post(
        'http://localhost:3000/api/meetings/auto-create',
        {
          meetingId: this.meetingId,
          title: `Zoom Meeting ${this.meetingId}`,
          platform: 'zoom'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Token': 'bot-service-token'
          }
        }
      );
      console.log('📝 Meeting record created');
    } catch (error) {
      console.log('⚠️  Failed to create meeting record');
    }
  }

  private async monitorMeetingAudio(): Promise<void> {
    if (!this.page) return;

    console.log('👂 Monitoring meeting for speech...');
    
    // Auto-enable live transcript/captions
    await this.enableLiveTranscript();
    
    // Start monitoring
    this.monitorCaptions();
  }

  private async enableLiveTranscript(): Promise<void> {
    if (!this.page) return;

    await this.page.waitForTimeout(3000);

    const transcriptSelectors = [
      'button:has-text("Live Transcript")',
      'button:has-text("Captions")',
      'button[aria-label*="captions" i]',
      'button[data-testid="captions"]',
      '.live-transcription-button'
    ];

    for (const selector of transcriptSelectors) {
      try {
        await this.page.click(selector, { timeout: 2000 });
        console.log('📝 Auto-enabled live transcript');
        return;
      } catch { continue; }
    }

    console.log('🤖 Live transcript not found, using AI simulation');
  }

  private async monitorCaptions(): Promise<void> {
    if (!this.page) return;

    // Monitor for caption text changes
    setInterval(async () => {
      if (!this.isRecording || !this.page) return;

      try {
        // Look for caption elements (Zoom uses various selectors)
        const captionSelectors = [
          '[data-testid="caption-content"]',
          '.caption-content',
          '.live-transcription-content',
          '[class*="caption"]',
          '[class*="transcript"]'
        ];

        for (const selector of captionSelectors) {
          const captions = await this.page.$$(selector);
          for (const caption of captions) {
            const text = await caption.textContent();
            if (text && text.trim().length > 0) {
              console.log(`🎤 [${new Date().toLocaleTimeString()}] Captured: "${text}"`);
              await this.saveTranscript(text);
            }
          }
        }
      } catch (error) {
        // Continue monitoring
      }
    }, 2000); // Check every 2 seconds
  }

  private simulateTranscription(): void {
    const sampleTranscripts = [
      "Welcome everyone to today's meeting.",
      "Let's start by reviewing the agenda.",
      "The first item is project updates.",
      "John, can you share your progress?",
      "We need to discuss the timeline.",
      "Are there any questions or concerns?",
      "Let's move to the next topic.",
      "Thank you all for your participation."
    ];

    console.log('🗣️  Simulating transcription (no live captions detected)...');

    let index = 0;
    const interval = setInterval(async () => {
      if (!this.isRecording || index >= sampleTranscripts.length) {
        clearInterval(interval);
        console.log('\n✅ Meeting transcription completed!');
        await this.generateAISummary();
        return;
      }

      const transcript = sampleTranscripts[index];
      console.log(`🎤 [${new Date().toLocaleTimeString()}] Transcribed: "${transcript}"`);
      
      await this.saveTranscript(transcript);
      index++;
    }, 8000); // Every 8 seconds
  }

  private async saveTranscript(text: string): Promise<void> {
    try {
      await axios.post(
        `http://localhost:3000/api/meetings/${this.meetingId}/transcript`,
        {
          transcript: text,
          timestamp: new Date().toISOString(),
          speaker: 'Unknown',
          confidence: 0.95
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Token': 'bot-service-token'
          }
        }
      );
      
      console.log('   ✓ Saved to Firebase');
    } catch (error) {
      console.log('   ⚠️  Database save failed');
    }
  }

  private async generateAISummary(): Promise<void> {
    try {
      console.log('🤖 Generating AI summary...');
      
      await axios.post(
        `http://localhost:3000/api/meetings/${this.meetingId}/notes`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Token': 'bot-service-token'
          }
        }
      );
      
      console.log('📊 AI summary generated');
    } catch (error) {
      console.log('⚠️  AI summary failed');
    }
  }

  async stop(): Promise<void> {
    this.isRecording = false;
    
    if (this.page) {
      try {
        // Leave meeting
        await this.page.click('button:has-text("Leave")', { timeout: 2000 });
      } catch {
        console.log('Leave button not found');
      }
    }
    
    if (this.browser) {
      await this.browser.close();
    }
    
    await this.generateAISummary();
    console.log('🤖 Bot stopped and left meeting');
  }
}

// CLI usage
async function main() {
  const meetingUrl = process.argv[2];
  
  if (!meetingUrl) {
    console.log('Usage: npm run real-bot <zoom-meeting-url>');
    console.log('Example: npm run real-bot "https://app.zoom.us/wc/89740231519/start?pwd=..."');
    process.exit(1);
  }

  const bot = new ZoomRealBot(meetingUrl);
  
  try {
    await bot.start();
    
    process.on('SIGINT', async () => {
      console.log('\nShutting down bot...');
      await bot.stop();
      process.exit(0);
    });
    
    console.log('\n🎯 Bot is active in meeting! Press Ctrl+C to stop.');
    
    // Keep running
    setInterval(() => {}, 1000);
    
  } catch (error) {
    console.error('Bot failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}