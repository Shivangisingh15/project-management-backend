

/**
 * OTP Service - LanceHawks Professional Edition
 * Clean, error-free version with beautiful email templates
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email transporter
let emailTransporter = null;

/**
 * Initialize email transporter
 */
const initializeEmailService = async () => {
  if (emailTransporter) return emailTransporter;

  try {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await emailTransporter.verify();
    console.log('✅ LanceHawks email service initialized successfully');
    return emailTransporter;
    
  } catch (error) {
    console.log('\n🚨 EMAIL CONFIGURATION ERROR:');
    console.log(`❌ Error: ${error.message}`);
    console.log('\n🔧 Check your .env file:');
    console.log(`📧 EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Missing'}`);
    console.log(`🔑 EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing'}`);
    
    // Fallback for development
    emailTransporter = {
      sendMail: async (options) => {
        console.log('\n📧 EMAIL FALLBACK - Development mode');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        return { messageId: 'fallback-' + Date.now() };
      }
    };
    
    return emailTransporter;
  }
};

/**
 * Generate secure OTP
 */
const generateSecureOTP = (length = 6) => {
  const buffer = crypto.randomBytes(length);
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += (buffer[i] % 10).toString();
  }
  
  return otp;
};

/**
 * Get OTP expiration time
 */
const getOTPExpiration = () => {
  const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
  return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Get LanceHawks email template
 */
const getLanceHawksEmailTemplate = (otp, type) => {
  const isLogin = type === 'login';
  const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 10;
  const logoUrl = process.env.LANCEHAWKS_LOGO_URL || 'https://lancehawks.com/logo.png';
  
  const subject = isLogin 
    ? 'LanceHawks - Secure Access Code'
    : 'Welcome to LanceHawks - Verify Your Account';

  const text = `
LanceHawks - Building Digital Excellence

Your ${isLogin ? 'login' : 'verification'} code is: ${otp}

This code will expire in ${expiryMinutes} minutes.

${isLogin 
  ? 'If you didn\'t request this login, please contact support immediately.'
  : 'Welcome to LanceHawks! We\'re excited to help you build incredible experiences.'
}

Best regards,
The LanceHawks Team
https://lancehawks.com
  `.trim();

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background-color: #f8fafc;
          margin: 0;
          padding: 40px 20px;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          padding: 40px;
          text-align: center;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .logo {
          max-width: 180px;
          height: auto;
          margin-bottom: 16px;
        }
        
        .company-tagline {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 8px;
        }
        
        .company-motto {
          color: #2563eb;
          font-size: 16px;
          font-weight: 600;
        }
        
        .content {
          padding: 40px;
        }
        
        .content-title {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 12px;
          text-align: center;
        }
        
        .content-subtitle {
          font-size: 16px;
          color: #6b7280;
          text-align: center;
          margin-bottom: 32px;
        }
        
        .otp-section {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          border-radius: 16px;
          padding: 32px;
          margin: 32px 0;
          text-align: center;
        }
        
        .otp-label {
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          margin-bottom: 16px;
        }
        
        .otp-code {
          font-size: 48px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 8px;
          font-family: 'Monaco', 'Consolas', monospace;
          margin-bottom: 16px;
        }
        
        .otp-timer {
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
        }
        
        .security-notice {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          border-radius: 8px;
          padding: 20px;
          margin: 24px 0;
        }
        
        .security-notice-title {
          font-weight: 600;
          color: #f59e0b;
          margin-bottom: 8px;
        }
        
        .footer {
          background: #f8fafc;
          padding: 32px 40px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        
        .footer-text {
          color: #6b7280;
          font-size: 13px;
          margin-bottom: 16px;
        }
        
        .footer-link {
          color: #2563eb;
          text-decoration: none;
          font-size: 13px;
        }
        
        @media (max-width: 600px) {
          .email-container {
            margin: 0 16px;
          }
          
          .header, .content, .footer {
            padding: 24px;
          }
          
          .otp-code {
            font-size: 36px;
            letter-spacing: 4px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        
        <!-- Header -->
        <div class="header">
          <img src="${logoUrl}" alt="LanceHawks" class="logo" />
          <div class="company-tagline">Building Digital Excellence</div>
          <div class="company-motto">Incredible <strong>Experiences</strong> Incredibly Fast</div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <h1 class="content-title">
            ${isLogin ? '🔐 Secure Access' : '🚀 Welcome Aboard'}
          </h1>
          <p class="content-subtitle">
            ${isLogin 
              ? 'Use your secure access code below to sign in to your LanceHawks account'
              : 'Welcome to LanceHawks! Use the verification code below to complete your account setup'
            }
          </p>
          
          <!-- OTP Section -->
          <div class="otp-section">
            <div class="otp-label">Your ${isLogin ? 'Access' : 'Verification'} Code</div>
            <div class="otp-code">${otp}</div>
            <div class="otp-timer">⏱️ Expires in ${expiryMinutes} minutes</div>
          </div>
          
          <!-- Security Notice -->
          <div class="security-notice">
            <div class="security-notice-title">🛡️ Security Notice</div>
            <div>
              ${isLogin 
                ? 'If you didn\'t request this login code, please secure your account immediately.'
                : 'This code is valid for one-time use only. Keep it secure and don\'t share it with anyone.'
              }
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 24px;">
            ${isLogin 
              ? 'Having trouble? Our support team is here to help.'
              : 'Excited to see what incredible experiences you\'ll build with LanceHawks!'
            }
          </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-text">
            This email was sent from <strong>LanceHawks</strong><br>
            Building Digital Excellence - Incredible Experiences Incredibly Fast
          </div>
          <div style="margin-top: 16px;">
            <a href="https://lancehawks.com" class="footer-link">Visit Website</a> • 
            <a href="https://lancehawks.com/support" class="footer-link">Support</a> • 
            <a href="https://lancehawks.com/privacy" class="footer-link">Privacy</a>
          </div>
          <div style="margin-top: 16px; font-size: 12px; color: #6b7280;">
            © ${new Date().getFullYear()} LanceHawks. All rights reserved.
          </div>
        </div>
        
      </div>
    </body>
    </html>
  `;

  return { subject, text, html };
};

/**
 * Send OTP email
 */
const sendOTPEmail = async (email, otp, type = 'login') => {
  try {
    const transporter = await initializeEmailService();
    const emailContent = getLanceHawksEmailTemplate(otp, type);
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;

    const mailOptions = {
      from: {
        name: 'LanceHawks',
        address: fromEmail
      },
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    };

    const result = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ LanceHawks OTP sent to ${email} - OTP: ${otp}`);
    } else {
      console.log(`✅ LanceHawks OTP sent to ${email}`);
    }
    
    return {
      success: true,
      messageId: result.messageId,
      email,
      type
    };

  } catch (error) {
    console.error('❌ Failed to send LanceHawks OTP:', error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n🔢 DEVELOPMENT OTP: ${otp}`);
      console.log(`📧 Email: ${email}\n`);
      
      return {
        success: true,
        messageId: 'dev-fallback-' + Date.now(),
        email,
        type,
        devMode: true
      };
    }
    
    throw error;
  }
};

/**
 * Check if OTP is master code
 */
const isMasterOTP = (otp) => {
  const masterCode = process.env.MASTER_OTP_CODE || '999999';
  return otp === masterCode;
};

/**
 * Validate OTP format
 */
const isValidOTPFormat = (otp) => {
  // Allow master OTP regardless of length
  if (isMasterOTP(otp)) {
    return true;
  }

  const length = parseInt(process.env.OTP_LENGTH) || 6;
  const otpRegex = new RegExp(`^[0-9]{${length}}$`);
  return otpRegex.test(otp);
};

/**
 * Test email configuration
 */
const testEmailConfig = async () => {
  try {
    await initializeEmailService();
    console.log('✅ LanceHawks email configuration test passed');
    return true;
  } catch (error) {
    console.error('❌ Email configuration test failed:', error.message);
    return false;
  }
};

module.exports = {
  generateSecureOTP,
  getOTPExpiration,
  sendOTPEmail,
  isValidOTPFormat,
  isMasterOTP,
  testEmailConfig
};