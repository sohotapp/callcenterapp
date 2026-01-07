import { db } from "./db";
import { eq, desc, sql, and, count } from "drizzle-orm";
import {
  users,
  governmentLeads,
  callScripts,
  companyProfile,
  callLogs,
  scrapeJobs,
  icpProfiles,
  emailSequences,
  sequenceSteps,
  sequenceEnrollments,
  outreachActivities,
  type User,
  type InsertUser,
  type GovernmentLead,
  type InsertGovernmentLead,
  type CallScript,
  type InsertCallScript,
  type CompanyProfile,
  type InsertCompanyProfile,
  type CallLog,
  type InsertCallLog,
  type ScrapeJob,
  type InsertScrapeJob,
  type IcpProfile,
  type InsertIcpProfile,
  type DecisionMaker,
  type RecentNews,
  type CompetitorAnalysis,
  type ScriptStyle,
  type ScoringBreakdown,
  type EmailSequence,
  type InsertEmailSequence,
  type SequenceStep,
  type InsertSequenceStep,
  type SequenceEnrollment,
  type InsertSequenceEnrollment,
  type EmailSequenceWithSteps,
  type OutreachActivity,
  type InsertOutreachActivity,
  type CallOutcome,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface LeadEnrichmentData {
  decisionMakers?: DecisionMaker[];
  techStack?: string[];
  recentNews?: RecentNews[];
  competitorAnalysis?: CompetitorAnalysis[];
  buyingSignals?: string[];
  enrichmentData?: Record<string, unknown>;
  enrichmentScore?: number;
}

export interface LeadScoringData {
  likelihoodScore: number;
  matchScore: number;
  urgencyScore: number;
  budgetFitScore: number;
  priorityScore: number;
  scoringBreakdown: ScoringBreakdown;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllLeads(): Promise<GovernmentLead[]>;
  getLead(id: number): Promise<GovernmentLead | undefined>;
  createLead(lead: InsertGovernmentLead): Promise<GovernmentLead>;
  updateLead(id: number, lead: Partial<InsertGovernmentLead>): Promise<GovernmentLead | undefined>;
  updateLeadEnrichment(id: number, enrichment: LeadEnrichmentData): Promise<GovernmentLead | undefined>;
  updateLeadScoring(id: number, scoring: LeadScoringData): Promise<GovernmentLead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  getTopScoredLeads(limit: number): Promise<GovernmentLead[]>;

  getScriptByLeadId(leadId: number, scriptStyle?: ScriptStyle): Promise<CallScript | undefined>;
  getScriptsByLeadId(leadId: number): Promise<CallScript[]>;
  createScript(script: InsertCallScript): Promise<CallScript>;
  getAllScripts(): Promise<CallScript[]>;

  getCompanyProfile(): Promise<CompanyProfile | undefined>;
  upsertCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile>;

  getCallLogsByLeadId(leadId: number): Promise<CallLog[]>;
  createCallLog(log: InsertCallLog): Promise<CallLog>;

  getAllScrapeJobs(): Promise<ScrapeJob[]>;
  getScrapeJob(id: number): Promise<ScrapeJob | undefined>;
  createScrapeJob(job: InsertScrapeJob): Promise<ScrapeJob>;
  updateScrapeJob(id: number, job: Partial<InsertScrapeJob>): Promise<ScrapeJob | undefined>;

  getIcpProfiles(): Promise<IcpProfile[]>;
  getIcpProfile(id: number): Promise<IcpProfile | undefined>;
  updateIcpProfile(id: number, profile: Partial<InsertIcpProfile>): Promise<IcpProfile | undefined>;
  seedDefaultIcps(): Promise<void>;
  countMatchingLeads(icpId: number): Promise<number>;

  // Email Sequences
  getAllSequences(): Promise<EmailSequence[]>;
  getSequence(id: number): Promise<EmailSequence | undefined>;
  getSequenceWithSteps(id: number): Promise<EmailSequenceWithSteps | undefined>;
  createSequence(sequence: InsertEmailSequence): Promise<EmailSequence>;
  updateSequence(id: number, sequence: Partial<InsertEmailSequence>): Promise<EmailSequence | undefined>;
  deleteSequence(id: number): Promise<boolean>;

  // Sequence Steps
  getStepsBySequenceId(sequenceId: number): Promise<SequenceStep[]>;
  getStep(id: number): Promise<SequenceStep | undefined>;
  createStep(step: InsertSequenceStep): Promise<SequenceStep>;
  updateStep(id: number, step: Partial<InsertSequenceStep>): Promise<SequenceStep | undefined>;
  deleteStep(id: number): Promise<boolean>;

  // Sequence Enrollments
  getEnrollmentsBySequenceId(sequenceId: number): Promise<SequenceEnrollment[]>;
  getEnrollmentsByLeadId(leadId: number): Promise<SequenceEnrollment[]>;
  getEnrollment(id: number): Promise<SequenceEnrollment | undefined>;
  createEnrollment(enrollment: InsertSequenceEnrollment): Promise<SequenceEnrollment>;
  updateEnrollment(id: number, enrollment: Partial<InsertSequenceEnrollment>): Promise<SequenceEnrollment | undefined>;
  deleteEnrollment(id: number): Promise<boolean>;

  // Outreach Activities
  createActivity(activity: InsertOutreachActivity): Promise<OutreachActivity>;
  getActivitiesByLead(leadId: number): Promise<OutreachActivity[]>;
  getActivitiesBySequence(sequenceId: number): Promise<OutreachActivity[]>;
  getActivityStats(): Promise<ActivityStats>;
  updateLeadCallOutcome(leadId: number, outcome: CallOutcome, notes?: string): Promise<GovernmentLead | undefined>;
}

export interface ActivityStats {
  totalActivities: number;
  emailsSent: number;
  emailsOpened: number;
  emailsReplied: number;
  callsMade: number;
  callsAnswered: number;
  linkedinSent: number;
  linkedinConnected: number;
  meetingsScheduled: number;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllLeads(): Promise<GovernmentLead[]> {
    return db.select().from(governmentLeads).orderBy(desc(governmentLeads.priorityScore));
  }

  async getLead(id: number): Promise<GovernmentLead | undefined> {
    const [lead] = await db.select().from(governmentLeads).where(eq(governmentLeads.id, id));
    return lead;
  }

  async createLead(insertLead: InsertGovernmentLead): Promise<GovernmentLead> {
    const [lead] = await db.insert(governmentLeads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: number, updates: Partial<InsertGovernmentLead>): Promise<GovernmentLead | undefined> {
    const [lead] = await db
      .update(governmentLeads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(governmentLeads.id, id))
      .returning();
    return lead;
  }

  async deleteLead(id: number): Promise<boolean> {
    const result = await db.delete(governmentLeads).where(eq(governmentLeads.id, id));
    return true;
  }

  async updateLeadScoring(id: number, scoring: LeadScoringData): Promise<GovernmentLead | undefined> {
    const [lead] = await db
      .update(governmentLeads)
      .set({
        likelihoodScore: scoring.likelihoodScore,
        matchScore: scoring.matchScore,
        urgencyScore: scoring.urgencyScore,
        budgetFitScore: scoring.budgetFitScore,
        priorityScore: scoring.priorityScore,
        scoringBreakdown: scoring.scoringBreakdown,
        lastScoredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(governmentLeads.id, id))
      .returning();
    return lead;
  }

  async getTopScoredLeads(limit: number): Promise<GovernmentLead[]> {
    return db
      .select()
      .from(governmentLeads)
      .orderBy(desc(governmentLeads.priorityScore))
      .limit(limit);
  }

  async updateLeadEnrichment(id: number, enrichment: LeadEnrichmentData): Promise<GovernmentLead | undefined> {
    const [lead] = await db
      .update(governmentLeads)
      .set({
        decisionMakers: enrichment.decisionMakers,
        techStack: enrichment.techStack,
        recentNews: enrichment.recentNews,
        competitorAnalysis: enrichment.competitorAnalysis,
        buyingSignals: enrichment.buyingSignals,
        enrichmentData: enrichment.enrichmentData,
        enrichmentScore: enrichment.enrichmentScore,
        enrichedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(governmentLeads.id, id))
      .returning();
    return lead;
  }

  async getScriptByLeadId(leadId: number, scriptStyle?: ScriptStyle): Promise<CallScript | undefined> {
    if (scriptStyle) {
      const [script] = await db.select().from(callScripts).where(
        and(eq(callScripts.leadId, leadId), eq(callScripts.scriptStyle, scriptStyle))
      );
      return script;
    }
    const [script] = await db.select().from(callScripts).where(eq(callScripts.leadId, leadId)).orderBy(desc(callScripts.generatedAt)).limit(1);
    return script;
  }

  async getScriptsByLeadId(leadId: number): Promise<CallScript[]> {
    return db.select().from(callScripts).where(eq(callScripts.leadId, leadId)).orderBy(desc(callScripts.generatedAt));
  }

  async createScript(insertScript: InsertCallScript): Promise<CallScript> {
    await db.delete(callScripts).where(
      and(eq(callScripts.leadId, insertScript.leadId), eq(callScripts.scriptStyle, insertScript.scriptStyle))
    );
    const [script] = await db.insert(callScripts).values(insertScript).returning();
    return script;
  }

  async getAllScripts(): Promise<CallScript[]> {
    return db.select().from(callScripts).orderBy(desc(callScripts.generatedAt));
  }

  async getCompanyProfile(): Promise<CompanyProfile | undefined> {
    const [profile] = await db.select().from(companyProfile);
    return profile;
  }

  async upsertCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile> {
    const existing = await this.getCompanyProfile();
    if (existing) {
      const [updated] = await db
        .update(companyProfile)
        .set({ ...profile, lastUpdated: new Date() })
        .where(eq(companyProfile.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(companyProfile).values(profile).returning();
    return created;
  }

  async getCallLogsByLeadId(leadId: number): Promise<CallLog[]> {
    return db.select().from(callLogs).where(eq(callLogs.leadId, leadId)).orderBy(desc(callLogs.callDate));
  }

  async createCallLog(insertLog: InsertCallLog): Promise<CallLog> {
    const [log] = await db.insert(callLogs).values(insertLog).returning();
    return log;
  }

  async getAllScrapeJobs(): Promise<ScrapeJob[]> {
    return db.select().from(scrapeJobs).orderBy(desc(scrapeJobs.createdAt));
  }

  async getScrapeJob(id: number): Promise<ScrapeJob | undefined> {
    const [job] = await db.select().from(scrapeJobs).where(eq(scrapeJobs.id, id));
    return job;
  }

  async createScrapeJob(insertJob: InsertScrapeJob): Promise<ScrapeJob> {
    const [job] = await db.insert(scrapeJobs).values(insertJob).returning();
    return job;
  }

  async updateScrapeJob(id: number, updates: Partial<InsertScrapeJob>): Promise<ScrapeJob | undefined> {
    const [job] = await db
      .update(scrapeJobs)
      .set(updates)
      .where(eq(scrapeJobs.id, id))
      .returning();
    return job;
  }

  async getIcpProfiles(): Promise<IcpProfile[]> {
    return db.select().from(icpProfiles).orderBy(icpProfiles.id);
  }

  async getIcpProfile(id: number): Promise<IcpProfile | undefined> {
    const [profile] = await db.select().from(icpProfiles).where(eq(icpProfiles.id, id));
    return profile;
  }

  async updateIcpProfile(id: number, updates: Partial<InsertIcpProfile>): Promise<IcpProfile | undefined> {
    const [profile] = await db
      .update(icpProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(icpProfiles.id, id))
      .returning();
    return profile;
  }

  async countMatchingLeads(icpId: number): Promise<number> {
    const icp = await this.getIcpProfile(icpId);
    if (!icp) return 0;

    const leads = await this.getAllLeads();
    const criteria = icp.targetCriteria;
    
    if (!criteria) return leads.length;

    return leads.filter(lead => {
      if (criteria.minPopulation && lead.population && lead.population < criteria.minPopulation) return false;
      if (criteria.maxPopulation && lead.population && lead.population > criteria.maxPopulation) return false;
      if (criteria.techMaturityMin && lead.techMaturityScore && lead.techMaturityScore < criteria.techMaturityMin) return false;
      if (criteria.techMaturityMax && lead.techMaturityScore && lead.techMaturityScore > criteria.techMaturityMax) return false;
      if (criteria.states && criteria.states.length > 0 && !criteria.states.includes(lead.state)) return false;
      if (criteria.departments && criteria.departments.length > 0 && lead.department && !criteria.departments.includes(lead.department)) return false;
      return true;
    }).length;
  }

  async seedDefaultIcps(): Promise<void> {
    const existing = await this.getIcpProfiles();
    if (existing.length > 0) return;

    const defaultIcps: InsertIcpProfile[] = [
      {
        verticalName: "government",
        displayName: "Government",
        description: "Counties, municipalities, state agencies, and local government departments seeking to modernize their technology infrastructure.",
        isActive: true,
        targetCriteria: {
          minPopulation: 50000,
          maxPopulation: null,
          departments: ["County Administration", "Information Technology", "Finance & Budget", "Public Works"],
          states: [],
          painPointKeywords: ["legacy systems", "manual processes", "citizen services", "data silos", "compliance"],
          techMaturityMin: 1,
          techMaturityMax: 6,
        },
        searchQueries: [
          "county government IT modernization",
          "municipal technology upgrade",
          "state agency digital transformation"
        ],
      },
      {
        verticalName: "healthcare",
        displayName: "Healthcare",
        description: "Hospitals, health systems, clinics, and healthcare organizations looking to improve patient care through AI and automation.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Health Information Technology", "Clinical Operations", "Patient Services"],
          states: [],
          painPointKeywords: ["EHR integration", "patient scheduling", "claims processing", "HIPAA compliance"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: [
          "hospital AI implementation",
          "healthcare automation solutions",
          "clinical workflow optimization"
        ],
      },
      {
        verticalName: "legal",
        displayName: "Legal",
        description: "Law firms and corporate legal departments seeking efficiency through document automation and AI-powered research.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Legal Operations", "Document Management", "Research"],
          states: [],
          painPointKeywords: ["document review", "contract analysis", "legal research", "case management"],
          techMaturityMin: 2,
          techMaturityMax: 6,
        },
        searchQueries: [
          "law firm technology adoption",
          "legal AI tools",
          "corporate legal department automation"
        ],
      },
      {
        verticalName: "financial_services",
        displayName: "Financial Services",
        description: "Banks, credit unions, and insurance companies looking to enhance customer experience and operational efficiency.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Operations", "Customer Service", "Risk Management", "Compliance"],
          states: [],
          painPointKeywords: ["fraud detection", "customer onboarding", "regulatory compliance", "loan processing"],
          techMaturityMin: 4,
          techMaturityMax: 8,
        },
        searchQueries: [
          "banking AI solutions",
          "credit union technology modernization",
          "insurance automation"
        ],
      },
      {
        verticalName: "pe",
        displayName: "Private Equity",
        description: "PE firms and their portfolio companies seeking operational improvements and value creation through technology.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Operations", "Technology", "Finance"],
          states: [],
          painPointKeywords: ["operational efficiency", "due diligence", "portfolio management", "value creation"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: [
          "PE portfolio company technology",
          "private equity operational improvement",
          "PE value creation AI"
        ],
      },
    ];

    for (const icp of defaultIcps) {
      await db.insert(icpProfiles).values(icp);
    }
  }

  // Email Sequences CRUD
  async getAllSequences(): Promise<EmailSequence[]> {
    return db.select().from(emailSequences).orderBy(desc(emailSequences.createdAt));
  }

  async getSequence(id: number): Promise<EmailSequence | undefined> {
    const [sequence] = await db.select().from(emailSequences).where(eq(emailSequences.id, id));
    return sequence;
  }

  async getSequenceWithSteps(id: number): Promise<EmailSequenceWithSteps | undefined> {
    const sequence = await this.getSequence(id);
    if (!sequence) return undefined;
    const steps = await this.getStepsBySequenceId(id);
    return { ...sequence, steps };
  }

  async createSequence(insertSequence: InsertEmailSequence): Promise<EmailSequence> {
    const [sequence] = await db.insert(emailSequences).values(insertSequence).returning();
    return sequence;
  }

  async updateSequence(id: number, updates: Partial<InsertEmailSequence>): Promise<EmailSequence | undefined> {
    const [sequence] = await db
      .update(emailSequences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailSequences.id, id))
      .returning();
    return sequence;
  }

  async deleteSequence(id: number): Promise<boolean> {
    await db.delete(emailSequences).where(eq(emailSequences.id, id));
    return true;
  }

  // Sequence Steps CRUD
  async getStepsBySequenceId(sequenceId: number): Promise<SequenceStep[]> {
    return db.select().from(sequenceSteps).where(eq(sequenceSteps.sequenceId, sequenceId)).orderBy(sequenceSteps.stepNumber);
  }

  async getStep(id: number): Promise<SequenceStep | undefined> {
    const [step] = await db.select().from(sequenceSteps).where(eq(sequenceSteps.id, id));
    return step;
  }

  async createStep(insertStep: InsertSequenceStep): Promise<SequenceStep> {
    const [step] = await db.insert(sequenceSteps).values(insertStep).returning();
    return step;
  }

  async updateStep(id: number, updates: Partial<InsertSequenceStep>): Promise<SequenceStep | undefined> {
    const [step] = await db
      .update(sequenceSteps)
      .set(updates)
      .where(eq(sequenceSteps.id, id))
      .returning();
    return step;
  }

  async deleteStep(id: number): Promise<boolean> {
    await db.delete(sequenceSteps).where(eq(sequenceSteps.id, id));
    return true;
  }

  // Sequence Enrollments CRUD
  async getEnrollmentsBySequenceId(sequenceId: number): Promise<SequenceEnrollment[]> {
    return db.select().from(sequenceEnrollments).where(eq(sequenceEnrollments.sequenceId, sequenceId)).orderBy(desc(sequenceEnrollments.enrolledAt));
  }

  async getEnrollmentsByLeadId(leadId: number): Promise<SequenceEnrollment[]> {
    return db.select().from(sequenceEnrollments).where(eq(sequenceEnrollments.leadId, leadId)).orderBy(desc(sequenceEnrollments.enrolledAt));
  }

  async getEnrollment(id: number): Promise<SequenceEnrollment | undefined> {
    const [enrollment] = await db.select().from(sequenceEnrollments).where(eq(sequenceEnrollments.id, id));
    return enrollment;
  }

  async createEnrollment(insertEnrollment: InsertSequenceEnrollment): Promise<SequenceEnrollment> {
    const [enrollment] = await db.insert(sequenceEnrollments).values(insertEnrollment).returning();
    return enrollment;
  }

  async updateEnrollment(id: number, updates: Partial<InsertSequenceEnrollment>): Promise<SequenceEnrollment | undefined> {
    const [enrollment] = await db
      .update(sequenceEnrollments)
      .set(updates)
      .where(eq(sequenceEnrollments.id, id))
      .returning();
    return enrollment;
  }

  async deleteEnrollment(id: number): Promise<boolean> {
    await db.delete(sequenceEnrollments).where(eq(sequenceEnrollments.id, id));
    return true;
  }

  // Outreach Activities
  async createActivity(insertActivity: InsertOutreachActivity): Promise<OutreachActivity> {
    const [activity] = await db.insert(outreachActivities).values(insertActivity).returning();
    
    // Update lead status based on activity type
    const statusUpdates: Partial<{ status: string; lastContactedAt: Date }> = {
      lastContactedAt: new Date(),
    };
    
    // Update lead status based on activity type
    if (insertActivity.type === "email_replied") {
      statusUpdates.status = "follow_up";
    } else if (insertActivity.outcome === "meeting_scheduled") {
      statusUpdates.status = "qualified";
    } else if (insertActivity.outcome === "interested") {
      statusUpdates.status = "follow_up";
    } else if (insertActivity.outcome === "not_interested") {
      statusUpdates.status = "closed_lost";
    } else if (insertActivity.type === "email_sent" || insertActivity.type === "call_made" || insertActivity.type === "linkedin_sent") {
      // Only update to contacted if currently not_contacted
      const lead = await this.getLead(insertActivity.leadId);
      if (lead && lead.status === "not_contacted") {
        statusUpdates.status = "contacted";
      }
    }
    
    await db
      .update(governmentLeads)
      .set({ ...statusUpdates, updatedAt: new Date() })
      .where(eq(governmentLeads.id, insertActivity.leadId));
    
    return activity;
  }

  async getActivitiesByLead(leadId: number): Promise<OutreachActivity[]> {
    return db.select().from(outreachActivities).where(eq(outreachActivities.leadId, leadId)).orderBy(desc(outreachActivities.createdAt));
  }

  async getActivitiesBySequence(sequenceId: number): Promise<OutreachActivity[]> {
    return db.select().from(outreachActivities).where(eq(outreachActivities.sequenceId, sequenceId)).orderBy(desc(outreachActivities.createdAt));
  }

  async getActivityStats(): Promise<ActivityStats> {
    const activities = await db.select().from(outreachActivities);
    
    const stats: ActivityStats = {
      totalActivities: activities.length,
      emailsSent: 0,
      emailsOpened: 0,
      emailsReplied: 0,
      callsMade: 0,
      callsAnswered: 0,
      linkedinSent: 0,
      linkedinConnected: 0,
      meetingsScheduled: 0,
    };
    
    for (const activity of activities) {
      switch (activity.type) {
        case "email_sent":
          stats.emailsSent++;
          break;
        case "email_opened":
          stats.emailsOpened++;
          break;
        case "email_replied":
          stats.emailsReplied++;
          break;
        case "call_made":
          stats.callsMade++;
          break;
        case "call_answered":
          stats.callsAnswered++;
          break;
        case "linkedin_sent":
          stats.linkedinSent++;
          break;
        case "linkedin_connected":
          stats.linkedinConnected++;
          break;
      }
      if (activity.outcome === "meeting_scheduled") {
        stats.meetingsScheduled++;
      }
    }
    
    return stats;
  }

  async updateLeadCallOutcome(leadId: number, outcome: CallOutcome, notes?: string): Promise<GovernmentLead | undefined> {
    // Determine new status based on outcome
    let newStatus: string | undefined;
    if (outcome === "meeting_scheduled") {
      newStatus = "qualified";
    } else if (outcome === "interested" || outcome === "callback_scheduled") {
      newStatus = "follow_up";
    } else if (outcome === "not_interested") {
      newStatus = "closed_lost";
    }
    
    const updates: Record<string, unknown> = {
      lastCallOutcome: outcome,
      lastContactedAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (notes) {
      updates.callNotes = notes;
    }
    
    if (newStatus) {
      updates.status = newStatus;
    }
    
    const [lead] = await db
      .update(governmentLeads)
      .set(updates)
      .where(eq(governmentLeads.id, leadId))
      .returning();
    
    return lead;
  }
}

export const storage = new DatabaseStorage();
