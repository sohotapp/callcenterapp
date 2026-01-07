import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  users,
  governmentLeads,
  callScripts,
  companyProfile,
  callLogs,
  scrapeJobs,
  icpProfiles,
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

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllLeads(): Promise<GovernmentLead[]>;
  getLead(id: number): Promise<GovernmentLead | undefined>;
  createLead(lead: InsertGovernmentLead): Promise<GovernmentLead>;
  updateLead(id: number, lead: Partial<InsertGovernmentLead>): Promise<GovernmentLead | undefined>;
  updateLeadEnrichment(id: number, enrichment: LeadEnrichmentData): Promise<GovernmentLead | undefined>;
  deleteLead(id: number): Promise<boolean>;

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
}

export const storage = new DatabaseStorage();
