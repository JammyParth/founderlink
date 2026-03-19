package com.founderlink.investment.dto.request;

import com.founderlink.investment.entity.InvestmentStatus;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvestmentStatusUpdateDto {

    @NotNull(message = "Status is required")
    private InvestmentStatus status;
}