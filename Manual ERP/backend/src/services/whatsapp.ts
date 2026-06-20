import makeWASocket, {
  DisconnectReason,
  BufferJSON,
  WASocket,
  initAuthCreds,
  proto,
  AuthenticationState,
  ConnectionState
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import crypto from 'crypto';
import prisma from './db';

// Logger for Baileys
const logger = pino({ level: 'silent' });

// Encryption helper
function encrypt(text: string, secretKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string, secretKey: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Custom Encrypted Multi-File Auth State Provider
async function useEncryptedMultiFileAuthState(folder: string) {
  const secretKeyString = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'whatsapp-secret-key-fallback-32b').digest('hex');

  const writeData = (data: any, file: string) => {
    const filePath = path.join(folder, file);
    const jsonStr = JSON.stringify(data, BufferJSON.replacer);
    const encrypted = encrypt(jsonStr, secretKeyString);
    fs.writeFileSync(filePath, encrypted, 'utf-8');
  };

  const readData = (file: string) => {
    const filePath = path.join(folder, file);
    if (!fs.existsSync(filePath)) return null;
    try {
      const encrypted = fs.readFileSync(filePath, 'utf-8');
      const decrypted = decrypt(encrypted, secretKeyString);
      return JSON.parse(decrypted, BufferJSON.reviver);
    } catch (e) {
      console.error(`Error reading/decrypting file ${file}`, e);
      return null;
    }
  };

  const removeData = (file: string) => {
    const filePath = path.join(folder, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
  };

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  let creds = readData('creds.json');
  if (!creds) {
    creds = initAuthCreds();
    writeData(creds, 'creds.json');
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: any = {};
          for (const id of ids) {
            let value = readData(`${type}-${id}.json`);
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          }
          return data;
        },
        set: async (data: any) => {
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const file = `${category}-${id}.json`;
              if (value) {
                writeData(value, file);
              } else {
                removeData(file);
              }
            }
          }
        }
      }
    } as AuthenticationState,
    saveCreds: () => {
      writeData(creds, 'creds.json');
    }
  };
}

class WhatsAppService {
  // In-memory mapping of active sockets, latest QR base64, and statuses
  private sockets = new Map<string, WASocket>();
  private qrs = new Map<string, string>();
  private statuses = new Map<string, 'CONNECTED' | 'DISCONNECTED' | 'PENDING_QR' | 'CONNECTING'>();

  // Initialize service on server startup - reconnects previously connected clients
  async init() {
    try {
      console.log('🔄 [WhatsApp Service] Loading saved WhatsApp sessions...');
      const sessions = await prisma.whatsappSession.findMany({
        where: { isConnected: true }
      });
      for (const session of sessions) {
        console.log(`🔌 [WhatsApp Service] Re-establishing WhatsApp link for company: ${session.companyId}`);
        this.connect(session.companyId).catch((err) => {
          console.error(`Failed to reconnect session for company ${session.companyId}:`, err);
        });
      }
    } catch (error) {
      console.error('[WhatsApp Service] Error during initialization:', error);
    }
  }

  // Connect / link device
  async connect(companyId: string): Promise<void> {
    if (this.sockets.has(companyId)) {
      const status = this.statuses.get(companyId);
      if (status === 'CONNECTED' || status === 'CONNECTING') {
        return;
      }
    }

    this.statuses.set(companyId, 'CONNECTING');
    const sessionDir = path.join(process.cwd(), 'whatsapp_sessions', `company-${companyId}`);

    const { state, saveCreds } = await useEncryptedMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      auth: state,
      logger,
      printQRInTerminal: false
    });

    this.sockets.set(companyId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr);
          this.qrs.set(companyId, qrDataUrl);
          this.statuses.set(companyId, 'PENDING_QR');
        } catch (err) {
          console.error('Failed to generate QR data URL:', err);
        }
      }

      if (connection === 'open') {
        const userJid = sock.user?.id;
        const displayName = sock.user?.name || 'WhatsApp Device';
        const phoneNumber = userJid ? userJid.split(':')[0] : null;

        this.qrs.delete(companyId);
        this.statuses.set(companyId, 'CONNECTED');

        await prisma.whatsappSession.upsert({
          where: { companyId },
          update: {
            isConnected: true,
            phoneNumber,
            displayName,
            lastConnectedAt: new Date()
          },
          create: {
            companyId,
            sessionName: `Session_${companyId}`,
            isConnected: true,
            phoneNumber,
            displayName,
            lastConnectedAt: new Date()
          }
        });

        console.log(`✅ [WhatsApp Service] Company ${companyId} WhatsApp linked successfully. Phone: ${phoneNumber}`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode ?? (lastDisconnect?.error as any)?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`🔌 [WhatsApp Service] Connection closed for company ${companyId}. Reason code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

        this.qrs.delete(companyId);

        if (!shouldReconnect) {
          // Logged out
          this.statuses.set(companyId, 'DISCONNECTED');
          this.sockets.delete(companyId);
          await prisma.whatsappSession.updateMany({
            where: { companyId },
            data: { isConnected: false }
          });
          // Delete auth folder safely
          try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          } catch {}
        } else {
          // Automatic reconnect
          this.statuses.set(companyId, 'CONNECTING');
          const oldSock = this.sockets.get(companyId);
          if (oldSock) {
            try {
              oldSock.ev.removeAllListeners('connection.update');
              oldSock.ev.removeAllListeners('creds.update');
            } catch {}
            this.sockets.delete(companyId);
          }
          setTimeout(() => this.connect(companyId), 5000);
        }
      }
    });
  }

  // Disconnect/logout session
  async disconnect(companyId: string): Promise<void> {
    const sock = this.sockets.get(companyId);
    if (sock) {
      try {
        await sock.logout();
      } catch {}
      this.sockets.delete(companyId);
    }

    this.statuses.set(companyId, 'DISCONNECTED');
    this.qrs.delete(companyId);

    await prisma.whatsappSession.updateMany({
      where: { companyId },
      data: { isConnected: false }
    });

    const sessionDir = path.join(process.cwd(), 'whatsapp_sessions', `company-${companyId}`);
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch {}
  }

  // Get status
  getStatus(companyId: string) {
    const status = this.statuses.get(companyId) || 'DISCONNECTED';
    const qr = status === 'PENDING_QR' ? this.qrs.get(companyId) : undefined;
    const sock = this.sockets.get(companyId);

    return {
      status,
      qr,
      phoneNumber: sock?.user?.id ? sock.user.id.split(':')[0] : null,
      displayName: sock?.user?.name || null
    };
  }

  // Send message
  async sendMessage(
    companyId: string,
    recipient: string,
    text: string,
    pdfAttachment?: { filename: string; content: Buffer }
  ): Promise<string> {
    const sock = this.sockets.get(companyId);
    const status = this.statuses.get(companyId);

    if (!sock || status !== 'CONNECTED') {
      throw new Error('WhatsApp device is not linked or disconnected. Please link your device first.');
    }

    // Clean recipient phone number
    let cleanPhone = recipient.replace(/\D/g, '');
    if (!cleanPhone) {
      throw new Error('Invalid recipient phone number.');
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;

    try {
      if (pdfAttachment) {
        const response = await sock.sendMessage(jid, {
          document: pdfAttachment.content,
          mimetype: 'application/pdf',
          fileName: pdfAttachment.filename,
          caption: text
        });
        return response?.key?.id || 'attachment_sent';
      } else {
        const response = await sock.sendMessage(jid, { text });
        return response?.key?.id || 'text_sent';
      }
    } catch (error: any) {
      console.error(`[WhatsApp Service] Failed to send WhatsApp message to ${recipient}:`, error);
      throw new Error(`WhatsApp API transmission failure: ${error.message || error}`);
    }
  }
}

export default new WhatsAppService();
