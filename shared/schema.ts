import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, serial, jsonb } from "drizzle-orm/pg-core";
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

// Enrichment data types for JSONB storage
export const decisionMakerSchema = z.object({
  name: z.string(),
  title: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  linkedIn: z.string().nullable().optional(),
});

export type DecisionMaker = z.infer<typeof decisionMakerSchema>;

export const recentNewsSchema = z.object({
  title: z.string(),
  url: z.string(),
  date: z.string().nullable().optional(),
  summary: z.string(),
});

export type RecentNews = z.infer<typeof recentNewsSchema>;

export const competitorAnalysisSchema = z.object({
  competitor: z.string(),
  product: z.string(),
  relationship: z.string(),
});

export type CompetitorAnalysis = z.infer<typeof competitorAnalysisSchema>;

// Scoring breakdown schema for JSONB storage
export const scoringBreakdownSchema = z.object({
  likelihoodFactors: z.object({
    painPointScore: z.number(),
    buyingSignalScore: z.number(),
    budgetScore: z.number(),
    techMaturityScore: z.number(),
    recentNewsScore: z.number(),
  }),
  matchFactors: z.object({
    painPointMatchScore: z.number(),
    departmentRelevanceScore: z.number(),
    techStackCompatibilityScore: z.number(),
    scaleAppropriatenessScore: z.number(),
  }),
  urgencyFactors: z.object({
    rfpMentionScore: z.number(),
    budgetCycleScore: z.number(),
    techComplaintScore: z.number(),
    itHiringScore: z.number(),
  }),
  notes: z.array(z.string()).optional(),
});

export type ScoringBreakdown = z.infer<typeof scoringBreakdownSchema>;

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
  likelihoodScore: integer("likelihood_score"), // 1-100 overall purchase probability
  matchScore: integer("match_score"), // 1-100 how well they match rltx.ai services
  urgencyScore: integer("urgency_score"), // 1-100 urgency based on buying signals
  budgetFitScore: integer("budget_fit_score"), // 1-100 budget alignment
  scoringBreakdown: jsonb("scoring_breakdown").$type<ScoringBreakdown>(),
  lastScoredAt: timestamp("last_scored_at"),
  status: text("status").notNull().default("not_contacted"), // not_contacted, contacted, follow_up, qualified, closed_won, closed_lost
  painPoints: text("pain_points").array(),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  lastCallOutcome: text("last_call_outcome"), // no_answer, voicemail, callback_scheduled, not_interested, interested, meeting_scheduled
  callNotes: text("call_notes"),
  // Lead enrichment fields
  decisionMakers: jsonb("decision_makers").$type<DecisionMaker[]>(),
  techStack: text("tech_stack").array(),
  recentNews: jsonb("recent_news").$type<RecentNews[]>(),
  competitorAnalysis: jsonb("competitor_analysis").$type<CompetitorAnalysis[]>(),
  buyingSignals: text("buying_signals").array(),
  enrichmentData: jsonb("enrichment_data").$type<Record<string, unknown>>(),
  enrichedAt: timestamp("enriched_at"),
  enrichmentScore: integer("enrichment_score"), // 1-100 quality score
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

// Script style type
export const scriptStyles = ["consultative", "direct_value", "question_led", "pain_agitate_solution"] as const;
export type ScriptStyle = typeof scriptStyles[number];

// Objection handler schema for JSONB storage
export const objectionHandlerSchema = z.object({
  objection: z.string(),
  response: z.string(),
});

export type ObjectionHandler = z.infer<typeof objectionHandlerSchema>;

// Call Script - AI-generated scripts for each lead with multiple style support
export const callScripts = pgTable("call_scripts", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => governmentLeads.id, { onDelete: "cascade" }),
  scriptStyle: text("script_style").notNull().default("consultative"),
  opener: text("opener").notNull(),
  talkingPoints: text("talking_points").array(),
  valueProposition: text("value_proposition").notNull(),
  fullScript: text("full_script").notNull(),
  objectionHandlers: jsonb("objection_handlers").$type<ObjectionHandler[]>(),
  closingStatement: text("closing_statement").notNull(),
  generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertCallScriptSchema = createInsertSchema(callScripts).omit({
  id: true,
  generatedAt: true,
});

export type InsertCallScript = z.infer<typeof insertCallScriptSchema>;
export type CallScript = typeof callScripts.$inferSelect;

// Case study structure for JSONB storage
export const caseStudySchema = z.object({
  title: z.string(),
  description: z.string(),
  results: z.string(),
});

export type CaseStudy = z.infer<typeof caseStudySchema>;

// Company Profile - stores rltx.ai capabilities extracted by AI
export const companyProfile = pgTable("company_profile", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("rltx.ai"),
  tagline: text("tagline"),
  description: text("description"),
  services: text("services").array(),
  capabilities: text("capabilities").array(),
  caseStudies: jsonb("case_studies").$type<CaseStudy[]>(),
  targetMarkets: text("target_markets").array(),
  priceRange: text("price_range"),
  uniqueSellingPoints: text("unique_selling_points").array(),
  competitiveAdvantages: text("competitive_advantages").array(),
  scrapedFromUrl: text("scraped_from_url"),
  lastScrapedAt: timestamp("last_scraped_at"),
  manuallyEdited: boolean("manually_edited").default(false),
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

// ICP Target Criteria schema for JSONB storage
export const targetCriteriaSchema = z.object({
  minPopulation: z.number().nullable().optional(),
  maxPopulation: z.number().nullable().optional(),
  minBudget: z.number().nullable().optional(),
  maxBudget: z.number().nullable().optional(),
  departments: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
  painPointKeywords: z.array(z.string()).optional(),
  techMaturityMin: z.number().min(1).max(10).nullable().optional(),
  techMaturityMax: z.number().min(1).max(10).nullable().optional(),
});

export type TargetCriteria = z.infer<typeof targetCriteriaSchema>;

// ICP Profiles - Ideal Customer Profile for different verticals
export const icpProfiles = pgTable("icp_profiles", {
  id: serial("id").primaryKey(),
  verticalName: text("vertical_name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  autoScrapeEnabled: boolean("auto_scrape_enabled").notNull().default(false),
  targetCriteria: jsonb("target_criteria").$type<TargetCriteria>(),
  searchQueries: text("search_queries").array(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertIcpProfileSchema = createInsertSchema(icpProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIcpProfile = z.infer<typeof insertIcpProfileSchema>;
export type IcpProfile = typeof icpProfiles.$inferSelect;

// Email Sequence status types
export const sequenceStatuses = ["draft", "active", "paused"] as const;
export type SequenceStatus = typeof sequenceStatuses[number];

// Enrollment status types
export const enrollmentStatuses = ["active", "completed", "unsubscribed"] as const;
export type EnrollmentStatus = typeof enrollmentStatuses[number];

// Email Sequences - multi-step email campaigns
export const emailSequences = pgTable("email_sequences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, active, paused
  icpId: integer("icp_id").references(() => icpProfiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertEmailSequenceSchema = createInsertSchema(emailSequences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmailSequence = z.infer<typeof insertEmailSequenceSchema>;
export type EmailSequence = typeof emailSequences.$inferSelect;

// Sequence Steps - individual email steps within a sequence
export const sequenceSteps = pgTable("sequence_steps", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => emailSequences.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  subject: text("subject").notNull(),
  bodyTemplate: text("body_template").notNull(),
  delayDays: integer("delay_days").notNull().default(0),
  delayHours: integer("delay_hours").notNull().default(0),
  includeIfCondition: text("include_if_condition"), // e.g., "hasEmail", "hasBuyingSignals"
});

export const insertSequenceStepSchema = createInsertSchema(sequenceSteps).omit({
  id: true,
});

export type InsertSequenceStep = z.infer<typeof insertSequenceStepSchema>;
export type SequenceStep = typeof sequenceSteps.$inferSelect;

// Sequence Enrollments - track leads enrolled in sequences
export const sequenceEnrollments = pgTable("sequence_enrollments", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => emailSequences.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").notNull().references(() => governmentLeads.id, { onDelete: "cascade" }),
  currentStep: integer("current_step").notNull().default(1),
  status: text("status").notNull().default("active"), // active, completed, unsubscribed
  enrolledAt: timestamp("enrolled_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  lastStepSentAt: timestamp("last_step_sent_at"),
  nextStepAt: timestamp("next_step_at"),
});

export const insertSequenceEnrollmentSchema = createInsertSchema(sequenceEnrollments).omit({
  id: true,
  enrolledAt: true,
});

export type InsertSequenceEnrollment = z.infer<typeof insertSequenceEnrollmentSchema>;
export type SequenceEnrollment = typeof sequenceEnrollments.$inferSelect;

// Type for sequence with its steps
export type EmailSequenceWithSteps = EmailSequence & {
  steps: SequenceStep[];
};

// Activity types for outreach tracking
export const activityTypes = [
  "email_sent",
  "email_opened",
  "email_replied",
  "call_made",
  "call_answered",
  "linkedin_sent",
  "linkedin_connected"
] as const;
export type ActivityType = typeof activityTypes[number];

// Activity channel types
export const activityChannels = ["email", "phone", "linkedin"] as const;
export type ActivityChannel = typeof activityChannels[number];

// Call outcome types
export const callOutcomes = [
  "no_answer",
  "voicemail",
  "callback_scheduled",
  "not_interested",
  "interested",
  "meeting_scheduled"
] as const;
export type CallOutcome = typeof callOutcomes[number];

// Activity metadata schema for JSONB storage
export const activityMetadataSchema = z.object({
  openCount: z.number().optional(),
  clickedLinks: z.array(z.string()).optional(),
  emailSubject: z.string().optional(),
  linkedinProfileUrl: z.string().optional(),
  callRecordingUrl: z.string().optional(),
}).passthrough();

export type ActivityMetadata = z.infer<typeof activityMetadataSchema>;

// Outreach Activities - track all outreach activities for leads
export const outreachActivities = pgTable("outreach_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => governmentLeads.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // email_sent, email_opened, email_replied, call_made, call_answered, linkedin_sent, linkedin_connected
  channel: text("channel").notNull(), // email, phone, linkedin
  sequenceId: integer("sequence_id").references(() => emailSequences.id, { onDelete: "set null" }),
  stepNumber: integer("step_number"),
  notes: text("notes"),
  outcome: text("outcome"), // for calls: no_answer, voicemail, callback_scheduled, not_interested, interested, meeting_scheduled
  duration: integer("duration"), // call duration in seconds
  metadata: jsonb("metadata").$type<ActivityMetadata>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertOutreachActivitySchema = createInsertSchema(outreachActivities).omit({
  id: true,
  createdAt: true,
});

export type InsertOutreachActivity = z.infer<typeof insertOutreachActivitySchema>;
export type OutreachActivity = typeof outreachActivities.$inferSelect;
