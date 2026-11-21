import net from 'net';
import tls from 'tls';
import { ENV } from '../config/env.ts';

export interface AlertDispatchOutcome {
  channel: 'email' | 'whatsapp';
  configured: boolean;
  sent: boolean;
  message: string;
}

export function getNotificationChannelsStatus() {
  return {
    emailConfigured: Boolean(ENV.smtpHost && ENV.smtpUser && ENV.smtpPass && ENV.smtpFrom),
    whatsappConfigured: Boolean(ENV.whatsappToken && ENV.whatsappPhoneId),
    contactRecipientEmail: ENV.contactRecipientEmail || null,
    contactRoutingConfigured: Boolean(
      ENV.contactRecipientEmail && ENV.smtpHost && ENV.smtpUser && ENV.smtpPass && ENV.smtpFrom
    ),
  };
}

export async function dispatchWhatsAppAlert(toPhone: string, textBody: string): Promise<AlertDispatchOutcome> {
  if (!ENV.whatsappToken || !ENV.whatsappPhoneId) {
    return {
      channel: 'whatsapp',
      configured: false,
      sent: false,
      message: 'WhatsApp Business Cloud API is optional and not configured in environment variables.',
    };
  }

  const normalizedPhone = toPhone.replace(/[^\d]/g, '');
  if (normalizedPhone.length < 8) {
    return {
      channel: 'whatsapp',
      configured: true,
      sent: false,
      message: 'Invalid destination WhatsApp phone number.',
    };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${ENV.whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ENV.whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'text',
        text: { body: textBody.slice(0, 1000) },
      }),
    });

    if (!res.ok) {
      return {
        channel: 'whatsapp',
        configured: true,
        sent: false,
        message: `WhatsApp API responded with HTTP ${res.status}.`,
      };
    }

    return {
      channel: 'whatsapp',
      configured: true,
      sent: true,
      message: 'WhatsApp alert delivered.',
    };
  } catch (err) {
    return {
      channel: 'whatsapp',
      configured: true,
      sent: false,
      message: err instanceof Error ? err.message : 'WhatsApp delivery error.',
    };
  }
}

export async function dispatchEmailAlert(toEmail: string, subject: string, bodyText: string): Promise<AlertDispatchOutcome> {
  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPass || !ENV.smtpFrom) {
    return {
      channel: 'email',
      configured: false,
      sent: false,
      message: 'SMTP email transport is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS / SMTP_FROM).',
    };
  }

  const cleanRecipient = toEmail.replace(/[\r\n]/g, '').trim();
  const cleanFrom = ENV.smtpFrom.replace(/[\r\n]/g, '').trim();
  if (!cleanRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanRecipient)) {
    return {
      channel: 'email',
      configured: true,
      sent: false,
      message: 'Invalid recipient email address.',
    };
  }

  // RFC 5321 + RFC 3207 SMTP TLS / STARTTLS client without external dependencies
  return new Promise((resolve) => {
    const isImplicitTls = ENV.smtpPort === 465;
    const isLocalHost = ENV.smtpHost === '127.0.0.1' || ENV.smtpHost === 'localhost';
    const tlsServername = net.isIP(ENV.smtpHost) ? undefined : ENV.smtpHost;
    let activeSocket: net.Socket | tls.TLSSocket = isImplicitTls
      ? tls.connect({
          host: ENV.smtpHost,
          port: ENV.smtpPort,
          servername: tlsServername,
          rejectUnauthorized: !isLocalHost,
          timeout: 8000,
        })
      : net.connect({
          host: ENV.smtpHost,
          port: ENV.smtpPort,
          timeout: 8000,
        });

    let tlsActive = isImplicitTls;
    let stage:
      | 'greeting'
      | 'ehlo_initial'
      | 'starttls'
      | 'ehlo_post_tls'
      | 'auth_login'
      | 'auth_user'
      | 'auth_pass'
      | 'mail_from'
      | 'rcpt_to'
      | 'data_cmd'
      | 'data_body'
      | 'done' = 'greeting';
    let lineBuffer = '';
    let multiLineAcc: string[] = [];
    let settled = false;

    const finish = (sent: boolean, message: string) => {
      if (settled) return;
      settled = true;
      try {
        activeSocket.destroy();
      } catch {
        // Ignore socket teardown errors
      }
      resolve({ channel: 'email', configured: true, sent, message });
    };

    const sendLine = (line: string) => {
      activeSocket.write(`${line}\r\n`);
    };

    const handleReply = (code: number, lines: string[]) => {
      const lastLine = lines[lines.length - 1] || `${code}`;
      if (code >= 400) {
        finish(false, `SMTP error ${lastLine}`);
        return;
      }

      if (stage === 'greeting' && code === 220) {
        stage = 'ehlo_initial';
        sendLine('EHLO astasecure.local');
      } else if (stage === 'ehlo_initial' && code === 250) {
        const supportsStartTls = lines.some((l) => /\bSTARTTLS\b/i.test(l));
        if (!tlsActive && supportsStartTls) {
          stage = 'starttls';
          sendLine('STARTTLS');
        } else {
          stage = 'auth_login';
          sendLine('AUTH LOGIN');
        }
      } else if (stage === 'starttls' && code === 220) {
        stage = 'ehlo_post_tls';
        const rawSock = activeSocket as net.Socket;
        rawSock.removeAllListeners('data');
        rawSock.removeAllListeners('timeout');
        rawSock.removeAllListeners('error');
        const tlsSock = tls.connect({
          socket: rawSock,
          servername: tlsServername,
          rejectUnauthorized: !isLocalHost,
          timeout: 8000,
        });
        activeSocket = tlsSock;
        tlsActive = true;
        attachListeners(tlsSock);
        tlsSock.once('secureConnect', () => {
          sendLine('EHLO astasecure.local');
        });
      } else if (stage === 'ehlo_post_tls' && code === 250) {
        stage = 'auth_login';
        sendLine('AUTH LOGIN');
      } else if (stage === 'auth_login' && code === 334) {
        stage = 'auth_user';
        sendLine(Buffer.from(ENV.smtpUser, 'utf-8').toString('base64'));
      } else if (stage === 'auth_user' && code === 334) {
        stage = 'auth_pass';
        sendLine(Buffer.from(ENV.smtpPass, 'utf-8').toString('base64'));
      } else if (stage === 'auth_pass' && code === 235) {
        stage = 'mail_from';
        sendLine(`MAIL FROM:<${cleanFrom}>`);
      } else if (stage === 'mail_from' && code === 250) {
        stage = 'rcpt_to';
        sendLine(`RCPT TO:<${cleanRecipient}>`);
      } else if (stage === 'rcpt_to' && (code === 250 || code === 251)) {
        stage = 'data_cmd';
        sendLine('DATA');
      } else if (stage === 'data_cmd' && code === 354) {
        stage = 'data_body';
        const dotStuffedBody = bodyText
          .replace(/\r?\n/g, '\r\n')
          .split('\r\n')
          .map((l) => (l.startsWith('.') ? `.${l}` : l))
          .join('\r\n');
        const msg = [
          `From: AstaSecure Monitor <${cleanFrom}>`,
          `To: <${cleanRecipient}>`,
          `Subject: ${subject.replace(/[\r\n]/g, '')}`,
          'Content-Type: text/plain; charset=utf-8',
          '',
          dotStuffedBody,
          '.',
        ].join('\r\n');
        sendLine(msg);
      } else if (stage === 'data_body' && code === 250) {
        stage = 'done';
        sendLine('QUIT');
        finish(true, `Email accepted by configured SMTP gateway${tlsActive ? ' (TLS)' : ''}.`);
      }
    };

    const attachListeners = (sock: net.Socket | tls.TLSSocket) => {
      sock.on('timeout', () => finish(false, 'SMTP connection timed out.'));
      sock.on('error', (err) => finish(false, err.message));
      sock.on('data', (chunk) => {
        lineBuffer += chunk.toString('utf-8');
        const parts = lineBuffer.split(/\r?\n/);
        lineBuffer = parts.pop() ?? '';
        for (const rawLine of parts) {
          if (!rawLine) continue;
          multiLineAcc.push(rawLine);
          if (/^\d{3}(?: |$)/.test(rawLine)) {
            const code = Number(rawLine.slice(0, 3));
            const replyLines = multiLineAcc;
            multiLineAcc = [];
            handleReply(code, replyLines);
          }
        }
      });
    };

    attachListeners(activeSocket);
  });
}

export async function dispatchContactNotification(params: {
  name: string;
  email: string;
  company?: string;
  serviceCategory: string;
  domain?: string;
  message: string;
}) {
  const recipient = ENV.contactRecipientEmail || ENV.smtpFrom;
  if (!recipient) {
    return {
      status: 'unconfigured' as const,
      configured: false,
      sent: false,
      detail: 'Email notification recipient is not configured (CONTACT_RECIPIENT_EMAIL / SMTP_FROM). Inquiry stored in database for Admin review.',
    };
  }

  const body = [
    'New AstaSecure Contact / Service Inquiry',
    `From: ${params.name} <${params.email}>`,
    params.company ? `Company: ${params.company}` : '',
    `Category: ${params.serviceCategory}`,
    params.domain ? `Target Domain: ${params.domain}` : '',
    '',
    params.message,
  ]
    .filter(Boolean)
    .join('\n');

  const outcome = await dispatchEmailAlert(
    recipient,
    `[AstaSecure Inquiry] ${params.serviceCategory} — ${params.name}`,
    body
  );

  return {
    status: outcome.sent
      ? ('sent' as const)
      : !outcome.configured
        ? ('unconfigured' as const)
        : ('failed' as const),
    configured: outcome.configured,
    sent: outcome.sent,
    detail: outcome.message,
  };
}
