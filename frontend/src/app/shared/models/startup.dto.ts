export interface StartupDto {
  id: number;
  name: string;
  description: string;
  industry: string;
  problemStatement: string;
  solution: string;
  fundingGoal: number;
  stage: string;
  founderId: number;
  createdAt: string | null;
}

export interface StartupCreateDto {
  name: string;
  description: string;
  industry: string;
  problemStatement: string;
  solution: string;
  fundingGoal: number;
  stage: string;
}
