import { Investment, parseInvestmentStatus } from '../models/investment.model';
import { InvestmentDto } from '../models/investment.dto';
import { DateAdapter } from '../utils/date.adapter';
import { Mapper } from './base.mapper';

export class InvestmentMapper implements Mapper<Investment, InvestmentDto> {
  toDomain(dto: InvestmentDto): Investment {
    return {
      id: dto.id,
      startupId: dto.startupId,
      investorId: dto.investorId,
      amount: dto.amount,
      status: parseInvestmentStatus(dto.status),
      createdAt: DateAdapter.fromServer(dto.createdAt)
    };
  }
}

export const investmentMapper = new InvestmentMapper();
