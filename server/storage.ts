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

export interface LeadFilters {
  state?: string;
  status?: string;
  icpId?: number;
}

export interface PaginatedLeadsResult {
  leads: GovernmentLead[];
  total: number;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllLeads(): Promise<GovernmentLead[]>;
  getLeadsPaginated(page: number, limit: number, filters?: LeadFilters): Promise<PaginatedLeadsResult>;
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
  recoverOrphanedJobs(): Promise<number>;

  getIcpProfiles(): Promise<IcpProfile[]>;
  getIcpProfile(id: number): Promise<IcpProfile | undefined>;
  updateIcpProfile(id: number, profile: Partial<InsertIcpProfile>): Promise<IcpProfile | undefined>;
  seedDefaultIcps(): Promise<void>;
  seedDefaultPlaybooks(): Promise<void>;
  syncIcpProfiles(): Promise<{ created: number; updated: number }>;
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

  async getLeadsPaginated(page: number, limit: number, filters?: LeadFilters): Promise<PaginatedLeadsResult> {
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [];
    if (filters?.state) {
      conditions.push(eq(governmentLeads.state, filters.state));
    }
    if (filters?.status) {
      conditions.push(eq(governmentLeads.status, filters.status));
    }
    if (filters?.icpId) {
      conditions.push(eq(governmentLeads.icpId, filters.icpId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get paginated results and total count in parallel
    const [leads, countResult] = await Promise.all([
      db
        .select()
        .from(governmentLeads)
        .where(whereClause)
        .orderBy(desc(governmentLeads.priorityScore))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(governmentLeads)
        .where(whereClause),
    ]);

    return {
      leads,
      total: Number(countResult[0]?.count ?? 0),
    };
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

  async recoverOrphanedJobs(): Promise<number> {
    const orphanedJobs = await db
      .update(scrapeJobs)
      .set({ 
        status: "completed", 
        completedAt: new Date(),
        errorMessage: "Job was interrupted by server restart"
      })
      .where(eq(scrapeJobs.status, "running"))
      .returning();
    return orphanedJobs.length;
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
      // === ENTERPRISE ===
      {
        verticalName: "fortune_500",
        displayName: "Fortune 500",
        description: "C-level and VP technology leaders at America's largest corporations driving digital transformation, cloud migration, and AI adoption initiatives.",
        isActive: true,
        targetCriteria: {
          minPopulation: 10000,
          maxPopulation: null,
          departments: ["Technology", "IT", "Digital", "Engineering", "Innovation"],
          states: [],
          painPointKeywords: ["digital transformation", "cloud migration", "legacy modernization", "AI adoption", "data analytics", "cybersecurity"],
          techMaturityMin: 5,
          techMaturityMax: 10,
        },
        searchQueries: [
          "Fortune 500 CTO digital transformation",
          "enterprise cloud migration strategy",
          "corporate AI adoption initiatives"
        ],
      },
      {
        verticalName: "mid_market",
        displayName: "Mid-Market Enterprise",
        description: "Technology decision makers at companies with 500-5000 employees looking to scale their operations and modernize infrastructure.",
        isActive: false,
        targetCriteria: {
          minPopulation: 500,
          maxPopulation: 5000,
          departments: ["IT", "Technology", "Operations", "Engineering"],
          states: [],
          painPointKeywords: ["scaling challenges", "system integration", "process automation", "growth technology"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: [
          "mid-market company CTO IT director",
          "growing company technology modernization",
          "SMB digital transformation"
        ],
      },

      // === PROFESSIONAL SERVICES ===
      {
        verticalName: "management_consulting",
        displayName: "Management Consulting (Top 20)",
        description: "Partners and technology practice leaders at McKinsey, BCG, Bain, and other top-tier consulting firms building digital and AI capabilities.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Technology Practice", "Digital Practice", "Analytics Practice", "Operations"],
          states: [],
          painPointKeywords: ["client delivery", "knowledge management", "practice growth", "AI offerings", "digital consulting"],
          techMaturityMin: 6,
          techMaturityMax: 10,
        },
        searchQueries: [
          "McKinsey BCG Bain technology partner",
          "management consulting digital practice",
          "consulting firm AI capabilities"
        ],
      },
      {
        verticalName: "it_consulting",
        displayName: "IT Consulting & Systems Integrators",
        description: "Practice leads and delivery directors at technology consulting firms and systems integrators implementing enterprise solutions.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Delivery", "Solutions", "Practice Management", "Technology"],
          states: [],
          painPointKeywords: ["implementation efficiency", "client delivery", "technical expertise", "automation"],
          techMaturityMin: 7,
          techMaturityMax: 10,
        },
        searchQueries: [
          "systems integrator practice lead",
          "IT consulting delivery director",
          "technology consulting CTO"
        ],
      },
      {
        verticalName: "big4_accounting",
        displayName: "Big 4 Accounting Firms",
        description: "Technology and digital leaders at Deloitte, PwC, EY, and KPMG driving innovation in audit, tax, and advisory practices.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Innovation", "Technology", "Digital", "Audit Innovation", "Tax Technology"],
          states: [],
          painPointKeywords: ["audit automation", "tax technology", "advisory tools", "AI compliance"],
          techMaturityMin: 6,
          techMaturityMax: 10,
        },
        searchQueries: [
          "Deloitte PwC EY KPMG technology leader",
          "Big 4 audit innovation",
          "accounting firm digital transformation"
        ],
      },

      // === TECHNOLOGY ===
      {
        verticalName: "saas_companies",
        displayName: "SaaS Companies (Series B+)",
        description: "CTOs and VPs of Engineering at growth-stage SaaS companies scaling their platform, infrastructure, and engineering teams.",
        isActive: false,
        targetCriteria: {
          minPopulation: 50,
          maxPopulation: 2000,
          departments: ["Engineering", "Platform", "Infrastructure", "DevOps"],
          states: [],
          painPointKeywords: ["scaling infrastructure", "engineering velocity", "platform reliability", "DevOps automation"],
          techMaturityMin: 7,
          techMaturityMax: 10,
        },
        searchQueries: [
          "SaaS company CTO VP Engineering",
          "Series B startup technology leader",
          "growth stage SaaS infrastructure"
        ],
      },
      {
        verticalName: "cybersecurity",
        displayName: "Cybersecurity Companies",
        description: "CISOs, CTOs, and security leaders at cybersecurity vendors and enterprise security teams building next-gen defenses.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Security Engineering", "Threat Research", "Product Security", "Security Operations"],
          states: [],
          painPointKeywords: ["threat detection", "security automation", "SOC efficiency", "vulnerability management"],
          techMaturityMin: 8,
          techMaturityMax: 10,
        },
        searchQueries: [
          "cybersecurity company CISO CTO",
          "enterprise security leader",
          "security vendor technology"
        ],
      },

      // === FINANCIAL SERVICES ===
      {
        verticalName: "investment_banks",
        displayName: "Investment Banks",
        description: "Technology leaders at bulge bracket and middle-market investment banks driving trading systems, risk platforms, and digital transformation.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Technology", "Trading Technology", "Risk Technology", "Digital Banking"],
          states: [],
          painPointKeywords: ["trading systems", "risk analytics", "regulatory technology", "client platforms"],
          techMaturityMin: 7,
          techMaturityMax: 10,
        },
        searchQueries: [
          "investment bank CTO technology MD",
          "Goldman Morgan JPMorgan technology",
          "banking trading systems technology"
        ],
      },
      {
        verticalName: "hedge_funds",
        displayName: "Hedge Funds & Asset Managers",
        description: "CTOs and technology heads at quantitative and discretionary investment firms building trading infrastructure and analytics platforms.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Technology", "Quantitative Research", "Trading Infrastructure", "Data"],
          states: [],
          painPointKeywords: ["alpha generation", "data infrastructure", "trading systems", "quantitative tools"],
          techMaturityMin: 8,
          techMaturityMax: 10,
        },
        searchQueries: [
          "hedge fund CTO technology head",
          "asset manager quantitative technology",
          "investment firm data infrastructure"
        ],
      },
      {
        verticalName: "fintech",
        displayName: "Fintech Companies",
        description: "Technology leaders at fintech startups and scale-ups disrupting banking, payments, lending, and financial infrastructure.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Engineering", "Platform", "Product", "Data"],
          states: [],
          painPointKeywords: ["payment processing", "lending automation", "compliance technology", "banking APIs"],
          techMaturityMin: 7,
          techMaturityMax: 10,
        },
        searchQueries: [
          "fintech CTO VP Engineering",
          "payments company technology leader",
          "neobank infrastructure"
        ],
      },
      {
        verticalName: "financial_services",
        displayName: "Banks & Credit Unions",
        description: "CIOs and technology leaders at regional banks, credit unions, and community financial institutions modernizing core systems.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Operations", "Customer Service", "Risk Management", "Compliance"],
          states: [],
          painPointKeywords: ["fraud detection", "customer onboarding", "regulatory compliance", "loan processing", "core banking"],
          techMaturityMin: 4,
          techMaturityMax: 8,
        },
        searchQueries: [
          "regional bank CIO technology",
          "credit union digital transformation",
          "community bank modernization"
        ],
      },

      // === PRIVATE CAPITAL ===
      {
        verticalName: "pe",
        displayName: "Private Equity Firms",
        description: "Operating Partners and technology advisors at PE firms driving value creation and operational improvements across portfolio companies.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Operations", "Technology", "Finance", "Portfolio Operations"],
          states: [],
          painPointKeywords: ["operational efficiency", "due diligence", "portfolio management", "value creation", "operational DD"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: [
          "PE operating partner technology",
          "private equity value creation",
          "portfolio company CTO"
        ],
      },
      {
        verticalName: "venture_capital",
        displayName: "Venture Capital Firms",
        description: "Operating partners, CTOs-in-residence, and platform teams at VC firms supporting portfolio company technology decisions.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Platform", "Operations", "Portfolio Support", "Technology"],
          states: [],
          painPointKeywords: ["portfolio support", "technical due diligence", "founder support", "platform services"],
          techMaturityMin: 6,
          techMaturityMax: 10,
        },
        searchQueries: [
          "VC firm operating partner CTO",
          "venture capital platform team",
          "VC portfolio technology"
        ],
      },

      // === HEALTHCARE ===
      {
        verticalName: "healthcare",
        displayName: "Hospital Systems",
        description: "CIOs, CMIOs, and health IT leaders at hospitals and health systems implementing clinical systems and patient care technology.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Health Information Technology", "Clinical Operations", "Patient Services", "Digital Health"],
          states: [],
          painPointKeywords: ["EHR integration", "patient scheduling", "claims processing", "HIPAA compliance", "clinical AI"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: [
          "hospital CIO CMIO health IT",
          "health system technology leader",
          "clinical informatics director"
        ],
      },
      {
        verticalName: "health_tech",
        displayName: "Health Tech Companies",
        description: "CTOs and engineering leaders at digital health startups and health technology vendors building clinical and patient-facing solutions.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Engineering", "Product", "Clinical", "Data Science"],
          states: [],
          painPointKeywords: ["clinical validation", "HIPAA engineering", "patient engagement", "EHR integration"],
          techMaturityMin: 6,
          techMaturityMax: 10,
        },
        searchQueries: [
          "health tech CTO VP Engineering",
          "digital health startup technology",
          "healthcare AI company"
        ],
      },

      // === LEGAL ===
      {
        verticalName: "legal",
        displayName: "Law Firms (AmLaw 200)",
        description: "CIOs, innovation partners, and legal tech leaders at major law firms implementing AI for e-discovery, research, and practice management.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Legal Operations", "Document Management", "Research", "Innovation", "IT"],
          states: [],
          painPointKeywords: ["document review", "contract analysis", "legal research", "case management", "e-discovery"],
          techMaturityMin: 2,
          techMaturityMax: 6,
        },
        searchQueries: [
          "AmLaw law firm CIO innovation",
          "legal technology director",
          "law firm e-discovery AI"
        ],
      },

      // === EDUCATION ===
      {
        verticalName: "higher_education",
        displayName: "Higher Education (Top 200)",
        description: "CIOs and IT directors at universities and colleges modernizing campus technology, student systems, and research infrastructure.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Information Technology", "Academic Technology", "Research Computing", "Student Systems"],
          states: [],
          painPointKeywords: ["student information systems", "research computing", "campus technology", "LMS integration"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: [
          "university CIO IT director",
          "higher education technology leader",
          "campus technology modernization"
        ],
      },
      {
        verticalName: "k12_education",
        displayName: "K-12 School Districts",
        description: "Technology directors and CIOs at large school districts implementing educational technology and administrative systems.",
        isActive: false,
        targetCriteria: {
          minPopulation: 10000,
          maxPopulation: null,
          departments: ["Technology", "Information Systems", "Curriculum Technology", "Operations"],
          states: [],
          painPointKeywords: ["student data", "educational technology", "district systems", "learning management"],
          techMaturityMin: 2,
          techMaturityMax: 5,
        },
        searchQueries: [
          "school district CTO technology director",
          "K-12 education technology",
          "school district IT modernization"
        ],
      },

      // === INDUSTRIAL ===
      {
        verticalName: "manufacturing",
        displayName: "Manufacturing",
        description: "Technology leaders at manufacturing companies implementing Industry 4.0, IoT, and operational technology solutions.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Technology", "Operations Technology", "Digital Manufacturing", "IT/OT"],
          states: [],
          painPointKeywords: ["Industry 4.0", "IoT", "operational technology", "predictive maintenance", "supply chain"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: [
          "manufacturing CTO digital transformation",
          "Industry 4.0 technology leader",
          "smart factory technology"
        ],
      },
      {
        verticalName: "energy_utilities",
        displayName: "Energy & Utilities",
        description: "Technology and digital leaders at energy companies and utilities modernizing grid infrastructure and operations.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Technology", "Grid Operations", "Digital", "SCADA/OT"],
          states: [],
          painPointKeywords: ["grid modernization", "smart metering", "renewable integration", "SCADA security"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: [
          "utility CIO technology leader",
          "energy company digital transformation",
          "smart grid technology"
        ],
      },

      // === GOVERNMENT ===
      {
        verticalName: "government",
        displayName: "Government",
        description: "IT directors, CIOs, and department heads at counties, municipalities, and state agencies modernizing citizen services and operations.",
        isActive: true,
        targetCriteria: {
          minPopulation: 50000,
          maxPopulation: null,
          departments: ["County Administration", "Information Technology", "Finance & Budget", "Public Works"],
          states: [],
          painPointKeywords: ["legacy systems", "manual processes", "citizen services", "data silos", "compliance", "ARPA funding"],
          techMaturityMin: 1,
          techMaturityMax: 6,
        },
        searchQueries: [
          "county government IT modernization",
          "municipal technology upgrade",
          "state agency digital transformation"
        ],
      },
    ];

    for (const icp of defaultIcps) {
      await db.insert(icpProfiles).values(icp);
    }
  }

  async seedDefaultPlaybooks(): Promise<void> {
    const profiles = await this.getIcpProfiles();
    if (profiles.length === 0) return;

    const playbookConfigs: Record<string, {
      targetEntityTypes: string[];
      queryTemplates: string[];
      dataSources: string[];
      valueProposition: string;
      enrichmentPromptHints: string;
      complianceFlags?: string[];
    }> = {
      // === ENTERPRISE ===
      fortune_500: {
        targetEntityTypes: ["fortune_500_company", "enterprise", "corporation"],
        queryTemplates: [
          "{entity} CTO CIO Chief Technology Officer contact",
          "{entity} digital transformation cloud migration news",
          "{entity} technology leadership VP Engineering"
        ],
        dataSources: ["tavily_web"],
        valueProposition: "Enterprise-scale AI transformation, cloud migration acceleration, and digital operations modernization",
        enrichmentPromptHints: "PRIORITY: CTO, CIO, Chief Digital Officer, VP Engineering, VP IT. Focus on SEC filings for IT budget, digital transformation initiatives, cloud migration projects, AI adoption programs. Check earnings calls for technology investments.",
      },
      mid_market: {
        targetEntityTypes: ["company", "enterprise"],
        queryTemplates: [
          "{entity} CTO VP Engineering technology leader",
          "{entity} digital transformation IT modernization",
          "{entity} technology team leadership"
        ],
        dataSources: ["tavily_web"],
        valueProposition: "Scalable technology solutions for fast-growing companies modernizing operations",
        enrichmentPromptHints: "Look for CTO, VP Engineering, IT Director, Head of Technology. Focus on growth challenges, system integration needs, scaling infrastructure.",
      },

      // === PROFESSIONAL SERVICES ===
      management_consulting: {
        targetEntityTypes: ["consulting_firm", "management_consultancy"],
        queryTemplates: [
          "{entity} partner technology practice digital leader",
          "{entity} CTO Chief Digital Officer contact",
          "{entity} digital practice innovation leader"
        ],
        dataSources: ["tavily_web"],
        valueProposition: "AI-powered consulting delivery, knowledge management, and client engagement platforms",
        enrichmentPromptHints: "PRIORITY: Partner - Technology/Digital, CTO, Chief Digital Officer, Director of Technology Practice. Focus on practice growth, digital service offerings, client delivery platforms, thought leadership.",
      },
      it_consulting: {
        targetEntityTypes: ["systems_integrator", "it_consulting_firm"],
        queryTemplates: [
          "{entity} practice lead delivery director CTO",
          "{entity} technology consulting leadership",
          "{entity} solutions architect partner"
        ],
        dataSources: ["tavily_web"],
        valueProposition: "Implementation acceleration tools, delivery automation, and technical expertise amplification",
        enrichmentPromptHints: "Look for Practice Lead, Delivery Director, CTO, Solutions Architect, Partner. Focus on implementation efficiency, client delivery, technical capabilities.",
      },
      big4_accounting: {
        targetEntityTypes: ["accounting_firm", "professional_services"],
        queryTemplates: [
          "{entity} technology leader innovation partner",
          "{entity} audit innovation tax technology",
          "{entity} digital transformation advisory"
        ],
        dataSources: ["tavily_web"],
        valueProposition: "Audit automation, tax technology, and advisory practice AI enablement",
        enrichmentPromptHints: "Look for Innovation Partner, Technology Leader, Chief Digital Officer, Audit Innovation Lead, Tax Technology Director. Focus on audit automation, regulatory technology, advisory tools.",
        complianceFlags: ["SOC2"],
      },

      // === TECHNOLOGY ===
      saas_companies: {
        targetEntityTypes: ["saas_company", "software_company", "startup"],
        queryTemplates: [
          "{entity} CTO VP Engineering Head of Platform",
          "{entity} engineering leadership technology team",
          "{entity} infrastructure DevOps platform"
        ],
        dataSources: ["tavily_web", "crunchbase"],
        valueProposition: "Platform reliability, engineering velocity, and infrastructure automation for scale",
        enrichmentPromptHints: "PRIORITY: CTO, VP Engineering, Head of Platform, VP Infrastructure, Director of DevOps. Focus on scaling challenges, engineering hiring, infrastructure investments, platform reliability.",
      },
      cybersecurity: {
        targetEntityTypes: ["cybersecurity_company", "security_vendor"],
        queryTemplates: [
          "{entity} CISO CTO security leadership",
          "{entity} threat research security engineering",
          "{entity} product security technology"
        ],
        dataSources: ["tavily_web"],
        valueProposition: "Security automation, threat intelligence, and SOC efficiency solutions",
        enrichmentPromptHints: "Look for CISO, CTO, VP Security Engineering, Head of Threat Research, Chief Security Architect. Focus on threat detection, security automation, vulnerability management.",
        complianceFlags: ["SOC2"],
      },

      // === FINANCIAL SERVICES ===
      investment_banks: {
        targetEntityTypes: ["investment_bank", "financial_institution"],
        queryTemplates: [
          "{entity} CTO technology MD managing director",
          "{entity} trading technology risk systems",
          "{entity} digital banking technology leadership"
        ],
        dataSources: ["tavily_web"],
        valueProposition: "Trading systems optimization, risk analytics, and regulatory technology automation",
        enrichmentPromptHints: "PRIORITY: CTO, Managing Director - Technology, Head of Trading Technology, Chief Digital Officer. Focus on trading systems, risk platforms, regulatory compliance, client-facing technology.",
        complianceFlags: ["SOC2", "PCI"],
      },
      hedge_funds: {
        targetEntityTypes: ["hedge_fund", "asset_manager", "investment_firm"],
        queryTemplates: [
          "{entity} CTO technology head quantitative",
          "{entity} trading infrastructure data engineering",
          "{entity} investment technology leadership"
        ],
        dataSources: ["tavily_web"],
        valueProposition: "Alpha generation infrastructure, data platform optimization, and quantitative tools",
        enrichmentPromptHints: "Look for CTO, Head of Technology, Chief Data Officer, Quantitative Lead, Head of Trading Infrastructure. Focus on data infrastructure, alpha generation tools, trading systems.",
      },
      fintech: {
        targetEntityTypes: ["fintech_company", "payments_company", "neobank"],
        queryTemplates: [
          "{entity} CTO VP Engineering technology leadership",
          "{entity} payments infrastructure platform",
          "{entity} engineering team technology"
        ],
        dataSources: ["tavily_web", "crunchbase"],
        valueProposition: "Payment processing optimization, compliance automation, and banking API infrastructure",
        enrichmentPromptHints: "PRIORITY: CTO, VP Engineering, Head of Platform, VP Infrastructure. Focus on payment processing, compliance challenges, banking integrations, API infrastructure.",
        complianceFlags: ["SOC2", "PCI"],
      },
      financial_services: {
        targetEntityTypes: ["bank", "credit_union", "insurance"],
        queryTemplates: [
          "{entity} {state} CIO technology leader",
          "{entity} digital transformation core banking",
          "{entity} technology modernization IT"
        ],
        dataSources: ["tavily_web", "fdic_banks"],
        valueProposition: "Core banking modernization, fraud detection AI, and customer experience automation",
        enrichmentPromptHints: "Look for CIO, CTO, VP Technology, Chief Digital Officer. Focus on core banking modernization, fraud detection, regulatory compliance, digital customer experience.",
        complianceFlags: ["SOC2", "PCI"],
      },

      // === PRIVATE CAPITAL ===
      pe: {
        targetEntityTypes: ["pe_firm", "private_equity", "portfolio_company"],
        queryTemplates: [
          "{entity} operating partner technology advisor",
          "{entity} portfolio company CTO",
          "{entity} value creation technology"
        ],
        dataSources: ["tavily_web", "crunchbase"],
        valueProposition: "Portfolio value creation, operational efficiency AI, and due diligence automation",
        enrichmentPromptHints: "PRIORITY: Operating Partner, Technology Advisor, VP Operations, Portfolio Company CTO. Focus on value creation initiatives, operational improvements, technology-driven efficiency.",
      },
      venture_capital: {
        targetEntityTypes: ["vc_firm", "venture_capital", "investment_fund"],
        queryTemplates: [
          "{entity} operating partner CTO in residence",
          "{entity} platform team technology",
          "{entity} portfolio support technology"
        ],
        dataSources: ["tavily_web", "crunchbase"],
        valueProposition: "Portfolio technology support, technical due diligence, and platform services",
        enrichmentPromptHints: "Look for Operating Partner, CTO-in-Residence, Platform Lead, VP Portfolio Support. Focus on portfolio company support, technical due diligence capabilities, platform services.",
      },

      // === HEALTHCARE ===
      healthcare: {
        targetEntityTypes: ["hospital", "health_system", "medical_center"],
        queryTemplates: [
          "{entity} CIO CMIO health IT leadership",
          "{entity} clinical informatics technology",
          "{entity} digital health transformation"
        ],
        dataSources: ["tavily_web", "cms_hospitals"],
        valueProposition: "Clinical workflow automation, EHR optimization, and HIPAA-compliant AI solutions",
        enrichmentPromptHints: "PRIORITY: CIO, CMIO, VP Health IT, Chief Digital Officer, Director of Clinical Informatics. Focus on EHR integration, clinical AI, telehealth, patient engagement.",
        complianceFlags: ["HIPAA"],
      },
      health_tech: {
        targetEntityTypes: ["health_tech_company", "digital_health", "healthtech_startup"],
        queryTemplates: [
          "{entity} CTO VP Engineering technology",
          "{entity} clinical engineering product",
          "{entity} healthcare AI technology team"
        ],
        dataSources: ["tavily_web", "crunchbase"],
        valueProposition: "Clinical validation support, HIPAA engineering, and healthcare integration platforms",
        enrichmentPromptHints: "Look for CTO, VP Engineering, Chief Medical Officer, Head of Product, VP Clinical. Focus on clinical validation, HIPAA compliance, EHR integrations, patient engagement.",
        complianceFlags: ["HIPAA", "SOC2"],
      },

      // === LEGAL ===
      legal: {
        targetEntityTypes: ["law_firm", "corporate_legal"],
        queryTemplates: [
          "{entity} CIO innovation partner technology",
          "{entity} legal technology e-discovery",
          "{entity} practice management technology"
        ],
        dataSources: ["tavily_web", "state_bar"],
        valueProposition: "E-discovery automation, contract AI, and practice management optimization",
        enrichmentPromptHints: "PRIORITY: CIO, Innovation Partner, Director of IT, Legal Technology Director, Managing Partner. Focus on AmLaw rankings, e-discovery needs, contract management, legal research tools.",
      },

      // === EDUCATION ===
      higher_education: {
        targetEntityTypes: ["university", "college", "higher_education"],
        queryTemplates: [
          "{entity} CIO VP IT technology leadership",
          "{entity} academic technology research computing",
          "{entity} campus technology modernization"
        ],
        dataSources: ["tavily_web"],
        valueProposition: "Campus technology modernization, research computing, and student experience platforms",
        enrichmentPromptHints: "Look for CIO, VP IT, Director of Academic Technology, Head of Research Computing. Focus on student systems, research infrastructure, campus technology, LMS integration.",
      },
      k12_education: {
        targetEntityTypes: ["school_district", "education_system"],
        queryTemplates: [
          "{entity} {state} technology director CTO",
          "{entity} education technology IT",
          "{entity} district systems modernization"
        ],
        dataSources: ["tavily_web"],
        valueProposition: "Educational technology integration, student information systems, and district operations automation",
        enrichmentPromptHints: "Look for Technology Director, CTO, IT Director, Director of Information Systems. Focus on student data systems, educational technology, administrative automation.",
      },

      // === INDUSTRIAL ===
      manufacturing: {
        targetEntityTypes: ["manufacturer", "industrial_company"],
        queryTemplates: [
          "{entity} CTO VP Technology digital manufacturing",
          "{entity} Industry 4.0 IoT operations",
          "{entity} smart factory technology leadership"
        ],
        dataSources: ["tavily_web"],
        valueProposition: "Industry 4.0 implementation, IoT platform optimization, and operational technology integration",
        enrichmentPromptHints: "Look for CTO, VP Technology, Head of Digital Manufacturing, Director of OT, VP Operations Technology. Focus on Industry 4.0, IoT, predictive maintenance, supply chain.",
      },
      energy_utilities: {
        targetEntityTypes: ["utility", "energy_company", "power_company"],
        queryTemplates: [
          "{entity} CIO CTO technology leadership",
          "{entity} grid modernization digital",
          "{entity} smart grid SCADA technology"
        ],
        dataSources: ["tavily_web"],
        valueProposition: "Grid modernization, smart metering, and operational technology security",
        enrichmentPromptHints: "Look for CIO, CTO, VP Technology, Head of Grid Operations, Director of Digital. Focus on grid modernization, smart metering, renewable integration, SCADA/OT security.",
      },

      // === GOVERNMENT ===
      government: {
        targetEntityTypes: ["county", "city", "district", "municipality"],
        queryTemplates: [
          "{entity} {state} IT director CIO technology",
          "{entity} {state} {department} contact phone email",
          "{entity} {state} digital transformation modernization"
        ],
        dataSources: ["tavily_web", "us_census"],
        valueProposition: "Citizen services automation, legacy system modernization, and operational efficiency AI",
        enrichmentPromptHints: "PRIORITY: IT Director, CIO, County Manager, Department Head, Technology Director. Focus on ARPA funding, budget cycles, legacy system replacement, citizen services modernization.",
      },
    };

    for (const profile of profiles) {
      const config = playbookConfigs[profile.verticalName];
      if (config && !profile.playbookConfig) {
        await this.updateIcpProfile(profile.id, {
          playbookConfig: {
            targetEntityTypes: config.targetEntityTypes,
            queryTemplates: config.queryTemplates,
            dataSources: config.dataSources,
            valueProposition: config.valueProposition,
            enrichmentPromptHints: config.enrichmentPromptHints,
            complianceFlags: config.complianceFlags || [],
          },
        });
        console.log(`[Storage] Seeded playbook config for ICP: ${profile.displayName}`);
      }
    }
  }

  async syncIcpProfiles(): Promise<{ created: number; updated: number }> {
    const existing = await this.getIcpProfiles();
    const existingByVertical = new Map(existing.map(p => [p.verticalName, p]));

    let created = 0;
    let updated = 0;

    // Define all default ICPs with their playbook configs
    const defaultIcps: Array<InsertIcpProfile & { playbookConfig?: any }> = [
      // === ENTERPRISE ===
      {
        verticalName: "fortune_500",
        displayName: "Fortune 500",
        description: "C-level and VP technology leaders at America's largest corporations driving digital transformation, cloud migration, and AI adoption initiatives.",
        isActive: true,
        targetCriteria: {
          minPopulation: 10000,
          maxPopulation: null,
          departments: ["Technology", "IT", "Digital", "Engineering", "Innovation"],
          states: [],
          painPointKeywords: ["digital transformation", "cloud migration", "legacy modernization", "AI adoption", "data analytics", "cybersecurity"],
          techMaturityMin: 5,
          techMaturityMax: 10,
        },
        searchQueries: ["Fortune 500 CTO digital transformation", "enterprise cloud migration strategy", "corporate AI adoption initiatives"],
        playbookConfig: {
          targetEntityTypes: ["fortune_500_company", "enterprise", "corporation"],
          queryTemplates: ["{entity} CTO CIO Chief Technology Officer contact", "{entity} digital transformation cloud migration news", "{entity} technology leadership VP Engineering"],
          dataSources: ["tavily_web"],
          valueProposition: "Enterprise-scale AI transformation, cloud migration acceleration, and digital operations modernization",
          enrichmentPromptHints: "PRIORITY: CTO, CIO, Chief Digital Officer, VP Engineering, VP IT. Focus on SEC filings for IT budget, digital transformation initiatives, cloud migration projects, AI adoption programs.",
          complianceFlags: [],
        },
      },
      {
        verticalName: "mid_market",
        displayName: "Mid-Market Enterprise",
        description: "Technology decision makers at companies with 500-5000 employees looking to scale their operations and modernize infrastructure.",
        isActive: false,
        targetCriteria: {
          minPopulation: 500,
          maxPopulation: 5000,
          departments: ["IT", "Technology", "Operations", "Engineering"],
          states: [],
          painPointKeywords: ["scaling challenges", "system integration", "process automation", "growth technology"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: ["mid-market company CTO IT director", "growing company technology modernization", "SMB digital transformation"],
        playbookConfig: {
          targetEntityTypes: ["company", "enterprise"],
          queryTemplates: ["{entity} CTO VP Engineering technology leader", "{entity} digital transformation IT modernization", "{entity} technology team leadership"],
          dataSources: ["tavily_web"],
          valueProposition: "Scalable technology solutions for fast-growing companies modernizing operations",
          enrichmentPromptHints: "Look for CTO, VP Engineering, IT Director, Head of Technology. Focus on growth challenges, system integration needs, scaling infrastructure.",
          complianceFlags: [],
        },
      },
      // === PROFESSIONAL SERVICES ===
      {
        verticalName: "management_consulting",
        displayName: "Management Consulting (Top 20)",
        description: "Partners and technology practice leaders at McKinsey, BCG, Bain, and other top-tier consulting firms building digital and AI capabilities.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Technology Practice", "Digital Practice", "Analytics Practice", "Operations"],
          states: [],
          painPointKeywords: ["client delivery", "knowledge management", "practice growth", "AI offerings", "digital consulting"],
          techMaturityMin: 6,
          techMaturityMax: 10,
        },
        searchQueries: ["McKinsey BCG Bain technology partner", "management consulting digital practice", "consulting firm AI capabilities"],
        playbookConfig: {
          targetEntityTypes: ["consulting_firm", "management_consultancy"],
          queryTemplates: ["{entity} partner technology practice digital leader", "{entity} CTO Chief Digital Officer contact", "{entity} digital practice innovation leader"],
          dataSources: ["tavily_web"],
          valueProposition: "AI-powered consulting delivery, knowledge management, and client engagement platforms",
          enrichmentPromptHints: "PRIORITY: Partner - Technology/Digital, CTO, Chief Digital Officer, Director of Technology Practice. Focus on practice growth, digital service offerings, client delivery platforms.",
          complianceFlags: [],
        },
      },
      {
        verticalName: "it_consulting",
        displayName: "IT Consulting & Systems Integrators",
        description: "Practice leads and delivery directors at technology consulting firms and systems integrators implementing enterprise solutions.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Delivery", "Solutions", "Practice Management", "Technology"],
          states: [],
          painPointKeywords: ["implementation efficiency", "client delivery", "technical expertise", "automation"],
          techMaturityMin: 7,
          techMaturityMax: 10,
        },
        searchQueries: ["systems integrator practice lead", "IT consulting delivery director", "technology consulting CTO"],
        playbookConfig: {
          targetEntityTypes: ["systems_integrator", "it_consulting_firm"],
          queryTemplates: ["{entity} practice lead delivery director CTO", "{entity} technology consulting leadership", "{entity} solutions architect partner"],
          dataSources: ["tavily_web"],
          valueProposition: "Implementation acceleration tools, delivery automation, and technical expertise amplification",
          enrichmentPromptHints: "Look for Practice Lead, Delivery Director, CTO, Solutions Architect, Partner. Focus on implementation efficiency, client delivery, technical capabilities.",
          complianceFlags: [],
        },
      },
      {
        verticalName: "big4_accounting",
        displayName: "Big 4 Accounting Firms",
        description: "Technology and digital leaders at Deloitte, PwC, EY, and KPMG driving innovation in audit, tax, and advisory practices.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Innovation", "Technology", "Digital", "Audit Innovation", "Tax Technology"],
          states: [],
          painPointKeywords: ["audit automation", "tax technology", "advisory tools", "AI compliance"],
          techMaturityMin: 6,
          techMaturityMax: 10,
        },
        searchQueries: ["Deloitte PwC EY KPMG technology leader", "Big 4 audit innovation", "accounting firm digital transformation"],
        playbookConfig: {
          targetEntityTypes: ["accounting_firm", "professional_services"],
          queryTemplates: ["{entity} technology leader innovation partner", "{entity} audit innovation tax technology", "{entity} digital transformation advisory"],
          dataSources: ["tavily_web"],
          valueProposition: "Audit automation, tax technology, and advisory practice AI enablement",
          enrichmentPromptHints: "Look for Innovation Partner, Technology Leader, Chief Digital Officer, Audit Innovation Lead, Tax Technology Director.",
          complianceFlags: ["SOC2"],
        },
      },
      // === TECHNOLOGY ===
      {
        verticalName: "saas_companies",
        displayName: "SaaS Companies (Series B+)",
        description: "CTOs and VPs of Engineering at growth-stage SaaS companies scaling their platform, infrastructure, and engineering teams.",
        isActive: false,
        targetCriteria: {
          minPopulation: 50,
          maxPopulation: 2000,
          departments: ["Engineering", "Platform", "Infrastructure", "DevOps"],
          states: [],
          painPointKeywords: ["scaling infrastructure", "engineering velocity", "platform reliability", "DevOps automation"],
          techMaturityMin: 7,
          techMaturityMax: 10,
        },
        searchQueries: ["SaaS company CTO VP Engineering", "Series B startup technology leader", "growth stage SaaS infrastructure"],
        playbookConfig: {
          targetEntityTypes: ["saas_company", "software_company", "startup"],
          queryTemplates: ["{entity} CTO VP Engineering Head of Platform", "{entity} engineering leadership technology team", "{entity} infrastructure DevOps platform"],
          dataSources: ["tavily_web", "crunchbase"],
          valueProposition: "Platform reliability, engineering velocity, and infrastructure automation for scale",
          enrichmentPromptHints: "PRIORITY: CTO, VP Engineering, Head of Platform, VP Infrastructure, Director of DevOps. Focus on scaling challenges, engineering hiring, infrastructure investments.",
          complianceFlags: [],
        },
      },
      {
        verticalName: "cybersecurity",
        displayName: "Cybersecurity Companies",
        description: "CISOs, CTOs, and security leaders at cybersecurity vendors and enterprise security teams building next-gen defenses.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Security Engineering", "Threat Research", "Product Security", "Security Operations"],
          states: [],
          painPointKeywords: ["threat detection", "security automation", "SOC efficiency", "vulnerability management"],
          techMaturityMin: 8,
          techMaturityMax: 10,
        },
        searchQueries: ["cybersecurity company CISO CTO", "enterprise security leader", "security vendor technology"],
        playbookConfig: {
          targetEntityTypes: ["cybersecurity_company", "security_vendor"],
          queryTemplates: ["{entity} CISO CTO security leadership", "{entity} threat research security engineering", "{entity} product security technology"],
          dataSources: ["tavily_web"],
          valueProposition: "Security automation, threat intelligence, and SOC efficiency solutions",
          enrichmentPromptHints: "Look for CISO, CTO, VP Security Engineering, Head of Threat Research, Chief Security Architect.",
          complianceFlags: ["SOC2"],
        },
      },
      // === FINANCIAL SERVICES ===
      {
        verticalName: "investment_banks",
        displayName: "Investment Banks",
        description: "Technology leaders at bulge bracket and middle-market investment banks driving trading systems, risk platforms, and digital transformation.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Technology", "Trading Technology", "Risk Technology", "Digital Banking"],
          states: [],
          painPointKeywords: ["trading systems", "risk analytics", "regulatory technology", "client platforms"],
          techMaturityMin: 7,
          techMaturityMax: 10,
        },
        searchQueries: ["investment bank CTO technology MD", "Goldman Morgan JPMorgan technology", "banking trading systems technology"],
        playbookConfig: {
          targetEntityTypes: ["investment_bank", "financial_institution"],
          queryTemplates: ["{entity} CTO technology MD managing director", "{entity} trading technology risk systems", "{entity} digital banking technology leadership"],
          dataSources: ["tavily_web"],
          valueProposition: "Trading systems optimization, risk analytics, and regulatory technology automation",
          enrichmentPromptHints: "PRIORITY: CTO, Managing Director - Technology, Head of Trading Technology, Chief Digital Officer.",
          complianceFlags: ["SOC2", "PCI"],
        },
      },
      {
        verticalName: "hedge_funds",
        displayName: "Hedge Funds & Asset Managers",
        description: "CTOs and technology heads at quantitative and discretionary investment firms building trading infrastructure and analytics platforms.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Technology", "Quantitative Research", "Trading Infrastructure", "Data"],
          states: [],
          painPointKeywords: ["alpha generation", "data infrastructure", "trading systems", "quantitative tools"],
          techMaturityMin: 8,
          techMaturityMax: 10,
        },
        searchQueries: ["hedge fund CTO technology head", "asset manager quantitative technology", "investment firm data infrastructure"],
        playbookConfig: {
          targetEntityTypes: ["hedge_fund", "asset_manager", "investment_firm"],
          queryTemplates: ["{entity} CTO technology head quantitative", "{entity} trading infrastructure data engineering", "{entity} investment technology leadership"],
          dataSources: ["tavily_web"],
          valueProposition: "Alpha generation infrastructure, data platform optimization, and quantitative tools",
          enrichmentPromptHints: "Look for CTO, Head of Technology, Chief Data Officer, Quantitative Lead, Head of Trading Infrastructure.",
          complianceFlags: [],
        },
      },
      {
        verticalName: "fintech",
        displayName: "Fintech Companies",
        description: "Technology leaders at fintech startups and scale-ups disrupting banking, payments, lending, and financial infrastructure.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Engineering", "Platform", "Product", "Data"],
          states: [],
          painPointKeywords: ["payment processing", "lending automation", "compliance technology", "banking APIs"],
          techMaturityMin: 7,
          techMaturityMax: 10,
        },
        searchQueries: ["fintech CTO VP Engineering", "payments company technology leader", "neobank infrastructure"],
        playbookConfig: {
          targetEntityTypes: ["fintech_company", "payments_company", "neobank"],
          queryTemplates: ["{entity} CTO VP Engineering technology leadership", "{entity} payments infrastructure platform", "{entity} engineering team technology"],
          dataSources: ["tavily_web", "crunchbase"],
          valueProposition: "Payment processing optimization, compliance automation, and banking API infrastructure",
          enrichmentPromptHints: "PRIORITY: CTO, VP Engineering, Head of Platform, VP Infrastructure. Focus on payment processing, compliance challenges, banking integrations.",
          complianceFlags: ["SOC2", "PCI"],
        },
      },
      {
        verticalName: "financial_services",
        displayName: "Banks & Credit Unions",
        description: "CIOs and technology leaders at regional banks, credit unions, and community financial institutions modernizing core systems.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Operations", "Customer Service", "Risk Management", "Compliance"],
          states: [],
          painPointKeywords: ["fraud detection", "customer onboarding", "regulatory compliance", "loan processing", "core banking"],
          techMaturityMin: 4,
          techMaturityMax: 8,
        },
        searchQueries: ["regional bank CIO technology", "credit union digital transformation", "community bank modernization"],
        playbookConfig: {
          targetEntityTypes: ["bank", "credit_union", "insurance"],
          queryTemplates: ["{entity} {state} CIO technology leader", "{entity} digital transformation core banking", "{entity} technology modernization IT"],
          dataSources: ["tavily_web", "fdic_banks"],
          valueProposition: "Core banking modernization, fraud detection AI, and customer experience automation",
          enrichmentPromptHints: "Look for CIO, CTO, VP Technology, Chief Digital Officer. Focus on core banking modernization, fraud detection, regulatory compliance.",
          complianceFlags: ["SOC2", "PCI"],
        },
      },
      // === PRIVATE CAPITAL ===
      {
        verticalName: "pe",
        displayName: "Private Equity Firms",
        description: "Operating Partners and technology advisors at PE firms driving value creation and operational improvements across portfolio companies.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Operations", "Technology", "Finance", "Portfolio Operations"],
          states: [],
          painPointKeywords: ["operational efficiency", "due diligence", "portfolio management", "value creation", "operational DD"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: ["PE operating partner technology", "private equity value creation", "portfolio company CTO"],
        playbookConfig: {
          targetEntityTypes: ["pe_firm", "private_equity", "portfolio_company"],
          queryTemplates: ["{entity} operating partner technology advisor", "{entity} portfolio company CTO", "{entity} value creation technology"],
          dataSources: ["tavily_web", "crunchbase"],
          valueProposition: "Portfolio value creation, operational efficiency AI, and due diligence automation",
          enrichmentPromptHints: "PRIORITY: Operating Partner, Technology Advisor, VP Operations, Portfolio Company CTO.",
          complianceFlags: [],
        },
      },
      {
        verticalName: "venture_capital",
        displayName: "Venture Capital Firms",
        description: "Operating partners, CTOs-in-residence, and platform teams at VC firms supporting portfolio company technology decisions.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Platform", "Operations", "Portfolio Support", "Technology"],
          states: [],
          painPointKeywords: ["portfolio support", "technical due diligence", "founder support", "platform services"],
          techMaturityMin: 6,
          techMaturityMax: 10,
        },
        searchQueries: ["VC firm operating partner CTO", "venture capital platform team", "VC portfolio technology"],
        playbookConfig: {
          targetEntityTypes: ["vc_firm", "venture_capital", "investment_fund"],
          queryTemplates: ["{entity} operating partner CTO in residence", "{entity} platform team technology", "{entity} portfolio support technology"],
          dataSources: ["tavily_web", "crunchbase"],
          valueProposition: "Portfolio technology support, technical due diligence, and platform services",
          enrichmentPromptHints: "Look for Operating Partner, CTO-in-Residence, Platform Lead, VP Portfolio Support.",
          complianceFlags: [],
        },
      },
      // === HEALTHCARE ===
      {
        verticalName: "healthcare",
        displayName: "Hospital Systems",
        description: "CIOs, CMIOs, and health IT leaders at hospitals and health systems implementing clinical systems and patient care technology.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Health Information Technology", "Clinical Operations", "Patient Services", "Digital Health"],
          states: [],
          painPointKeywords: ["EHR integration", "patient scheduling", "claims processing", "HIPAA compliance", "clinical AI"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: ["hospital CIO CMIO health IT", "health system technology leader", "clinical informatics director"],
        playbookConfig: {
          targetEntityTypes: ["hospital", "health_system", "medical_center"],
          queryTemplates: ["{entity} CIO CMIO health IT leadership", "{entity} clinical informatics technology", "{entity} digital health transformation"],
          dataSources: ["tavily_web", "cms_hospitals"],
          valueProposition: "Clinical workflow automation, EHR optimization, and HIPAA-compliant AI solutions",
          enrichmentPromptHints: "PRIORITY: CIO, CMIO, VP Health IT, Chief Digital Officer, Director of Clinical Informatics.",
          complianceFlags: ["HIPAA"],
        },
      },
      {
        verticalName: "health_tech",
        displayName: "Health Tech Companies",
        description: "CTOs and engineering leaders at digital health startups and health technology vendors building clinical and patient-facing solutions.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Engineering", "Product", "Clinical", "Data Science"],
          states: [],
          painPointKeywords: ["clinical validation", "HIPAA engineering", "patient engagement", "EHR integration"],
          techMaturityMin: 6,
          techMaturityMax: 10,
        },
        searchQueries: ["health tech CTO VP Engineering", "digital health startup technology", "healthcare AI company"],
        playbookConfig: {
          targetEntityTypes: ["health_tech_company", "digital_health", "healthtech_startup"],
          queryTemplates: ["{entity} CTO VP Engineering technology", "{entity} clinical engineering product", "{entity} healthcare AI technology team"],
          dataSources: ["tavily_web", "crunchbase"],
          valueProposition: "Clinical validation support, HIPAA engineering, and healthcare integration platforms",
          enrichmentPromptHints: "Look for CTO, VP Engineering, Chief Medical Officer, Head of Product, VP Clinical.",
          complianceFlags: ["HIPAA", "SOC2"],
        },
      },
      // === LEGAL ===
      {
        verticalName: "legal",
        displayName: "Law Firms (AmLaw 200)",
        description: "CIOs, innovation partners, and legal tech leaders at major law firms implementing AI for e-discovery, research, and practice management.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Legal Operations", "Document Management", "Research", "Innovation", "IT"],
          states: [],
          painPointKeywords: ["document review", "contract analysis", "legal research", "case management", "e-discovery"],
          techMaturityMin: 2,
          techMaturityMax: 6,
        },
        searchQueries: ["AmLaw law firm CIO innovation", "legal technology director", "law firm e-discovery AI"],
        playbookConfig: {
          targetEntityTypes: ["law_firm", "corporate_legal"],
          queryTemplates: ["{entity} CIO innovation partner technology", "{entity} legal technology e-discovery", "{entity} practice management technology"],
          dataSources: ["tavily_web", "state_bar"],
          valueProposition: "E-discovery automation, contract AI, and practice management optimization",
          enrichmentPromptHints: "PRIORITY: CIO, Innovation Partner, Director of IT, Legal Technology Director, Managing Partner.",
          complianceFlags: [],
        },
      },
      // === EDUCATION ===
      {
        verticalName: "higher_education",
        displayName: "Higher Education (Top 200)",
        description: "CIOs and IT directors at universities and colleges modernizing campus technology, student systems, and research infrastructure.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Information Technology", "Academic Technology", "Research Computing", "Student Systems"],
          states: [],
          painPointKeywords: ["student information systems", "research computing", "campus technology", "LMS integration"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: ["university CIO IT director", "higher education technology leader", "campus technology modernization"],
        playbookConfig: {
          targetEntityTypes: ["university", "college", "higher_education"],
          queryTemplates: ["{entity} CIO VP IT technology leadership", "{entity} academic technology research computing", "{entity} campus technology modernization"],
          dataSources: ["tavily_web"],
          valueProposition: "Campus technology modernization, research computing, and student experience platforms",
          enrichmentPromptHints: "Look for CIO, VP IT, Director of Academic Technology, Head of Research Computing.",
          complianceFlags: [],
        },
      },
      {
        verticalName: "k12_education",
        displayName: "K-12 School Districts",
        description: "Technology directors and CIOs at large school districts implementing educational technology and administrative systems.",
        isActive: false,
        targetCriteria: {
          minPopulation: 10000,
          maxPopulation: null,
          departments: ["Technology", "Information Systems", "Curriculum Technology", "Operations"],
          states: [],
          painPointKeywords: ["student data", "educational technology", "district systems", "learning management"],
          techMaturityMin: 2,
          techMaturityMax: 5,
        },
        searchQueries: ["school district CTO technology director", "K-12 education technology", "school district IT modernization"],
        playbookConfig: {
          targetEntityTypes: ["school_district", "education_system"],
          queryTemplates: ["{entity} {state} technology director CTO", "{entity} education technology IT", "{entity} district systems modernization"],
          dataSources: ["tavily_web"],
          valueProposition: "Educational technology integration, student information systems, and district operations automation",
          enrichmentPromptHints: "Look for Technology Director, CTO, IT Director, Director of Information Systems.",
          complianceFlags: [],
        },
      },
      // === INDUSTRIAL ===
      {
        verticalName: "manufacturing",
        displayName: "Manufacturing",
        description: "Technology leaders at manufacturing companies implementing Industry 4.0, IoT, and operational technology solutions.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Technology", "Operations Technology", "Digital Manufacturing", "IT/OT"],
          states: [],
          painPointKeywords: ["Industry 4.0", "IoT", "operational technology", "predictive maintenance", "supply chain"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: ["manufacturing CTO digital transformation", "Industry 4.0 technology leader", "smart factory technology"],
        playbookConfig: {
          targetEntityTypes: ["manufacturer", "industrial_company"],
          queryTemplates: ["{entity} CTO VP Technology digital manufacturing", "{entity} Industry 4.0 IoT operations", "{entity} smart factory technology leadership"],
          dataSources: ["tavily_web"],
          valueProposition: "Industry 4.0 implementation, IoT platform optimization, and operational technology integration",
          enrichmentPromptHints: "Look for CTO, VP Technology, Head of Digital Manufacturing, Director of OT, VP Operations Technology.",
          complianceFlags: [],
        },
      },
      {
        verticalName: "energy_utilities",
        displayName: "Energy & Utilities",
        description: "Technology and digital leaders at energy companies and utilities modernizing grid infrastructure and operations.",
        isActive: false,
        targetCriteria: {
          minPopulation: null,
          maxPopulation: null,
          departments: ["Technology", "Grid Operations", "Digital", "SCADA/OT"],
          states: [],
          painPointKeywords: ["grid modernization", "smart metering", "renewable integration", "SCADA security"],
          techMaturityMin: 3,
          techMaturityMax: 7,
        },
        searchQueries: ["utility CIO technology leader", "energy company digital transformation", "smart grid technology"],
        playbookConfig: {
          targetEntityTypes: ["utility", "energy_company", "power_company"],
          queryTemplates: ["{entity} CIO CTO technology leadership", "{entity} grid modernization digital", "{entity} smart grid SCADA technology"],
          dataSources: ["tavily_web"],
          valueProposition: "Grid modernization, smart metering, and operational technology security",
          enrichmentPromptHints: "Look for CIO, CTO, VP Technology, Head of Grid Operations, Director of Digital.",
          complianceFlags: [],
        },
      },
      // === GOVERNMENT ===
      {
        verticalName: "government",
        displayName: "Government",
        description: "IT directors, CIOs, and department heads at counties, municipalities, and state agencies modernizing citizen services and operations.",
        isActive: true,
        targetCriteria: {
          minPopulation: 50000,
          maxPopulation: null,
          departments: ["County Administration", "Information Technology", "Finance & Budget", "Public Works"],
          states: [],
          painPointKeywords: ["legacy systems", "manual processes", "citizen services", "data silos", "compliance", "ARPA funding"],
          techMaturityMin: 1,
          techMaturityMax: 6,
        },
        searchQueries: ["county government IT modernization", "municipal technology upgrade", "state agency digital transformation"],
        playbookConfig: {
          targetEntityTypes: ["county", "city", "district", "municipality"],
          queryTemplates: ["{entity} {state} IT director CIO technology", "{entity} {state} {department} contact phone email", "{entity} {state} digital transformation modernization"],
          dataSources: ["tavily_web", "us_census"],
          valueProposition: "Citizen services automation, legacy system modernization, and operational efficiency AI",
          enrichmentPromptHints: "PRIORITY: IT Director, CIO, County Manager, Department Head, Technology Director. Focus on ARPA funding, budget cycles, legacy system replacement.",
          complianceFlags: [],
        },
      },
    ];

    for (const icpData of defaultIcps) {
      const existingProfile = existingByVertical.get(icpData.verticalName);
      const { playbookConfig, ...icpInsertData } = icpData;

      if (existingProfile) {
        // Update existing profile with new data but preserve isActive state
        await this.updateIcpProfile(existingProfile.id, {
          displayName: icpInsertData.displayName,
          description: icpInsertData.description,
          targetCriteria: icpInsertData.targetCriteria,
          searchQueries: icpInsertData.searchQueries,
          playbookConfig: playbookConfig,
        });
        updated++;
        console.log(`[Storage] Updated ICP: ${icpData.displayName}`);
      } else {
        // Create new profile
        const [newProfile] = await db.insert(icpProfiles).values({
          ...icpInsertData,
          playbookConfig: playbookConfig,
        }).returning();
        created++;
        console.log(`[Storage] Created ICP: ${icpData.displayName}`);
      }
    }

    return { created, updated };
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
