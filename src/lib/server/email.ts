/**
 * Brickwork Email Service
 * Dispatches transactional notifications and password resets via Cloudflare Email Send
 * Authority: docs/ARCHITECTURE.md Section 1 & docs/SPECIFICATION.md AC-11
 */

export interface SendResetEmailParams {
	to: string;
	recipientName: string;
	resetUrl: string;
	platformEnv?: Env;
}

/**
 * Sends a password reset email using Cloudflare Workers Email Send binding.
 * Falls back to console logging in local emulation if EMAIL binding is unconfigured.
 */
export async function sendPasswordResetEmail({
	to,
	recipientName,
	resetUrl,
	platformEnv
}: SendResetEmailParams): Promise<{ success: boolean; error?: string }> {
	const subject = 'Reset your Brickwork password';
	const fromAddress = 'noreply@brickwork.co.za';

	const textBody = `Hi ${recipientName},\n\nYou requested a password reset for your Brickwork account.\n\nClick the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not make this request, you can safely ignore this email.\n\n— The Brickwork Team`;

	const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset your Brickwork password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; padding: 32px 16px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="margin-bottom: 24px;">
      <span style="font-size: 22px; font-weight: 800; color: #0B2240; letter-spacing: -0.5px;">BRICKWORK</span>
    </div>
    <h1 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0;">Reset your password</h1>
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 24px 0;">
      Hi ${recipientName || 'there'},<br><br>
      We received a request to reset your password. Click the button below to choose a new password:
    </p>
    <div style="margin-bottom: 28px;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #0B2240; color: #FFFFFF; font-weight: 600; font-size: 15px; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
        Reset Password
      </a>
    </div>
    <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 0 0 16px 0;">
      This password reset link will expire in <strong>1 hour</strong>. If you did not request this, no action is needed.
    </p>
    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
    <p style="font-size: 12px; color: #94A3B8; margin: 0;">
      Brickwork — Point-of-Purchase Expense & Budget Platform
    </p>
  </div>
</body>
</html>
	`.trim();

	// Check if Cloudflare send_email binding is available
	if (platformEnv?.EMAIL && typeof platformEnv.EMAIL.send === 'function') {
		try {
			// Construct raw MIME or object format supported by Cloudflare Workers send_email
			await platformEnv.EMAIL.send({
				to,
				from: fromAddress,
				subject,
				html: htmlBody,
				text: textBody
			});
			return { success: true };
		} catch (err: any) {
			console.error('Failed to send email via Cloudflare EMAIL binding:', err);
			return { success: false, error: err?.message || 'Email delivery failed' };
		}
	}

	// Local development fallback: Log link to terminal for easy testing
	console.log('\n======================================================');
	console.log(`[LOCAL EMAIL SIMULATION] To: ${to}`);
	console.log(`[LOCAL EMAIL SIMULATION] Subject: ${subject}`);
	console.log(`[LOCAL EMAIL SIMULATION] Reset URL: ${resetUrl}`);
	console.log('======================================================\n');

	return { success: true };
}
