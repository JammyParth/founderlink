import { Startup, parseStartupStage } from '../models/startup.model';
import { StartupDto } from '../models/startup.dto';
import { DateAdapter } from '../utils/date.adapter';
import { Mapper } from './base.mapper';

export class StartupMapper implements Mapper<Startup, StartupDto> {
  toDomain(dto: StartupDto): Startup {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      industry: dto.industry,
      problemStatement: dto.problemStatement,
      solution: dto.solution,
      fundingGoal: dto.fundingGoal,
      stage: parseStartupStage(dto.stage),
      founderId: dto.founderId,
      createdAt: DateAdapter.fromServer(dto.createdAt)
    };
  }
}

export const startupMapper = new StartupMapper();
