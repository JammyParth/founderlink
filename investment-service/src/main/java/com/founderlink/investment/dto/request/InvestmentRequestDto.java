package com.founderlink.investment.dto.request;


import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvestmentRequestDto {

    @NotNull(message = "Startup ID is required")
    private Long startupId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1000.00", message = "Minimum investment amount is 1000")
    private BigDecimal amount;
}