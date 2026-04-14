import net from 'node:net';
import os from 'node:os';
import readline from 'node:readline';
import tls from 'node:tls';
import type { AuthOtpPurpose, UserRole } from '@/lib/types';

const SMTP_TIMEOUT_MS = 15000;

type OtpEmailInput = {
  email: string;
  code: string;
  purpose: AuthOtpPurpose;
  role: UserRole;
  name?: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
};

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs = SMTP_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const username = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASS?.replace(/\s+/g, '');
  const fromEmail = process.env.OTP_FROM_EMAIL?.trim();
  if (!host || !username || !password || !fromEmail) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT || '465');
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a valid number.');
  }

  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  return {
    host,
    port,
    secure,
    username,
    password,
    fromEmail,
    fromName: sanitizeHeader(process.env.OTP_FROM_NAME?.trim() || "Farmer's Marketplace"),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function encodeMimeBase64(value: string): string {
  const encoded = Buffer.from(value, 'utf8').toString('base64');
  return encoded.match(/.{1,76}/g)?.join('\r\n') ?? encoded;
}

function buildOtpMessage(input: OtpEmailInput): { subject: string; text: string; html: string } {
  const roleLabel = input.role === 'user' ? 'farmer' : input.role;
  const subject = input.purpose === 'signup'
    ? 'Verify your Farmer\'s Marketplace account'
    : 'Your Farmer\'s Marketplace sign-in code';
  const intro = input.name ? `Hello ${input.name},` : 'Hello,';
  const actionText = input.purpose === 'signup'
    ? `Use this one-time password to finish creating your ${roleLabel} account.`
    : `Use this one-time password to complete your ${roleLabel} sign-in.`;
  const text = [
    intro,
    '',
    actionText,
    '',
    `OTP: ${input.code}`,
    '',
    'This code expires in 10 minutes.',
    'If you did not request this code, you can ignore this email.',
    '',
    "Farmer's Marketplace",
  ].join('\r\n');

  const action = input.purpose === 'signup' ? 'Account Verification' : 'Secure Sign-In';
  const summary = input.purpose === 'signup'
    ? `Complete your ${roleLabel} account setup with the one-time password below.`
    : `Use the one-time password below to finish signing in to your ${roleLabel} account.`;
  const html = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${escapeHtml(subject)}</title>`,
    '</head>',
    '<body style="margin:0;padding:0;background:#f4f0e6;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;">',
    '<div style="padding:32px 16px;">',
    '<div style="max-width:640px;margin:0 auto;background:#fffdf8;border:1px solid #e7dcc7;border-radius:20px;overflow:hidden;box-shadow:0 18px 50px rgba(56,44,16,0.08);">',
    '<div style="padding:28px 32px;background:linear-gradient(135deg,#183a1d 0%,#2f6f2f 55%,#c58b2a 100%);color:#fff;">',
    '<div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;opacity:0.82;">Farmer&apos;s Marketplace</div>',
    `<h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;">${escapeHtml(action)}</h1>`,
    `<p style="margin:0;font-size:15px;line-height:1.6;max-width:460px;color:rgba(255,255,255,0.88);">${escapeHtml(summary)}</p>`,
    '</div>',
    '<div style="padding:32px;">',
    `<p style="margin:0 0 18px;font-size:16px;line-height:1.6;">${escapeHtml(intro)}</p>`,
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4b5563;">${escapeHtml(actionText)}</p>`,
    '<div style="margin:24px 0;padding:24px;border:1px solid #e8d8b5;border-radius:18px;background:#fbf6ea;text-align:center;">',
    '<div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#8b6a2d;margin-bottom:12px;">One-Time Password</div>',
    `<div style="font-size:36px;font-weight:700;letter-spacing:0.42em;color:#183a1d;padding-left:0.42em;">${escapeHtml(input.code)}</div>`,
    '<div style="margin-top:14px;font-size:13px;color:#6b7280;">Valid for 10 minutes. Request a new code only if this one expires.</div>',
    '</div>',
    '<div style="padding:18px 20px;border-radius:16px;background:#f7f8f4;border:1px solid #e5eadc;">',
    '<div style="font-size:14px;font-weight:600;color:#183a1d;margin-bottom:8px;">Security notes</div>',
    '<ul style="margin:0;padding-left:18px;color:#4b5563;font-size:14px;line-height:1.7;">',
    '<li>Never share this OTP with anyone, including support staff.</li>',
    '<li>If you did not request this code, you can ignore this email.</li>',
    '<li>Repeated resend attempts are rate-limited for account safety.</li>',
    '</ul>',
    '</div>',
    '<p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#6b7280;">This message was sent automatically by Farmer&apos;s Marketplace security services.</p>',
    '</div>',
    '</div>',
    '</div>',
    '</body>',
    '</html>',
  ].join('');

  return { subject, text, html };
}

function formatMailbox(name: string, email: string): string {
  return `"${sanitizeHeader(name).replace(/"/g, '\\"')}" <${sanitizeHeader(email)}>`;
}

function encodeBase64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

async function connectSocket(config: SmtpConfig): Promise<net.Socket | tls.TLSSocket> {
  if (config.secure) {
    return withTimeout(
      new Promise<tls.TLSSocket>((resolve, reject) => {
        const socket = tls.connect({
          host: config.host,
          port: config.port,
          servername: config.host,
        });
        socket.once('secureConnect', () => resolve(socket));
        socket.once('error', reject);
      }),
      'Timed out while connecting to the SMTP server.'
    );
  }

  return withTimeout(
    new Promise<net.Socket>((resolve, reject) => {
      const socket = net.connect({ host: config.host, port: config.port });
      socket.once('connect', () => resolve(socket));
      socket.once('error', reject);
    }),
    'Timed out while connecting to the SMTP server.'
  );
}

class SmtpSession {
  private readonly socket: net.Socket | tls.TLSSocket;
  private readonly lineReader: readline.Interface;
  private readonly onSocketError: (error: Error) => void;
  private readonly onSocketClose: () => void;
  private readonly lines: string[] = [];
  private readonly waiters: Array<{ resolve: (line: string) => void; reject: (error: Error) => void }> = [];
  private terminalError: Error | null = null;

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    this.lineReader = readline.createInterface({ input: socket, crlfDelay: Infinity });
    this.lineReader.on('line', (line) => {
      if (this.waiters.length > 0) {
        const waiter = this.waiters.shift();
        waiter?.resolve(line);
        return;
      }
      this.lines.push(line);
    });
    this.onSocketError = (error) => this.finish(error);
    this.onSocketClose = () => this.finish(new Error('SMTP connection closed unexpectedly.'));
    socket.on('error', this.onSocketError);
    socket.on('close', this.onSocketClose);
  }

  detach() {
    this.lineReader.close();
    this.socket.off('error', this.onSocketError);
    this.socket.off('close', this.onSocketClose);
  }

  getSocket() {
    return this.socket;
  }

  private finish(error: Error) {
    if (this.terminalError) return;
    this.terminalError = error;
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter?.reject(error);
    }
  }

  private async nextLine(): Promise<string> {
    if (this.lines.length > 0) {
      const line = this.lines.shift();
      if (!line) {
        throw new Error('SMTP server returned an empty response.');
      }
      return line;
    }

    if (this.terminalError) {
      throw this.terminalError;
    }

    return new Promise<string>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  async readResponse(expectedCodes: number | number[]): Promise<string[]> {
    const acceptedCodes = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];
    const responseLines = await withTimeout(
      (async () => {
        const collected: string[] = [];
        let responseCode: string | null = null;
        while (true) {
          const line = await this.nextLine();
          collected.push(line);
          const match = line.match(/^(\d{3})([ -])(.*)$/);
          if (!match) continue;
          responseCode = responseCode ?? match[1];
          if (match[1] === responseCode && match[2] === ' ') {
            return collected;
          }
        }
      })(),
      'Timed out while waiting for the SMTP server response.'
    );

    const lastLine = responseLines[responseLines.length - 1] ?? '';
    const statusCode = Number(lastLine.slice(0, 3));
    if (!acceptedCodes.includes(statusCode)) {
      throw new Error(`SMTP server rejected the request: ${responseLines.join(' | ')}`);
    }
    return responseLines;
  }

  async writeCommand(command: string) {
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        this.socket.write(`${command}\r\n`, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
      'Timed out while writing to the SMTP server.'
    );
  }
}

async function upgradeToTls(session: SmtpSession, socket: net.Socket, host: string): Promise<SmtpSession> {
  session.detach();
  const tlsSocket = await withTimeout(
    new Promise<tls.TLSSocket>((resolve, reject) => {
      const upgraded = tls.connect({ socket, servername: host });
      upgraded.once('secureConnect', () => resolve(upgraded));
      upgraded.once('error', reject);
    }),
    'Timed out while upgrading the SMTP connection to TLS.'
  );
  return new SmtpSession(tlsSocket);
}

async function sendMailViaSmtp(config: SmtpConfig, message: { to: string; subject: string; text: string; html: string }) {
  const socket = await connectSocket(config);
  let session = new SmtpSession(socket);
  let activeSocket: net.Socket | tls.TLSSocket = socket;

  try {
    await session.readResponse(220);
    await session.writeCommand(`EHLO ${sanitizeHeader(os.hostname() || 'localhost')}`);
    await session.readResponse(250);

    if (!config.secure) {
      await session.writeCommand('STARTTLS');
      await session.readResponse(220);
      session = await upgradeToTls(session, socket as net.Socket, config.host);
      activeSocket = session.getSocket();
      await session.writeCommand(`EHLO ${sanitizeHeader(os.hostname() || 'localhost')}`);
      await session.readResponse(250);
    }

    await session.writeCommand('AUTH LOGIN');
    await session.readResponse(334);
    await session.writeCommand(encodeBase64(config.username));
    await session.readResponse(334);
    await session.writeCommand(encodeBase64(config.password));
    await session.readResponse(235);

    await session.writeCommand(`MAIL FROM:<${sanitizeHeader(config.fromEmail)}>`);
    await session.readResponse(250);
    await session.writeCommand(`RCPT TO:<${sanitizeHeader(message.to)}>`);
    await session.readResponse([250, 251]);
    await session.writeCommand('DATA');
    await session.readResponse(354);

    const boundary = `fm-otp-${Date.now().toString(16)}`;
    const payload = [
      `Date: ${new Date().toUTCString()}`,
      `From: ${formatMailbox(config.fromName, config.fromEmail)}`,
      `To: <${sanitizeHeader(message.to)}>`,
      `Subject: ${sanitizeHeader(message.subject)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodeMimeBase64(message.text),
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodeMimeBase64(message.html),
      '',
      `--${boundary}--`,
    ].join('\r\n');

    await withTimeout(
      new Promise<void>((resolve, reject) => {
        activeSocket.write(`${payload}\r\n.\r\n`, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
      'Timed out while sending the OTP email payload.'
    );
    await session.readResponse(250);
    await session.writeCommand('QUIT');
    await session.readResponse(221);
  } finally {
    session.detach();
    activeSocket.end();
    activeSocket.destroy();
  }
}

export function isOtpEmailDeliveryConfigured(): boolean {
  return Boolean(getSmtpConfig());
}

export async function sendOtpEmail(input: OtpEmailInput): Promise<void> {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error('OTP email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and OTP_FROM_EMAIL.');
  }

  const message = buildOtpMessage(input);
  await sendMailViaSmtp(config, {
    to: input.email.trim().toLowerCase(),
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
