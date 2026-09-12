const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const sendFeedbackEmail = async (studentEmail, studentName, usn, sessionId) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email credentials not configured in .env file.");
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const loginUrl = process.env.FRONTEND_URL || 'https://feedback-mitmysore.vercel.app';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f7fe; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.06); border: 1px solid rgba(226, 232, 240, 0.8);">
        
        <!-- Header with Gradient -->
        <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center;">
          <div style="background: #ffffff; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); padding: 5px;">
            <img src="cid:collegelogo" alt="MITM Logo" style="width: 100%; height: auto; border-radius: 50%; object-fit: contain;" />
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Feedback Session Live</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Your insights shape our future.</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px;">
          <p style="color: #0f172a; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">Hello ${studentName || 'Student'},</p>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            A new anonymous feedback session has been initiated for your department. Your honest evaluation is crucial for maintaining and improving our academic standards.
          </p>
          
          <!-- Credentials Card -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin-bottom: 35px; position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(to bottom, #4F46E5, #7C3AED);"></div>
            <h3 style="margin: 0 0 20px 0; color: #0f172a; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Your Login Credentials</h3>
            
            <div style="margin-bottom: 15px;">
              <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px; font-weight: 500;">USN (Username)</p>
              <div style="background: #ffffff; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 10px; color: #0f172a; font-family: monospace; font-size: 18px; font-weight: 700; letter-spacing: 1px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                ${usn}
              </div>
            </div>
            
            <div>
              <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px; font-weight: 500;">Session ID (Password)</p>
              <div style="background: #ffffff; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 10px; color: #7C3AED; font-family: monospace; font-size: 18px; font-weight: 700; letter-spacing: 1px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                ${sessionId}
              </div>
            </div>
          </div>

          <!-- Call to Action -->
          <div style="text-align: center;">
            <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3); transition: transform 0.2s;">
              Access Feedback Portal
            </a>
            <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 14px;">
              Or visit: <a href="${loginUrl}" style="color: #4F46E5; text-decoration: none; font-weight: 500;">${loginUrl}</a>
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0; font-weight: 500;">🔒 Your feedback is 100% anonymous</p>
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated message from the College Administration. Please do not reply.</p>
        </div>
        
      </div>
    </body>
    </html>
  `;

  const attachments = [];
  const logoPath = path.join(__dirname, '../../feedback-system/public/logo.jpeg');
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'logo.jpeg',
      path: logoPath,
      cid: 'collegelogo'
    });
  }

  const mailOptions = {
    from: `"College Admin" <${process.env.EMAIL_USER}>`,
    to: studentEmail,
    subject: `Action Required: New Feedback Session (${sessionId})`,
    html: htmlContent,
    attachments
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendFeedbackEmail };
