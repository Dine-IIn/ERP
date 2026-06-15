import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../services/db';
import { logAudit } from '../utils/audit';
import { LeadSchema, OpportunitySchema, FollowUpSchema } from '../types';

// ==========================================
// 1. LEADS CONTROLLER
// ==========================================

export async function listLeads(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const leads = await prisma.lead.findMany({
      where: { companyId },
      include: { assignedTo: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ leads });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createLead(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = LeadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { name, companyName, email, phone, source, status, assignedToId, notes } = parsed.data;

    const lead = await prisma.lead.create({
      data: {
        companyId,
        name,
        companyName: companyName || null,
        email: email || null,
        phone,
        source,
        status,
        assignedToId: assignedToId || null,
        notes: notes || null
      },
      include: { assignedTo: { select: { id: true, username: true } } }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'crm_lead',
      'CREATE',
      null,
      { id: lead.id, name: lead.name },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({ message: "Lead logged successfully", lead });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateLead(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const parsed = LeadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { name, companyName, email, phone, source, status, assignedToId, notes } = parsed.data;

    const leadToUpdate = await prisma.lead.findFirst({
      where: { id, companyId }
    });
    if (!leadToUpdate) {
      return res.status(404).json({ error: "Lead record not found." });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(companyName !== undefined && { companyName: companyName || null }),
        ...(email !== undefined && { email: email || null }),
        ...(phone && { phone }),
        ...(source && { source }),
        ...(status && { status }),
        ...(assignedToId !== undefined && { assignedToId: assignedToId || null }),
        ...(notes !== undefined && { notes: notes || null })
      },
      include: { assignedTo: { select: { id: true, username: true } } }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'crm_lead',
      'UPDATE',
      leadToUpdate,
      updated,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: "Lead updated successfully", lead: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteLead(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;

    const lead = await prisma.lead.findFirst({
      where: { id, companyId }
    });
    if (!lead) return res.status(404).json({ error: "Lead record not found." });

    await prisma.lead.delete({
      where: { id }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'crm_lead',
      'DELETE',
      { id: lead.id, name: lead.name },
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: `Lead '${lead.name}' permanently deleted.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 2. OPPORTUNITIES CONTROLLER
// ==========================================

export async function listOpportunities(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const opportunities = await prisma.opportunity.findMany({
      where: { companyId },
      include: { lead: { select: { id: true, name: true, companyName: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ opportunities });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createOpportunity(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = OpportunitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { leadId, title, value, stage, probability, closeDate } = parsed.data;

    const opportunity = await prisma.opportunity.create({
      data: {
        companyId,
        leadId,
        title,
        value: parseFloat(value) || 0.0,
        stage,
        probability: parseFloat(probability) || 0.0,
        closeDate: closeDate ? new Date(closeDate) : null
      },
      include: { lead: { select: { id: true, name: true, companyName: true } } }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'crm_opportunity',
      'CREATE',
      null,
      { id: opportunity.id, title: opportunity.title, value: opportunity.value },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({ message: "Opportunity created", opportunity });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateOpportunity(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const parsed = OpportunitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { title, value, stage, probability, closeDate } = parsed.data;

    const opp = await prisma.opportunity.findFirst({
      where: { id, companyId }
    });
    if (!opp) return res.status(404).json({ error: "Opportunity not found." });

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(value !== undefined && { value: parseFloat(value) || 0.0 }),
        ...(stage && { stage }),
        ...(probability !== undefined && { probability: parseFloat(probability) || 0.0 }),
        ...(closeDate !== undefined && { closeDate: closeDate ? new Date(closeDate) : null })
      },
      include: { lead: { select: { id: true, name: true, companyName: true } } }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'crm_opportunity',
      'UPDATE',
      opp,
      updated,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: "Opportunity updated", opportunity: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteOpportunity(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;

    const opp = await prisma.opportunity.findFirst({
      where: { id, companyId }
    });
    if (!opp) return res.status(404).json({ error: "Opportunity not found." });

    await prisma.opportunity.delete({
      where: { id }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'crm_opportunity',
      'DELETE',
      { id: opp.id, title: opp.title },
      null,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: `Opportunity '${opp.title}' voided.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 3. FOLLOW-UPS CONTROLLER
// ==========================================

export async function listFollowUps(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const followups = await prisma.followUp.findMany({
      where: { companyId },
      include: { lead: { select: { id: true, name: true, companyName: true } } },
      orderBy: { scheduledDate: 'asc' }
    });

    return res.json({ followups });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createFollowUp(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = FollowUpSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { leadId, scheduledDate, type, status, notes, outcome } = parsed.data;

    const followup = await prisma.followUp.create({
      data: {
        companyId,
        leadId,
        scheduledDate: new Date(scheduledDate),
        type,
        status,
        notes: notes || null,
        outcome: outcome || null
      },
      include: { lead: { select: { id: true, name: true, companyName: true } } }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'crm_followup',
      'CREATE',
      null,
      { id: followup.id, type: followup.type, scheduledDate: followup.scheduledDate },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({ message: "Follow-up scheduled", followup });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateFollowUp(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const parsed = FollowUpSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
    const { scheduledDate, type, status, notes, outcome } = parsed.data;

    const fup = await prisma.followUp.findFirst({
      where: { id, companyId }
    });
    if (!fup) return res.status(404).json({ error: "Follow-up not found." });

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
        ...(type && { type }),
        ...(status && { status }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(outcome !== undefined && { outcome: outcome || null })
      },
      include: { lead: { select: { id: true, name: true, companyName: true } } }
    });

    await logAudit(
      companyId,
      req.user?.userId || null,
      req.user?.username || null,
      'crm_followup',
      'UPDATE',
      fup,
      updated,
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: "Follow-up status updated", followup: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteFollowUp(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;

    const fup = await prisma.followUp.findFirst({
      where: { id, companyId }
    });
    if (!fup) return res.status(404).json({ error: "Follow-up scheduled entry not found." });

    await prisma.followUp.delete({
      where: { id }
    });

    return res.json({ message: "Scheduled follow-up cancelled." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 4. CRM ANALYTICS STATS CONTROLLER
// ==========================================

export async function getCrmStats(req: AuthenticatedRequest, res: Response) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(401).json({ error: "Unauthorized" });

    const leads = await prisma.lead.findMany({ where: { companyId } });
    const opportunities = await prisma.opportunity.findMany({ where: { companyId } });
    const followups = await prisma.followUp.findMany({ where: { companyId } });

    // Compute basic statistics
    const totalLeads = leads.length;
    const activePipelineVal = opportunities.reduce((sum, opp) => {
      if (opp.stage !== 'WON' && opp.stage !== 'LOST') {
        return sum + (opp.value || 0);
      }
      return sum;
    }, 0);
    const dealsWonCount = opportunities.filter(opp => opp.stage === 'WON').length;
    const totalWonVal = opportunities.filter(opp => opp.stage === 'WON').reduce((sum, opp) => sum + opp.value, 0);

    // Distribution by Status/Stages
    const statusCounts: Record<string, number> = { NEW: 0, CONTACTED: 0, QUALIFIED: 0, LOST: 0 };
    leads.forEach(l => {
      if (statusCounts[l.status] !== undefined) statusCounts[l.status]++;
    });

    const pipelineStages: Record<string, number> = { PROSPECTING: 0, PROPOSAL: 0, NEGOTIATION: 0, WON: 0, LOST: 0 };
    opportunities.forEach(opp => {
      if (pipelineStages[opp.stage] !== undefined) pipelineStages[opp.stage]++;
    });

    // Upcoming schedules
    const pendingFollowups = followups.filter(f => f.status === 'PENDING').length;

    return res.json({
      stats: {
        totalLeads,
        activePipelineVal,
        dealsWonCount,
        totalWonVal,
        statusCounts,
        pipelineStages,
        pendingFollowups
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
