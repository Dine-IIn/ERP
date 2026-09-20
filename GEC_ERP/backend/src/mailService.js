import net from 'net';
import tls from 'tls';

/**
 * Lightweight, Zero-Dependency Enterprise SMTP Email Client for Node.js
 * Supports Plain, STARTTLS (Port 587/25), and Direct TLS/SSL (Port 465)
 */
export async function sendSmtpEmail({ host, port, secure, authUser, authPass, fromName, fromEmail, recipient, cc, bcc, subject, bodyHtml, attachments = [] }) {
  return new Promise((resolve, reject) => {
    const isImplicitTls = secure || port === 465;
    let socket;
    let buffer = '';
    let step = 0;

    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Parse recipients
    const toList = recipient.split(/[,;]/).map(e => e.trim()).filter(Boolean);
    const ccList = (cc || '').split(/[,;]/).map(e => e.trim()).filter(Boolean);
    const bccList = (bcc || '').split(/[,;]/).map(e => e.trim()).filter(Boolean);
    const allRcpts = [...toList, ...ccList, ...bccList];

    if (allRcpts.length === 0) {
      return reject(new Error('No valid recipient email provided.'));
    }

    const log = (msg) => {
      // console.log('[SMTP]', msg);
    };

    function write(cmd) {
      log('C: ' + cmd.trim());
      socket.write(cmd + '\r\n');
    }

    function buildMimeMessage() {
      const headers = [
        `From: "${fromName || 'GEC ERP Server'}" <${fromEmail || authUser}>`,
        `To: ${toList.join(', ')}`,
        ccList.length > 0 ? `Cc: ${ccList.join(', ')}` : null,
        `Subject: ${subject}`,
        `Date: ${new Date().toUTCString()}`,
        `MIME-Version: 1.0`,
        `Message-ID: <${Date.now()}.${Math.random().toString(36)}@${host}>`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        ''
      ].filter(Boolean).join('\r\n');

      let body = `--${boundary}\r\n`;
      body += `Content-Type: text/html; charset="UTF-8"\r\n`;
      body += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
      body += `${bodyHtml || '<p>Please find the attached document from GEC ERP.</p>'}\r\n\r\n`;

      for (const att of attachments) {
        if (!att.filename || !att.content) continue;
        const contentType = att.contentType || (att.filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
        body += `--${boundary}\r\n`;
        body += `Content-Type: ${contentType}; name="${att.filename}"\r\n`;
        body += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
        body += `Content-Transfer-Encoding: base64\r\n\r\n`;
        body += `${att.content.replace(/\r?\n/g, '')}\r\n\r\n`;
      }

      body += `--${boundary}--\r\n.\r\n`;
      return headers + body;
    }

    function handleResponse(response) {
      log('S: ' + response);
      const code = parseInt(response.substring(0, 3), 10);

      if (code >= 400) {
        socket.end();
        return reject(new Error(`SMTP Error (${code}): ${response.trim()}`));
      }

      if (step === 0) { // Connected
        step = 1;
        write(`EHLO ${host}`);
      } else if (step === 1) { // EHLO Response
        if (!isImplicitTls && response.includes('STARTTLS')) {
          step = 2;
          write('STARTTLS');
        } else if (authUser && authPass) {
          step = 3;
          write('AUTH LOGIN');
        } else {
          step = 6;
          write(`MAIL FROM:<${fromEmail || authUser}>`);
        }
      } else if (step === 2) { // STARTTLS upgraded
        const tlsSocket = tls.connect({
          socket,
          host,
          servername: host,
          rejectUnauthorized: false
        }, () => {
          socket = tlsSocket;
          socket.on('data', onData);
          step = 1; // Re-issue EHLO over TLS
          write(`EHLO ${host}`);
        });
        tlsSocket.on('error', (err) => reject(new Error(`TLS Upgrade Failed: ${err.message}`)));
      } else if (step === 3) { // AUTH LOGIN requested
        step = 4;
        write(Buffer.from(authUser).toString('base64'));
      } else if (step === 4) { // Username sent
        step = 5;
        write(Buffer.from(authPass).toString('base64'));
      } else if (step === 5) { // Password sent
        step = 6;
        write(`MAIL FROM:<${fromEmail || authUser}>`);
      } else if (step === 6) { // MAIL FROM sent
        step = 7;
        let rcptIdx = 0;
        function sendNextRcpt() {
          if (rcptIdx < allRcpts.length) {
            const rcpt = allRcpts[rcptIdx++];
            write(`RCPT TO:<${rcpt}>`);
          } else {
            step = 8;
            write('DATA');
          }
        }
        sendNextRcpt();
      } else if (step === 7) { // RCPT TO responses
        step = 8;
        write('DATA');
      } else if (step === 8) { // Ready for DATA
        step = 9;
        const mime = buildMimeMessage();
        socket.write(mime);
      } else if (step === 9) { // Data accepted
        step = 10;
        write('QUIT');
        resolve({ success: true, message: 'Email sent successfully via SMTP.' });
      }
    }

    function onData(chunk) {
      buffer += chunk.toString();
      if (buffer.includes('\r\n')) {
        const lines = buffer.split('\r\n');
        buffer = lines.pop(); // keep last incomplete chunk
        for (const line of lines) {
          if (line.match(/^\d{3}\s/) || line.match(/^\d{3}-/)) {
            if (line.match(/^\d{3}\s/)) {
              handleResponse(line);
            }
          }
        }
      }
    }

    const connectOpts = { host, port: Number(port) || 587 };

    if (isImplicitTls) {
      socket = tls.connect({ ...connectOpts, rejectUnauthorized: false }, () => {
        log(`Connected via TLS to ${host}:${port}`);
      });
    } else {
      socket = net.createConnection(connectOpts, () => {
        log(`Connected via TCP to ${host}:${port}`);
      });
    }

    socket.on('data', onData);
    socket.on('error', (err) => reject(new Error(`SMTP Connection Error: ${err.message}`)));
    socket.setTimeout(15000, () => {
      socket.destroy();
      reject(new Error('SMTP connection timed out after 15 seconds.'));
    });
  });
}
