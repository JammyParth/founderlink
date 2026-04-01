export enum StartupStage {
  IDEA = 'IDEA',
  MVP = 'MVP',
  EARLY_TRACTION = 'EARLY_TRACTION',
  SCALING = 'SCALING'
}

export function parseStartupStage(stage: string | null | undefined): StartupStage {
  if (!stage) return StartupStage.IDEA;
  const upperStage = stage.toUpperCase();
  
  if (Object.values(StartupStage).includes(upperStage as StartupStage)) {
    return upperStage as StartupStage;
  }
  
  return StartupStage.IDEA; // Fallback
}

export interface Startup {
  id: number;
  name: string;
  description: string;
  industry: string;
  problemStatement: string;
  solution: string;
  fundingGoal: number;
  stage: StartupStage;
  founderId: number;
  createdAt: Date | null;
}
