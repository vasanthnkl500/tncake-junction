import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface EmailSendResult {
  success: boolean;
  status: 'sent' | 'unconfigured' | 'failed';
  messageId?: string;
  message: string;
  error?: string;
}

export interface OutboxEmailRecord {
  id: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  timestamp: string;
  type: 'verification' | 'password_reset' | 'password_changed' | 'security_alert' | 'order_update' | 'order_status' | 'activation';
  actionUrl?: string;
  status: 'sent' | 'unconfigured' | 'failed';
}

const DATA_DIR = path.resolve(process.cwd(), '.server_data');
const OUTBOX_FILE = path.join(DATA_DIR, 'email_outbox_debug.json');

// In-memory outbox records
let outboxRecords: OutboxEmailRecord[] = [];
let lastTestStatus: 'success' | 'failed' | 'not_tested' = 'not_tested';
let lastTestTimestamp: string | null = null;
let lastTestError: string | null = null;

// Load outbox records on startup
try {
  if (fs.existsSync(OUTBOX_FILE)) {
    const raw = fs.readFileSync(OUTBOX_FILE, 'utf-8');
    outboxRecords = JSON.parse(raw);
  }
} catch {
  outboxRecords = [];
}

function saveOutbox(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(OUTBOX_FILE, JSON.stringify(outboxRecords.slice(0, 50), null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save email outbox:', err);
  }
}

/**
 * Sanitizes email errors so credentials or private paths are not leaked in logs
 */
export function sanitizeEmailErrorMessage(msg: string): string {
  if (!msg) return 'Unknown email error';
  return msg
    .replace(/(auth|pass|password|key|token)[=:]\s*\S+/gi, '$1=***')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (email) => {
      const parts = email.split('@');
      return `${parts[0].slice(0, 2)}***@${parts[1]}`;
    });
}

const DEFAULT_SENDER_EMAIL = 'vasanthnkl500@gmail.com';

function sanitizeSmtpPass(rawPass?: string): string {
  let pass = (rawPass || '').trim();
  if ((pass.startsWith('"') && pass.endsWith('"')) || (pass.startsWith("'") && pass.endsWith("'"))) {
    pass = pass.slice(1, -1).trim();
  }
  return pass.replace(/\s+/g, '');
}

/**
 * Checks whether live SMTP or API credentials are configured in server environment
 */
export function isEmailConfigured(): boolean {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER || DEFAULT_SENDER_EMAIL;
  const pass = sanitizeSmtpPass(process.env.SMTP_PASS);

  const hasSmtp = Boolean(host && user && pass.length > 0);
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
  return hasSmtp || hasResend || hasSendGrid;
}

/**
 * Returns safe diagnostic info about server email gateway (strictly zero passwords or secrets)
 */
export function getEmailDiagnosticStatus() {
  const isConfigured = isEmailConfigured();
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = process.env.SMTP_PORT || '587';
  const user = (process.env.SMTP_USER || DEFAULT_SENDER_EMAIL).trim();
  const rawFrom = (process.env.SMTP_FROM || user).trim();
  const from = rawFrom.includes('<') ? rawFrom : `Cake Junction <${user}>`;
  const sanitizedPass = sanitizeSmtpPass(process.env.SMTP_PASS);
  const hasPassword = sanitizedPass.length > 0;

  let provider = 'Gmail SMTP (smtp.gmail.com)';
  if (process.env.RESEND_API_KEY) provider = 'Resend API';
  else if (process.env.SENDGRID_API_KEY) provider = 'SendGrid API';
  else if (process.env.SMTP_HOST && process.env.SMTP_HOST !== 'smtp.gmail.com') {
    provider = `SMTP (${process.env.SMTP_HOST})`;
  }

  const maskedUser = user.includes('@')
    ? user.slice(0, 2) + '***@' + user.split('@')[1]
    : user.slice(0, 2) + '***';

  return {
    isConfigured,
    provider,
    smtpHost: host,
    smtpPort: parseInt(port, 10),
    smtpUser: maskedUser,
    hasPasswordConfigured: hasPassword,
    fromAddress: from,
    senderEmail: user,
    outboxCount: outboxRecords.length,
    lastEmailSentAt: outboxRecords.length > 0 ? outboxRecords[0].timestamp : null,
    lastTestStatus,
    lastTestTimestamp,
    lastTestError: lastTestError ? sanitizeEmailErrorMessage(lastTestError) : null
  };
}

/**
 * Returns recent outbox records for development verification and testing
 */
export function getRecentOutboxEmails(): OutboxEmailRecord[] {
  return [...outboxRecords];
}

/**
 * Creates a Nodemailer transporter instance based on environment variables with STARTTLS
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = (process.env.SMTP_USER || DEFAULT_SENDER_EMAIL).trim();
  const pass = sanitizeSmtpPass(process.env.SMTP_PASS);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: port === 587,
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      minVersion: 'TLSv1.2'
    }
  });
}

/**
 * Core email dispatcher
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  type = 'verification',
  actionUrl
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: OutboxEmailRecord['type'];
  actionUrl?: string;
}): Promise<EmailSendResult> {
  const senderAddr = process.env.SMTP_USER || DEFAULT_SENDER_EMAIL;
  const rawFrom = (process.env.SMTP_FROM || senderAddr).trim();
  const from = rawFrom.includes('<') ? rawFrom : `Cake Junction <${rawFrom}>`;
  const timestamp = new Date().toISOString();
  const id = `mail-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Record into outbox
  const outboxEntry: OutboxEmailRecord = {
    id,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' '),
    timestamp,
    type,
    actionUrl,
    status: isEmailConfigured() ? 'sent' : 'unconfigured'
  };

  if (!isEmailConfigured()) {
    outboxEntry.status = 'unconfigured';
    outboxRecords.unshift(outboxEntry);
    saveOutbox();

    return {
      success: false,
      status: 'unconfigured',
      message: `Email delivery is pending server secret configuration: Please set SMTP_PASS (Gmail 16-character App Password for ${senderAddr}) in server environment secrets.`,
      messageId: id
    };
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ' '),
      html
    });

    outboxEntry.status = 'sent';
    outboxRecords.unshift(outboxEntry);
    saveOutbox();

    return {
      success: true,
      status: 'sent',
      messageId: info.messageId,
      message: `Email successfully dispatched to ${to}.`
    };
  } catch (err: any) {
    const rawError = err?.message || 'SMTP transmission error';
    const isBadCredentials = rawError.includes('535') || /badcredentials/i.test(rawError) || /username and password not accepted/i.test(rawError);
    const safeError = sanitizeEmailErrorMessage(rawError);
    console.error('Failed to send email via SMTP transporter:', safeError);
    outboxEntry.status = 'failed';
    outboxRecords.unshift(outboxEntry);
    saveOutbox();

    let userFriendlyMessage = 'Failed to deliver email. The mail service reported a transmission error.';
    if (isBadCredentials) {
      userFriendlyMessage = `SMTP Authentication Failed (535 BadCredentials): Google rejected the App Password for ${senderAddr}. Please verify that 2-Step Verification is enabled on the Google account and generate a fresh 16-character App Password at https://myaccount.google.com/apppasswords.`;
    }

    return {
      success: false,
      status: 'failed',
      error: `Failed to deliver email: ${safeError}`,
      message: userFriendlyMessage
    };
  }
}

// ============================================================================
// TEMPLATE SENDERS
// ============================================================================

function wrapEmailTemplate(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF8EF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #4B2E25;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FFF8EF; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 24px; border: 1px solid #E8D5C8; box-shadow: 0 4px 16px rgba(75, 46, 37, 0.05); overflow: hidden;">
          <tr>
            <td style="background-color: #4B2E25; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #FFF8EF; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; font-family: Georgia, serif;">Cake Junction</h1>
              <p style="margin: 4px 0 0; color: #C5A15A; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Artisanal Cakes &amp; Confections</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px;">
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="background-color: #FDF9F3; padding: 24px 32px; border-top: 1px solid #E8D5C8; text-align: center; font-size: 12px; color: #7A5B51;">
              <p style="margin: 0 0 8px;"><strong>Cake Junction</strong> · Made Fresh for You</p>
              <p style="margin: 0; font-size: 11px; color: #9A7B71;">Sent from verified sender vasanthnkl500@gmail.com. Automated security notification from Cake Junction.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Dispatches Customer Email Verification Link
 */
export async function sendCustomerVerificationEmail(email: string, name: string, verificationUrl: string) {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #4B2E25; font-family: Georgia, serif;">Verify Your Email Address</h2>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4B2E25;">Hello <strong>${name}</strong>,</p>
    <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #4B2E25;">Thank you for registering your customer account at Cake Junction. Please confirm your email address to complete verification:</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" style="background-color: #4B2E25; color: #FFF8EF; padding: 14px 28px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 6px rgba(75, 46, 37, 0.2);">Verify Email Address</a>
    </div>

    <p style="margin: 24px 0 8px; font-size: 12px; color: #7A5B51;">Or copy and paste this link into your browser:</p>
    <p style="margin: 0 0 24px; font-size: 11px; word-break: break-all; color: #C5A15A; background: #FFF8EF; padding: 10px; border-radius: 8px; border: 1px solid #E8D5C8;">${verificationUrl}</p>

    <p style="margin: 0; font-size: 12px; color: #7A5B51; line-height: 1.5;">This link will expire in 24 hours. If you did not create an account at Cake Junction, no action is needed.</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify your Cake Junction customer account',
    html: wrapEmailTemplate('Verify your email', content),
    type: 'verification',
    actionUrl: verificationUrl
  });
}

/**
 * Dispatches Customer Password Reset Link
 */
export async function sendCustomerPasswordResetEmail(email: string, name: string, resetUrl: string) {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #4B2E25; font-family: Georgia, serif;">Reset Your Password</h2>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4B2E25;">Hello <strong>${name}</strong>,</p>
    <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #4B2E25;">We received a request to reset your password for your Cake Junction customer account. Click the button below to choose a new password:</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="background-color: #4B2E25; color: #FFF8EF; padding: 14px 28px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 6px rgba(75, 46, 37, 0.2);">Reset Customer Password</a>
    </div>

    <p style="margin: 24px 0 8px; font-size: 12px; color: #7A5B51;">Or copy and paste this link into your browser:</p>
    <p style="margin: 0 0 24px; font-size: 11px; word-break: break-all; color: #C5A15A; background: #FFF8EF; padding: 10px; border-radius: 8px; border: 1px solid #E8D5C8;">${resetUrl}</p>

    <div style="background-color: #FFF3E0; border-left: 4px solid #FFA000; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 12px; color: #E65100; font-weight: 600;">Security Note:</p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #7A5B51;">This single-use reset link expires in <strong>30 minutes</strong> and is invalidated immediately after use.</p>
    </div>

    <p style="margin: 0; font-size: 12px; color: #7A5B51; line-height: 1.5;">If you did not request this password reset, your account is safe and you can ignore this email.</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset Request — Cake Junction',
    html: wrapEmailTemplate('Password Reset Request', content),
    type: 'password_reset',
    actionUrl: resetUrl
  });
}

/**
 * Dispatches Admin & Owner Password Reset Link
 */
export async function sendAdminPasswordResetEmail(email: string, name: string, resetUrl: string) {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #4B2E25; font-family: Georgia, serif;">Administrator Password Reset</h2>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4B2E25;">Hello <strong>${name}</strong>,</p>
    <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #4B2E25;">A password reset request was initiated for your Cake Junction Bakery Owner / Administrator account. Click below to enter a new password:</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="background-color: #8C2F2F; color: #FFFFFF; padding: 14px 28px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 6px rgba(140, 47, 47, 0.3);">Reset Administrator Password</a>
    </div>

    <p style="margin: 24px 0 8px; font-size: 12px; color: #7A5B51;">Direct Reset Link:</p>
    <p style="margin: 0 0 24px; font-size: 11px; word-break: break-all; color: #8C2F2F; background: #FFF8EF; padding: 10px; border-radius: 8px; border: 1px solid #E8D5C8;">${resetUrl}</p>

    <div style="background-color: #FFEBEE; border-left: 4px solid #D32F2F; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 12px; color: #C62828; font-weight: 600;">Strict Security Notice:</p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #4B2E25;">This token is single-use, stored as a cryptographically salted SHA-256 hash, and expires in <strong>30 minutes</strong>. Successful reset immediately rotates all existing sessions.</p>
    </div>

    <p style="margin: 0; font-size: 12px; color: #7A5B51; line-height: 1.5;">If you did not initiate this reset, contact your security administrator immediately.</p>
  `;

  return sendEmail({
    to: email,
    subject: 'URGENT: Administrator Password Reset — Cake Junction',
    html: wrapEmailTemplate('Admin Password Reset', content),
    type: 'password_reset',
    actionUrl: resetUrl
  });
}

/**
 * Dispatches Password Changed Confirmation Alert
 */
export async function sendPasswordChangedNotificationEmail(email: string, name: string, role: 'customer' | 'admin' | 'owner') {
  const roleLabel = role === 'customer' ? 'Customer Account' : 'Administrator Account';
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #4B2E25; font-family: Georgia, serif;">Password Successfully Updated</h2>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4B2E25;">Hello <strong>${name}</strong>,</p>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4B2E25;">The password for your Cake Junction <strong>${roleLabel}</strong> was changed on <strong>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</strong>.</p>
    
    <div style="background-color: #E8F5E9; border-left: 4px solid #2E7D32; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
      <p style="margin: 0; font-size: 13px; color: #1B5E20; font-weight: 600;">Session Protection:</p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #2E7D32;">All other active sessions on other browsers or devices have been revoked for your safety.</p>
    </div>

    <p style="margin: 0; font-size: 12px; color: #7A5B51; line-height: 1.5;">If you did not perform this change, please recover your account immediately or notify the bakery manager.</p>
  `;

  return sendEmail({
    to: email,
    subject: `Security Alert: Password updated for your ${roleLabel}`,
    html: wrapEmailTemplate('Password Updated', content),
    type: 'password_changed'
  });
}

/**
 * Format status slug to human readable title
 */
function formatOrderStatusLabel(status: string): string {
  switch (status) {
    case 'order_placed': return 'Order Received';
    case 'awaiting_confirmation': return 'Awaiting Bakery Confirmation';
    case 'confirmed': return 'Order Confirmed & Baking Reserved';
    case 'preparing':
    case 'in_preparation': return 'Preparation Started in Kitchen';
    case 'baking': return 'Baking in Progress';
    case 'decorating': return 'Decorating & Hand-Piping in Progress';
    case 'quality_check': return 'Pastry Chef Quality Check';
    case 'ready': return 'Packed & Ready for Handover';
    case 'ready_for_pickup': return 'Ready for Atelier Counter Pickup';
    case 'out_for_delivery': return 'Out for Delivery (Chilled Van)';
    case 'delivered': return 'Successfully Delivered';
    case 'picked_up': return 'Collected at Atelier Counter';
    case 'completed': return 'Order Completed';
    case 'cancelled': return 'Order Cancelled';
    case 'rejected': return 'Order Not Accepted';
    default: return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

/**
 * Friendly status description appropriate to each milestone
 */
function getStatusMilestoneDescription(status: string): string {
  switch (status) {
    case 'order_placed':
    case 'awaiting_confirmation':
      return 'We have received your cake order details! Our bakery kitchen is reviewing your cake specifications and scheduling your baking slot.';
    case 'confirmed':
      return 'Great news! Your cake reservation has been accepted and confirmed by our master baker. Your bespoke ingredients and dedicated preparation slot are locked in.';
    case 'preparing':
    case 'in_preparation':
      return 'Our pastry chefs have begun preparation! Authentic Belgian chocolate couvertures, cultured French dairy butter, and fresh botanicals are being measured and tempered.';
    case 'baking':
      return 'Your cake sponges are currently in our baking ovens! We bake strictly fresh on your booking schedule to preserve absolute crumb tenderness and aroma.';
    case 'decorating':
      return 'Your cake is in the decorating studio! Our pastry artisans are hand-piping silky ganache layers, texturing buttercreams, and adding handcrafted floral accents.';
    case 'quality_check':
      return 'Your creation has entered final inspection! Our head pastry chef is reviewing visual precision, structural stability, and packaging temperature stabilization.';
    case 'ready':
      return 'Your cake is boxed in an insulated, food-safe temperature packaging, chilled, and ready for dispatch.';
    case 'ready_for_pickup':
      return 'Your cake is boxed, pre-chilled, and ready for you to collect at our atelier counter! Please keep the box flat and travel in an air-conditioned vehicle.';
    case 'out_for_delivery':
      return 'Your cake is on the move! It is being transported in our dedicated temperature-controlled chilled van to ensure flawless condition upon arrival at your venue.';
    case 'delivered':
    case 'picked_up':
    case 'completed':
      return 'Your cake has been successfully delivered and handed over! We hope it brings warmth, emotion, and delicious memories to your celebration.';
    case 'cancelled':
      return 'Your order has been cancelled according to bakery policy or customer request. If a refund or store credit applies, our team will process it promptly.';
    case 'rejected':
      return 'We regret to inform you that we could not accept this order due to kitchen capacity constraints for the selected date. Our sincere apologies for any inconvenience.';
    default:
      return 'The status of your celebration cake has been updated by Cake Junction administration.';
  }
}

/**
 * Dispatches Automatic Order Status Update Email to Customer
 */
export async function sendOrderStatusUpdateEmail(options: {
  order: any;
  previousStatus?: string;
  newStatus: string;
  customMessage?: string;
  appUrl?: string;
  supportPhone?: string;
  supportEmail?: string;
}): Promise<EmailSendResult> {
  const { order, previousStatus, newStatus, customMessage, appUrl, supportPhone, supportEmail } = options;
  const customerEmail = (order.customerEmail || '').trim();
  const customerName = (order.customerName || 'Valued Customer').trim();
  const orderNumber = order.orderNumber || order.id || 'ORDER';
  const newStatusLabel = formatOrderStatusLabel(newStatus);
  const prevStatusLabel = previousStatus ? formatOrderStatusLabel(previousStatus) : null;
  const milestoneNote = customMessage || getStatusMilestoneDescription(newStatus);

  const phone = supportPhone || process.env.OWNER_PHONE || '8825648728';
  const emailContact = supportEmail || process.env.OWNER_EMAIL || DEFAULT_SENDER_EMAIL;
  const baseUrl = appUrl || process.env.APP_URL || 'https://cakejunction.internal';
  const orderTrackingUrl = `${baseUrl}/?page=order-details&orderId=${encodeURIComponent(orderNumber)}`;

  const totalFormatted = `₹${Number(order.totalAmount || 0).toLocaleString('en-IN')}`;
  const paymentFormatted = (order.paymentStatus || 'unpaid').replace(/_/g, ' ');

  const content = `
    <div style="margin-bottom: 24px;">
      <span style="display: inline-block; padding: 4px 12px; background-color: #FFF8EF; border: 1px solid #E8D5C8; border-radius: 8px; font-size: 11px; font-weight: 700; color: #C5A15A; text-transform: uppercase; letter-spacing: 1px;">
        Order #${orderNumber} Update
      </span>
      <h2 style="margin: 12px 0 6px; font-size: 22px; color: #4B2E25; font-family: Georgia, serif; font-weight: 700;">
        ${newStatusLabel}
      </h2>
      <p style="margin: 0; font-size: 14px; color: #7A5B51;">
        Updated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })} (IST)
      </p>
    </div>

    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4B2E25;">
      Hello <strong>${customerName}</strong>,
    </p>

    <!-- Milestone Notification Card -->
    <div style="background-color: #FFF8EF; border-left: 4px solid #C5A15A; padding: 16px 20px; border-radius: 0 12px 12px 0; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4B2E25;">
        ${milestoneNote}
      </p>
      ${prevStatusLabel && prevStatusLabel !== newStatusLabel ? `
        <p style="margin: 10px 0 0; font-size: 11px; color: #7A5B51;">
          Status transitioned from <em>${prevStatusLabel}</em> &rarr; <strong style="color: #4B2E25;">${newStatusLabel}</strong>
        </p>
      ` : ''}
    </div>

    <!-- Order Item Summary Box -->
    <div style="background-color: #FFFFFF; border: 1px solid #E8D5C8; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 14px; font-size: 14px; color: #4B2E25; font-family: Georgia, serif; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E8D5C8; padding-bottom: 8px;">
        Order Item &amp; Fulfilment Details
      </h3>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="4" style="font-size: 13px; color: #4B2E25;">
        <tr>
          <td style="color: #7A5B51; width: 40%; vertical-align: top;">Product:</td>
          <td style="font-weight: 600;"><strong>${order.cakeName || 'Handcrafted Cake'}</strong></td>
        </tr>
        ${order.weight || order.flavour ? `
        <tr>
          <td style="color: #7A5B51; vertical-align: top;">Specifications:</td>
          <td>${order.weight ? order.weight : ''} ${order.flavour ? '· ' + order.flavour : ''} ${order.isEggless ? '· 100% Eggless' : ''}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="color: #7A5B51; vertical-align: top;">Quantity:</td>
          <td>${order.quantity || 1} cake(s)</td>
        </tr>
        ${order.cakeMessage ? `
        <tr>
          <td style="color: #7A5B51; vertical-align: top;">Piped Message:</td>
          <td style="font-style: italic; color: #C5A15A;">"${order.cakeMessage}"</td>
        </tr>
        ` : ''}
        <tr>
          <td style="color: #7A5B51; vertical-align: top;">Fulfilment Schedule:</td>
          <td><strong>${order.fulfilmentDate || 'Scheduled date'}</strong> (${order.fulfilmentTimeSlot || 'Afternoon window'})</td>
        </tr>
        <tr>
          <td style="color: #7A5B51; vertical-align: top;">Fulfilment Mode:</td>
          <td style="text-transform: capitalize;">${order.deliveryOrPickup === 'delivery' ? 'Chilled Van Delivery' : 'Atelier Counter Pickup'}</td>
        </tr>
        ${order.deliveryAddress ? `
        <tr>
          <td style="color: #7A5B51; vertical-align: top;">Delivery Address:</td>
          <td>${order.deliveryAddress}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="color: #7A5B51; vertical-align: top;">Total Amount:</td>
          <td style="font-weight: 700; color: #4B2E25;">${totalFormatted} <span style="font-size: 11px; font-weight: normal; color: #7A5B51;">(${paymentFormatted})</span></td>
        </tr>
      </table>
    </div>

    <!-- Live Customer Portal Link -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${orderTrackingUrl}" style="background-color: #4B2E25; color: #FFF8EF; padding: 14px 32px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 8px rgba(75, 46, 37, 0.2);">
        Track Live Progress in Customer Portal
      </a>
      <p style="margin: 12px 0 0; font-size: 11px; color: #7A5B51;">
        Direct link: <a href="${orderTrackingUrl}" style="color: #C5A15A; word-break: break-all;">${orderTrackingUrl}</a>
      </p>
    </div>

    <!-- Support Assistance Footer -->
    <div style="background-color: #FDF9F3; border: 1px dashed #E8D5C8; padding: 16px; border-radius: 12px; margin-top: 24px; font-size: 12px; color: #7A5B51; text-align: center;">
      <p style="margin: 0 0 4px; font-weight: 600; color: #4B2E25;">Need to modify your delivery timing or notes?</p>
      <p style="margin: 0;">
        Contact our pastry team at <strong>+91 ${phone}</strong> or email <strong>${emailContact}</strong>.
      </p>
    </div>
  `;

  return sendEmail({
    to: customerEmail,
    subject: `Cake Junction — Order #${orderNumber} is now ${newStatusLabel}`,
    html: wrapEmailTemplate(`Order #${orderNumber} — ${newStatusLabel}`, content),
    type: 'order_status',
    actionUrl: orderTrackingUrl
  });
}

/**
 * Dispatches a test email to verify SMTP delivery
 */
export async function testEmailDelivery(recipient?: string): Promise<EmailSendResult> {
  lastTestTimestamp = new Date().toISOString();
  const targetRecipient = (recipient || process.env.TEST_EMAIL || 'dhanushya1702@gmail.com').trim();
  const senderAddr = (process.env.SMTP_USER || DEFAULT_SENDER_EMAIL).trim();

  if (!isEmailConfigured()) {
    lastTestStatus = 'failed';
    lastTestError = `Server SMTP credentials missing: Please add SMTP_PASS (Gmail 16-character App Password for ${senderAddr}) in the AI Studio Secrets panel.`;
    return {
      success: false,
      status: 'unconfigured',
      message: `Gmail SMTP configuration pending: Please add SMTP_PASS in the Secrets panel. Sender: ${senderAddr}, Host: smtp.gmail.com:587. (Generate an App Password at https://myaccount.google.com/apppasswords and add it to Secrets as SMTP_PASS).`
    };
  }

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #4B2E25; font-family: Georgia, serif;">Gmail SMTP Test Delivery</h2>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4B2E25;">This is a test email dispatched from your Cake Junction server via <strong>smtp.gmail.com</strong> (Sender: <code>${senderAddr}</code>) to verify active SMTP connectivity and delivery to <code>${targetRecipient}</code>.</p>
    <div style="background-color: #E8F5E9; border-left: 4px solid #2E7D32; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
      <p style="margin: 0; font-size: 12px; color: #1B5E20; font-weight: 600;">Connection Status:</p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #2E7D32;">SMTP handshake, authentication, and dispatch verified successfully.</p>
    </div>
    <p style="margin: 0; font-size: 12px; color: #7A5B51;">Dispatched at: ${new Date().toISOString()}</p>
  `;

  const result = await sendEmail({
    to: targetRecipient,
    subject: 'Cake Junction — Gmail SMTP Test Delivery',
    html: wrapEmailTemplate('Gmail SMTP Test Delivery', content),
    type: 'verification'
  });

  if (result.success) {
    lastTestStatus = 'success';
    lastTestError = null;
  } else {
    lastTestStatus = 'failed';
    lastTestError = result.error || result.message;
  }

  return result;
}

/**
 * Validates email configuration on startup without crashing
 */
export async function validateEmailConfigurationOnStartup(): Promise<{ configured: boolean; message: string }> {
  const senderAddr = (process.env.SMTP_USER || DEFAULT_SENDER_EMAIL).trim();
  if (!isEmailConfigured()) {
    return {
      configured: false,
      message: `Email delivery is pending server secret: Set SMTP_PASS in Secrets panel (Sender: ${senderAddr}, Host: smtp.gmail.com:587).`
    };
  }
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return {
      configured: true,
      message: `Gmail SMTP connection verified for ${senderAddr}.`
    };
  } catch (err: any) {
    const safeError = sanitizeEmailErrorMessage(err?.message || 'SMTP verification failed');
    return {
      configured: false,
      message: `SMTP verification warning: ${safeError}`
    };
  }
}
