import nodemailer from 'nodemailer';

export class GmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD // Use App Password, not regular password
      }
    });
  }

  async sendMeetingInvite(invite: any) {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: invite.to,
      subject: `Invite: ${invite.meetingTitle}`,
      html: `
        <div>
          <h2>${invite.meetingTitle}</h2>
          <p>Platform: <b>${invite.platform}</b></p>
          <p>Meeting Link: ${invite.externalMeetingId}</p>
        </div>
      `
    };

    return await this.transporter.sendMail(mailOptions);
  }
}