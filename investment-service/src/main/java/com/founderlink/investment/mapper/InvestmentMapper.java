package com.founderlink.investment.mapper;

import org.springframework.stereotype.Component;

import com.founderlink.investment.dto.request.InvestmentRequestDto;
import com.founderlink.investment.dto.response.InvestmentResponseDto;
import com.founderlink.investment.entity.Investment;

@Component
public class InvestmentMapper {

    // ─────────────────────────────────────────
    // RequestDto + investorId → Entity
    // ─────────────────────────────────────────
    public Investment toEntity(InvestmentRequestDto requestDto, Long investorId) {
        Investment investment = new Investment();
        investment.setStartupId(requestDto.getStartupId());
        investment.setInvestorId(investorId);
        investment.setAmount(requestDto.getAmount());
        return investment;
    }

    // ─────────────────────────────────────────
    // Entity → ResponseDto
    // ─────────────────────────────────────────
    public InvestmentResponseDto toResponseDto(Investment investment) {
        InvestmentResponseDto responseDto = new InvestmentResponseDto();
        responseDto.setId(investment.getId());
        responseDto.setStartupId(investment.getStartupId());
        responseDto.setInvestorId(investment.getInvestorId());
        responseDto.setAmount(investment.getAmount());
        responseDto.setStatus(investment.getStatus());
        responseDto.setCreatedAt(investment.getCreatedAt());
        return responseDto;
    }
}