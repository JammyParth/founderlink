package com.founderlink.investment.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.founderlink.investment.entity.InvestmentStatus;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvestmentResponseDto {

    private Long id;
    private Long startupId;
    private Long investorId;
    private BigDecimal amount;
    private InvestmentStatus status;
    private LocalDateTime createdAt;
}
