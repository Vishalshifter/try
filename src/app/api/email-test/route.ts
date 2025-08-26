import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email-service';

export async function GET(request: NextRequest) {
  console.log('[EMAIL_TEST] Testing email service configuration');
  
  try {
    // Test email service configuration
    const emailService = new EmailService();
    const testResult = await emailService.testConfiguration();
    
    console.log('[EMAIL_TEST] Configuration test result:', testResult);
    
    return NextResponse.json({
      success: true,
      message: 'Email service configuration test completed',
      result: testResult
    });
    
  } catch (error: any) {
    console.error('[EMAIL_TEST] Error testing email service:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to test email service',
      details: {
        message: error.message,
        stack: error.stack
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('[EMAIL_TEST] Testing email sending functionality');
  
  try {
    const body = await request.json();
    const { toEmail } = body;
    
    if (!toEmail) {
      return NextResponse.json({
        success: false,
        error: 'toEmail parameter is required'
      }, { status: 400 });
    }
    
    const emailService = new EmailService();
    
    // Test sending an actual email
    const sendResult = await emailService.sendMeetingInvite({
      to: toEmail,
      meetingTitle: 'Test Meeting - Email Service Verification',
      platform: 'test',
      externalMeetingId: 'test-meeting-123',
      meetingDocId: 'test-doc-id',
      scheduledAt: new Date()
    });
    
    console.log('[EMAIL_TEST] Email send result:', sendResult);
    
    return NextResponse.json({
      success: true,
      message: 'Email send test completed',
      result: sendResult
    });
    
  } catch (error: any) {
    console.error('[EMAIL_TEST] Error sending test email:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send test email',
      details: {
        message: error.message,
        stack: error.stack
      }
    }, { status: 500 });
  }
}
