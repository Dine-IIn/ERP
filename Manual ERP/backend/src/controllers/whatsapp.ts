import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import whatsappService from '../services/whatsapp';
import { generateInvoicePdf } from '../utils/pdf';
import { logAudit } from '../utils/audit';
import fs from 'fs';
import path from 'path';
import {
  CreateWhatsappTemplateSchema,
  UpdateWhatsappTemplateSchema,
  SendWhatsappMessageSchema,
  UpdateWhatsappSettingsSchema
} from '../types';

// Helper to replace template placeholders
function renderTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const key in data) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), data[key] || '');
  }
  // Remove any remaining placeholders
  result = result.replace(/\{\{\w+\}\}/g, '');
  return result;
}

// 1. GET DEVICE SYNC STATUS
export async function getWhatsappStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const statusInfo = whatsappService.getStatus(companyId);
    return res.json(statusInfo);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 2. CONNECT DEVICE
export async function connectWhatsapp(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    // Connect in background
    whatsappService.connect(companyId).catch((err) => {
      console.error(`Error connecting WhatsApp for company ${companyId}:`, err);
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'whatsapp',
      'CONNECT_REQUEST',
      null,
      {},
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: 'WhatsApp connection process initialized.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 3. DISCONNECT DEVICE
export async function disconnectWhatsapp(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    await whatsappService.disconnect(companyId);

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'whatsapp',
      'DISCONNECT_REQUEST',
      null,
      {},
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: 'WhatsApp device unlinked successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 4. GET QR CODE
export async function getWhatsappQr(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const statusInfo = whatsappService.getStatus(companyId);
    if (statusInfo.status === 'PENDING_QR' && statusInfo.qr) {
      return res.json({ qr: statusInfo.qr });
    }
    return res.json({ status: statusInfo.status, message: 'QR code not available or device already connected.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 5. SEND WHATSAPP MESSAGE (MODE 2 & MODE 1 LOGGING)
export async function sendWhatsappMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = SendWhatsappMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const {
      documentType,
      documentId,
      recipientPhone,
      customMessage,
      customPlaceholders,
      mode,
      pdfBase64,
      pdfFilename
    } = parsed.data;

    try {
      fs.writeFileSync(
        path.join(process.cwd(), 'whatsapp_request_debug.txt'),
        JSON.stringify({
          timestamp: new Date().toISOString(),
          documentType,
          documentId,
          recipientPhone,
          mode,
          pdfFilename,
          hasPdfBase64: !!pdfBase64,
          pdfBase64Length: pdfBase64?.length || 0,
          pdfBase64Snippet: pdfBase64 ? pdfBase64.substring(0, 100) : null
        }, null, 2),
        'utf-8'
      );
    } catch (writeErr) {
      console.error('Failed to write whatsapp request debug file:', writeErr);
    }

    // Rate Limiting Check (Database Fallback)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await prisma.whatsappMessageLog.count({
      where: {
        companyId,
        status: 'SENT',
        createdAt: { gte: oneHourAgo }
      }
    });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { whatsappMaxLimitPerHour: true, name: true, whatsappDefaultCountryCode: true }
    });

    const limit = company?.whatsappMaxLimitPerHour ?? 100;
    if (count >= limit) {
      return res.status(429).json({ error: `Hourly sending limit exceeded. Company maximum is ${limit} messages per hour.` });
    }

    // Resolve Recipient Phone with Default Country Code if missing prefix
    let targetPhone = recipientPhone.replace(/\D/g, '');
    const defaultCode = (company?.whatsappDefaultCountryCode || '+91').replace(/\D/g, '');
    if (targetPhone && !targetPhone.startsWith(defaultCode) && targetPhone.length <= 10) {
      targetPhone = defaultCode + targetPhone;
    }

    // Resolve Placeholders and Document Data
    const resolvedPlaceholders: Record<string, string> = {
      companyName: company?.name || 'ERP Workspace'
    };

    let pdfBuffer: Buffer | null = null;
    let filename = '';

    if (pdfBase64) {
      pdfBuffer = Buffer.from(pdfBase64, 'base64');
      filename = pdfFilename || 'document.pdf';
    }

    if (documentType && documentId) {
      if (documentType === 'SALES_INVOICE') {
        const doc = await prisma.salesInvoice.findFirst({
          where: { id: documentId, companyId },
          include: { customer: true, items: { include: { product: true } } }
        });
        if (doc) {
          resolvedPlaceholders.customerName = doc.customer.name;
          resolvedPlaceholders.customerCode = doc.customer.id;
          resolvedPlaceholders.invoiceNumber = doc.invoiceNo;
          resolvedPlaceholders.invoiceDate = doc.date.toLocaleDateString();
          resolvedPlaceholders.invoiceAmount = `${doc.customer.currencySymbol || '$'}${doc.total.toFixed(2)}`;
          resolvedPlaceholders.dueDate = doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : '';

          if (!filename) {
            filename = `Invoice_${doc.invoiceNo}.pdf`;
          }
        }
      } else if (documentType === 'PROFORMA_INVOICE') {
        const doc = await prisma.proformaInvoice.findFirst({
          where: { id: documentId, companyId },
          include: { customer: true }
        });
        if (doc) {
          resolvedPlaceholders.customerName = doc.customer.name;
          resolvedPlaceholders.customerCode = doc.customer.id;
          resolvedPlaceholders.invoiceNumber = doc.invoiceNo;
          resolvedPlaceholders.invoiceDate = doc.date.toLocaleDateString();
          resolvedPlaceholders.invoiceAmount = `${doc.customer.currencySymbol || '$'}${doc.total.toFixed(2)}`;
          resolvedPlaceholders.dueDate = doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : '';
        }
      } else if (documentType === 'DELIVERY_CHALLAN') {
        const doc = await prisma.deliveryChallan.findFirst({
          where: { id: documentId, companyId },
          include: { customer: true, items: { include: { product: true } } }
        });
        if (doc) {
          resolvedPlaceholders.customerName = doc.customer.name;
          resolvedPlaceholders.customerCode = doc.customer.id;
          resolvedPlaceholders.challanNumber = doc.challanNo;
          resolvedPlaceholders.invoiceDate = doc.date.toLocaleDateString();

          if (!filename) {
            filename = `Challan_${doc.challanNo}.pdf`;
          }
        }
      } else if (documentType === 'PURCHASE_ORDER') {
        const doc = await prisma.purchaseOrder.findFirst({
          where: { id: documentId, companyId },
          include: { vendor: true }
        });
        if (doc) {
          resolvedPlaceholders.customerName = doc.vendor.name;
          resolvedPlaceholders.customerCode = doc.vendor.id;
          resolvedPlaceholders.poNumber = doc.poNo;
          resolvedPlaceholders.invoiceDate = doc.date.toLocaleDateString();
          resolvedPlaceholders.invoiceAmount = `${doc.vendor.currencySymbol || '$'}${doc.total.toFixed(2)}`;
        }
      } else if (documentType === 'QUOTATION') {
        const doc = await prisma.quotation.findFirst({
          where: { id: documentId, companyId },
          include: { customer: true }
        });
        if (doc) {
          resolvedPlaceholders.customerName = doc.customer.name;
          resolvedPlaceholders.customerCode = doc.customer.id;
          resolvedPlaceholders.quotationNumber = doc.quoteNo;
          resolvedPlaceholders.invoiceDate = doc.date.toLocaleDateString();
          resolvedPlaceholders.invoiceAmount = `${doc.customer.currencySymbol || '$'}${doc.total.toFixed(2)}`;
        }
      } else if (documentType === 'PAYMENT_RECEIPT') {
        const doc = await prisma.companyReceipt.findFirst({
          where: { id: documentId, companyId }
        });
        if (doc) {
          resolvedPlaceholders.customerName = doc.payerName;
          resolvedPlaceholders.customerCode = '';
          resolvedPlaceholders.receiptNumber = doc.referenceNo || doc.id;
          resolvedPlaceholders.invoiceDate = doc.date.toLocaleDateString();
          resolvedPlaceholders.invoiceAmount = `$${doc.amount.toFixed(2)}`;
        }
      } else if (documentType === 'DEBIT_NOTE') {
        const doc = await prisma.purchaseReturn.findFirst({
          where: { id: documentId, companyId },
          include: { purchaseOrder: { include: { vendor: true } }, items: true }
        });
        if (doc) {
          const vendor = doc.purchaseOrder?.vendor;
          resolvedPlaceholders.customerName = vendor?.name || 'Supplier';
          resolvedPlaceholders.customerCode = vendor?.id || '';
          resolvedPlaceholders.invoiceNumber = doc.returnNo;
          resolvedPlaceholders.invoiceDate = doc.returnDate.toLocaleDateString();

          const debitVal = doc.items.reduce((sum, it) => sum + (it.quantity * it.price), 0);
          resolvedPlaceholders.invoiceAmount = `${vendor?.currencySymbol || '$'}${debitVal.toFixed(2)}`;
        }
      }
    }

    // Apply custom placeholders overrides
    if (customPlaceholders) {
      Object.assign(resolvedPlaceholders, customPlaceholders);
    }

    // Compute message
    let message = customMessage;
    if (!message) {
      const templateRecord = await prisma.whatsappTemplate.findFirst({
        where: { companyId, documentType }
      });
      if (templateRecord) {
        message = renderTemplate(templateRecord.template, resolvedPlaceholders);
      } else {
        message = `Hello ${resolvedPlaceholders.customerName || 'Client'},\r\n\r\nPlease find details for document from ${resolvedPlaceholders.companyName}.\r\n\r\nRegards.`;
      }
    } else {
      message = renderTemplate(message, resolvedPlaceholders);
    }

    // Log tracking in DB
    const logData = {
      companyId,
      documentType: documentType || 'GENERIC',
      documentId: documentId || 'CUSTOM',
      recipientPhone: targetPhone,
      message,
      createdBy: req.user?.userId || null,
      updatedBy: req.user?.userId || null
    };

    if (mode === 'SHARE_LINK') {
      // Just record a log entry indicating manual redirect opened
      await prisma.whatsappMessageLog.create({
        data: {
          ...logData,
          status: 'SENT',
          sentAt: new Date()
        }
      });
      return res.json({ success: true, message: 'Share link logged successfully.' });
    }

    // Mode 2: Send Automatically via back-end Baileys session
    const attachment = pdfBuffer ? { filename, content: pdfBuffer } : undefined;
    
    console.log(`[WhatsApp Send] Sending message. documentType=${documentType}, targetPhone=${targetPhone}, hasAttachment=${!!attachment}, filename=${filename}, pdfBufferLength=${pdfBuffer ? pdfBuffer.length : 0}`);

    try {
      await whatsappService.sendMessage(companyId, targetPhone, message, attachment);
      
      await prisma.whatsappMessageLog.create({
        data: {
          ...logData,
          status: 'SENT',
          sentAt: new Date()
        }
      });
      
      return res.json({ success: true, message: 'WhatsApp message sent successfully with PDF attachment!' });
    } catch (sendErr: any) {
      console.error(`WhatsApp automated transmission failed for company ${companyId} to ${targetPhone}:`, sendErr);
      
      await prisma.whatsappMessageLog.create({
        data: {
          ...logData,
          status: 'FAILED',
          error: sendErr.message || 'WhatsApp transmission failed.'
        }
      });
      
      return res.status(500).json({ error: sendErr.message || 'WhatsApp transmission failed.' });
    }
  } catch (error: any) {
    console.error(`WhatsApp send controller error:`, error);
    return res.status(500).json({ error: error.message });
  }
}

// 6. UPDATE WHATSAPP GENERAL SETTINGS
export async function updateWhatsappSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = UpdateWhatsappSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { defaultCountryCode, maxLimitPerHour } = parsed.data;

    await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(defaultCountryCode !== undefined && { whatsappDefaultCountryCode: defaultCountryCode }),
        ...(maxLimitPerHour !== undefined && { whatsappMaxLimitPerHour: maxLimitPerHour })
      }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'whatsapp',
      'SETTINGS_UPDATE',
      null,
      { defaultCountryCode, maxLimitPerHour },
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: 'WhatsApp settings saved successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 7. GET ALL TEMPLATES
export async function getWhatsappTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const templates = await prisma.whatsappTemplate.findMany({
      where: { companyId }
    });
    return res.json({ templates });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 8. CREATE OR UPDATE TEMPLATE
export async function saveWhatsappTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = CreateWhatsappTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { documentType, template, emailTemplate, useSameForEmail, isActive } = parsed.data;

    const existing = await prisma.whatsappTemplate.findFirst({
      where: { companyId, documentType }
    });

    let saved;
    if (existing) {
      saved = await prisma.whatsappTemplate.update({
        where: { id: existing.id },
        data: {
          template,
          emailTemplate: emailTemplate !== undefined ? emailTemplate : null,
          useSameForEmail: useSameForEmail !== undefined ? useSameForEmail : true,
          isActive: isActive ?? true,
          updatedBy: req.user?.userId || null
        }
      });
    } else {
      saved = await prisma.whatsappTemplate.create({
        data: {
          companyId,
          documentType,
          template,
          emailTemplate: emailTemplate || null,
          useSameForEmail: useSameForEmail ?? true,
          isActive: isActive ?? true,
          createdBy: req.user?.userId || null,
          updatedBy: req.user?.userId || null
        }
      });
    }

    return res.json({ message: 'Template saved successfully.', template: saved });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 9. DELETE TEMPLATE
export async function deleteWhatsappTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    const template = await prisma.whatsappTemplate.findFirst({
      where: { id, companyId }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    await prisma.whatsappTemplate.delete({
      where: { id }
    });

    return res.json({ message: 'Template deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// 10. GET MESSAGE LOGS
export async function getWhatsappLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const logs = await prisma.whatsappMessageLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ logs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
