import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import {
  users,
  governmentLeads,
  callScripts,
  companyProfile,
  callLogs,
  scrapeJobs,
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
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllLeads(): Promise<GovernmentLead[]>;
  getLead(id: number): Promise<GovernmentLead | undefined>;
  createLead(lead: InsertGovernmentLead): Promise<GovernmentLead>;
  updateLead(id: number, lead: Partial<InsertGovernmentLead>): Promise<GovernmentLead | undefined>;
  deleteLead(id: number): Promise<boolean>;

  getScriptByLeadId(leadId: number): Promise<CallScript | undefined>;
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

  async getScriptByLeadId(leadId: number): Promise<CallScript | undefined> {
    const [script] = await db.select().from(callScripts).where(eq(callScripts.leadId, leadId));
    return script;
  }

  async createScript(insertScript: InsertCallScript): Promise<CallScript> {
    await db.delete(callScripts).where(eq(callScripts.leadId, insertScript.leadId));
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
}

export const storage = new DatabaseStorage();
