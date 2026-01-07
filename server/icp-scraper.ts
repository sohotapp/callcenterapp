import { storage } from "./storage";
import { US_COUNTIES, type CountyData } from "./county-data";
import type { IcpProfile, ScrapeJob, TargetCriteria } from "@shared/schema";

export interface MatchingTarget {
  county: CountyData;
  departments: string[];
}

const DEFAULT_DEPARTMENTS = [
  "County Administration",
  "Information Technology",
  "Finance & Budget",
  "Public Works",
  "Human Resources",
];

export function findMatchingLeadTargets(icp: IcpProfile): MatchingTarget[] {
  const criteria = icp.targetCriteria as TargetCriteria | null | undefined;
  
  let matchingCounties = [...US_COUNTIES];
  
  if (criteria?.states && criteria.states.length > 0) {
    const normalizedStates = criteria.states.map(s => s.toLowerCase());
    matchingCounties = matchingCounties.filter(county => {
      const lowerState = county.state.toLowerCase();
      const lowerAbbr = county.stateAbbr.toLowerCase();
      return normalizedStates.some(s => s === lowerState || s === lowerAbbr);
    });
  }
  
  if (criteria?.minPopulation != null) {
    matchingCounties = matchingCounties.filter(
      county => county.population >= (criteria.minPopulation as number)
    );
  }
  
  if (criteria?.maxPopulation != null) {
    matchingCounties = matchingCounties.filter(
      county => county.population <= (criteria.maxPopulation as number)
    );
  }
  
  const departments = criteria?.departments && criteria.departments.length > 0
    ? criteria.departments
    : DEFAULT_DEPARTMENTS;
  
  return matchingCounties.map(county => ({
    county,
    departments,
  }));
}

export function getStatesFromTargets(targets: MatchingTarget[]): string[] {
  const stateSet = new Set<string>();
  for (const target of targets) {
    stateSet.add(target.county.state);
  }
  return Array.from(stateSet);
}

export async function queueAutoScrapeForIcp(icpId: number): Promise<ScrapeJob | null> {
  const icp = await storage.getIcpProfile(icpId);
  if (!icp) {
    console.error(`ICP profile ${icpId} not found`);
    return null;
  }
  
  const targets = findMatchingLeadTargets(icp);
  if (targets.length === 0) {
    console.log(`No matching targets found for ICP ${icpId}`);
    return null;
  }
  
  const states = getStatesFromTargets(targets);
  console.log(`ICP ${icpId} (${icp.displayName}): Found ${targets.length} county targets across ${states.length} states`);
  
  const job = await storage.createScrapeJob({
    status: "pending",
    totalStates: states.length,
    statesCompleted: 0,
    leadsFound: 0,
  });
  
  executeAutoScrapeJob(job.id, icp, targets).catch(error => {
    console.error(`Auto-scrape job ${job.id} failed:`, error);
  });
  
  return job;
}

async function executeAutoScrapeJob(
  jobId: number,
  icp: IcpProfile,
  targets: MatchingTarget[]
): Promise<void> {
  try {
    await storage.updateScrapeJob(jobId, {
      status: "running",
      startedAt: new Date(),
    });
    
    const stateCountyMap = new Map<string, MatchingTarget[]>();
    for (const target of targets) {
      const state = target.county.state;
      if (!stateCountyMap.has(state)) {
        stateCountyMap.set(state, []);
      }
      stateCountyMap.get(state)!.push(target);
    }
    
    let statesProcessed = 0;
    let leadsFound = 0;
    
    for (const [state, stateTargets] of Array.from(stateCountyMap.entries())) {
      console.log(`Processing ${stateTargets.length} counties in ${state} for ICP ${icp.displayName}`);
      
      for (const target of stateTargets) {
        for (const department of target.departments) {
          const institutionName = `${target.county.name} County ${department}`;
          
          const existingLeads = await storage.getAllLeads();
          const alreadyExists = existingLeads.some(
            lead => 
              lead.institutionName === institutionName &&
              lead.state === target.county.state
          );
          
          if (!alreadyExists) {
            await storage.createLead({
              institutionName,
              institutionType: "county",
              department,
              state: target.county.state,
              county: target.county.name,
              population: target.county.population,
              status: "not_contacted",
              notes: `Auto-scraped from ICP: ${icp.displayName}`,
            });
            leadsFound++;
          }
        }
      }
      
      statesProcessed++;
      await storage.updateScrapeJob(jobId, {
        statesCompleted: statesProcessed,
        leadsFound,
      });
    }
    
    await storage.updateScrapeJob(jobId, {
      status: "completed",
      statesCompleted: stateCountyMap.size,
      leadsFound,
      completedAt: new Date(),
    });
    
    console.log(`Auto-scrape job ${jobId} completed. Found ${leadsFound} new leads for ICP ${icp.displayName}.`);
  } catch (error) {
    console.error(`Auto-scrape job ${jobId} failed:`, error);
    await storage.updateScrapeJob(jobId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      completedAt: new Date(),
    });
  }
}
