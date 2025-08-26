import { ZoomMtg } from '@zoomus/websdk';

export interface ZoomConfig {
  sdkKey: string;
  sdkSecret: string;
  meetingNumber: string;
  passWord?: string;
  userName: string;
  userEmail: string;
  role: 0 | 1; // 0 = attendee, 1 = host
}

export class ZoomSDKService {
  private isInitialized = false;

  async initialize(sdkKey: string): Promise<void> {
    if (this.isInitialized) return;

    ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av');
    ZoomMtg.preLoadWasm();
    ZoomMtg.prepareWebSDK();

    await new Promise((resolve, reject) => {
      ZoomMtg.init({
        leaveUrl: window.location.origin,
        success: () => {
          this.isInitialized = true;
          resolve(void 0);
        },
        error: (error: any) => reject(error)
      });
    });
  }

  async joinMeeting(config: ZoomConfig): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Zoom SDK not initialized');
    }

    const signature = await this.generateSignature(config);

    return new Promise((resolve, reject) => {
      ZoomMtg.join({
        signature,
        sdkKey: config.sdkKey,
        meetingNumber: config.meetingNumber,
        passWord: config.passWord || '',
        userName: config.userName,
        userEmail: config.userEmail,
        success: () => resolve(),
        error: (error: any) => reject(error)
      });
    });
  }

  private async generateSignature(config: ZoomConfig): Promise<string> {
    // Call your backend to generate JWT signature
    const response = await fetch('/api/zoom/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meetingNumber: config.meetingNumber,
        role: config.role
      })
    });

    const { signature } = await response.json();
    return signature;
  }
}