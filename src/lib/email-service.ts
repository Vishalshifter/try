import { Resend } from 'resend';

export interface InviteEmail {
  to: string;
  meetingTitle: string;
  platform: string;
  externalMeetingId: string;
  meetingDocId: string;
  scheduledAt?: Date;
}

export interface EmailSendResult {
  success: boolean;
  email: string;
  error?: string;
  response?: any;
}

export class EmailService {
  private client: Resend;

  constructor() {
    console.log('[EMAIL_SERVICE] Initializing email service');
    
    if (!process.env.RESEND_API_KEY) {
      const error = 'RESEND_API_KEY not configured in environment variables';
      console.error('[EMAIL_SERVICE] Configuration error:', error);
      throw new Error(error);
    }

    if (!process.env.RESEND_API_KEY.startsWith('re_')) {
      console.warn('[EMAIL_SERVICE] RESEND_API_KEY format appears incorrect - should start with "re_"');
    }

    this.client = new Resend(process.env.RESEND_API_KEY);
    console.log('[EMAIL_SERVICE] Email service initialized successfully');
  }

  async sendMeetingInvite(invite: InviteEmail): Promise<EmailSendResult> {
    const startTime = Date.now();
    console.log('[EMAIL_SERVICE] Starting to send meeting invite:', {
      to: invite.to,
      meetingTitle: invite.meetingTitle,
      platform: invite.platform,
      meetingId: invite.externalMeetingId
    });

    try {
      const subject = `Invite: ${invite.meetingTitle}`;
      const when = invite.scheduledAt ? invite.scheduledAt.toLocaleString() : 'now';
      const html = `
        <div>
          <h2 style="margin:0 0 8px;">${invite.meetingTitle}</h2>
          <p style="margin:0 0 8px;">Platform: <b>${invite.platform}</b></p>
          <p style="margin:0 0 8px;">Meeting ID/Link: <code>${invite.externalMeetingId}</code></p>
          <p style="margin:0 0 8px;">Scheduled: ${when}</p>
          <p style="margin:16px 0 0; font-size:12px; color:#666;">Meeting ref: ${invite.meetingDocId}</p>
        </div>
      `;

      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Meeting Assistant <no-reply@mom-notes.app>';
      console.log('[EMAIL_SERVICE] Sending email with details:', {
        from: fromEmail,
        to: invite.to,
        subject,
        htmlLength: html.length
      });

      const response = await this.client.emails.send({
        from: fromEmail,
        to: invite.to,
        subject,
        html,
      });

      const duration = Date.now() - startTime;
      
      // Handle Resend API response structure
      let responseId: string = 'unknown';
      let responseStatus: string = 'unknown';
      
      if (response && typeof response === 'object') {
        // Check different possible response structures
        if ('id' in response && typeof response.id === 'string') {
          responseId = response.id;
        } else if (response.data && 'id' in response.data && typeof response.data.id === 'string') {
          responseId = response.data.id;
        }
        
        if ('status' in response && typeof response.status === 'string') {
          responseStatus = response.status;
        } else if (response.data && 'status' in response.data && typeof response.data.status === 'string') {
          responseStatus = response.data.status;
        }
      }

      console.log('[EMAIL_SERVICE] Email sent successfully:', {
        to: invite.to,
        duration: `${duration}ms`,
        responseId,
        responseStatus
      });

      return {
        success: true,
        email: invite.to,
        response: response
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('[EMAIL_SERVICE] Failed to send email:', {
        to: invite.to,
        duration: `${duration}ms`,
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        stack: error.stack
      });

      // Log additional Resend-specific error information if available
      if (error.response) {
        console.error('[EMAIL_SERVICE] Resend API response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }

      return {
        success: false,
        email: invite.to,
        error: error.message || 'Unknown error occurred',
        response: error.response
      };
    }
  }

  // Utility method to validate email service configuration
  validateConfiguration(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!process.env.RESEND_API_KEY) {
      issues.push('RESEND_API_KEY environment variable is not set');
    } else if (!process.env.RESEND_API_KEY.startsWith('re_')) {
      issues.push('RESEND_API_KEY format appears incorrect (should start with "re_")');
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      issues.push('RESEND_FROM_EMAIL environment variable is not set');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // Debug method to test email configuration
  async testConfiguration(): Promise<{ success: boolean; message: string; details?: any }> {
    console.log('[EMAIL_SERVICE] Testing email configuration');
    
    const configValidation = this.validateConfiguration();
    if (!configValidation.isValid) {
      return {
        success: false,
        message: 'Email configuration validation failed',
        details: configValidation.issues
      };
    }

    try {
      // Test configuration by attempting to send a test email to ourselves
      console.log('[EMAIL_SERVICE] Testing email service connectivity');
      
      // Just validate that we can create the client without errors
      // Actual email sending will be tested during normal operation
      return {
        success: true,
        message: 'Email service configuration appears valid',
        details: {
          hasApiKey: !!process.env.RESEND_API_KEY,
          hasFromEmail: !!process.env.RESEND_FROM_EMAIL
        }
      };
    } catch (error: any) {
      console.error('[EMAIL_SERVICE] Configuration test failed:', error.message);
      
      return {
        success: false,
        message: 'Email service configuration test failed',
        details: {
          error: error.message
        }
      };
    }
  }
}


