import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export chat models
export * from "./models/chat";

// Users table (existing)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Government Lead - main entity for county/local government contacts
export const governmentLeads = pgTable("government_leads", {
  id: serial("id").primaryKey(),
  institutionName: text("institution_name").notNull(),
  institutionType: text("institution_type").notNull(), // county, city, district, department
  department: text("department"), // e.g., IT, Finance, Public Works
  state: text("state").notNull(),
  county: text("county"),
  city: text("city"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  website: text("website"),
  population: integer("population"),
  annualBudget: text("annual_budget"),
  techMaturityScore: integer("tech_maturity_score"), // 1-10 scale
  priorityScore: integer("priority_score"), // 0-100 calculated score
  status: text("status").notNull().default("not_contacted"), // not_contacted, contacted, follow_up, qualified, closed_won, closed_lost
  painPoints: text("pain_points").array(),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertGovernmentLeadSchema = createInsertSchema(governmentLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGovernmentLead = z.infer<typeof insertGovernmentLeadSchema>;
export type GovernmentLead = typeof governmentLeads.$inferSelect;

// Call Script - AI-generated scripts for each lead
export const callScripts = pgTable("call_scripts", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => governmentLeads.id, { onDelete: "cascade" }),
  openingStatement: text("opening_statement").notNull(),
  painPointMatch: text("pain_point_match").notNull(),
  solutionPitch: text("solution_pitch").notNull(),
  objectionHandlers: text("objection_handlers").array(),
  closingStatement: text("closing_statement").notNull(),
  fullScript: text("full_script").notNull(),
  generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertCallScriptSchema = createInsertSchema(callScripts).omit({
  id: true,
  generatedAt: true,
});

export type InsertCallScript = z.infer<typeof insertCallScriptSchema>;
export type CallScript = typeof callScripts.$inferSelect;

// Company Profile - stores rltx.ai capabilities extracted by AI
export const companyProfile = pgTable("company_profile", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("rltx.ai"),
  valueProposition: text("value_proposition").notNull(),
  services: text("services").array(),
  priceRange: text("price_range").notNull(),
  targetMarket: text("target_market").notNull(),
  uniqueSellingPoints: text("unique_selling_points").array(),
  caseStudies: text("case_studies").array(),
  lastUpdated: timestamp("last_updated").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertCompanyProfileSchema = createInsertSchema(companyProfile).omit({
  id: true,
  lastUpdated: true,
});

export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type CompanyProfile = typeof companyProfile.$inferSelect;

// Call Log - track call outcomes
export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => governmentLeads.id, { onDelete: "cascade" }),
  callDate: timestamp("call_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  duration: integer("duration"), // in seconds
  outcome: text("outcome").notNull(), // no_answer, voicemail, spoke_decision_maker, follow_up_scheduled, not_interested, qualified
  notes: text("notes"),
  nextSteps: text("next_steps"),
});

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
});

export type InsertCallLog = z.infer<typeof insertCallLogSchema>;
export type CallLog = typeof callLogs.$inferSelect;

// Scrape Job - track scraping progress
export const scrapeJobs = pgTable("scrape_jobs", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  totalStates: integer("total_states").notNull().default(0),
  statesCompleted: integer("states_completed").notNull().default(0),
  leadsFound: integer("leads_found").notNull().default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertScrapeJobSchema = createInsertSchema(scrapeJobs).omit({
  id: true,
  createdAt: true,
});

export type InsertScrapeJob = z.infer<typeof insertScrapeJobSchema>;
export type ScrapeJob = typeof scrapeJobs.$inferSelect;
