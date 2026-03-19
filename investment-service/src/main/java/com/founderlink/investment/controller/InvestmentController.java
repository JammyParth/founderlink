package com.founderlink.investment.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.founderlink.investment.dto.request.InvestmentRequestDto;
import com.founderlink.investment.dto.request.InvestmentStatusUpdateDto;
import com.founderlink.investment.dto.response.InvestmentResponseDto;
import com.founderlink.investment.service.InvestmentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/investments")
@RequiredArgsConstructor
public class InvestmentController {

    private final InvestmentService investmentService;

    // CREATE INVESTMENT
    // POST /investments
    // Called by → Investor
    
    @PostMapping
    public ResponseEntity<InvestmentResponseDto> createInvestment(
            @RequestHeader("X-User-Id") Long investorId,
            @Valid @RequestBody InvestmentRequestDto requestDto) {

        InvestmentResponseDto response = investmentService
                .createInvestment(investorId, requestDto);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // GET INVESTMENTS BY STARTUP ID
    // GET /investments/startup/{startupId}
    // Called by → Founder

    
    @GetMapping("/startup/{startupId}")
    public ResponseEntity<List<InvestmentResponseDto>> getInvestmentsByStartupId(
            @PathVariable Long startupId) {

        List<InvestmentResponseDto> response = investmentService
                .getInvestmentsByStartupId(startupId);

        return ResponseEntity.ok(response);
    }

    // GET INVESTMENTS BY INVESTOR ID
    // GET /investments/investor/{investorId}
    // Called by → Investor
    
    @GetMapping("/investor/{investorId}")
    public ResponseEntity<List<InvestmentResponseDto>> getInvestmentsByInvestorId(
            @PathVariable Long investorId) {

        List<InvestmentResponseDto> response = investmentService
                .getInvestmentsByInvestorId(investorId);

        return ResponseEntity.ok(response);
    }

    // UPDATE INVESTMENT STATUS
    // PUT /investments/{id}/status
    // Called by → Founder
    
    @PutMapping("/{id}/status")
    public ResponseEntity<InvestmentResponseDto> updateInvestmentStatus(
            @PathVariable Long id,
            @Valid @RequestBody InvestmentStatusUpdateDto statusUpdateDto) {

        InvestmentResponseDto response = investmentService
                .updateInvestmentStatus(id, statusUpdateDto);

        return ResponseEntity.ok(response);
    }

    // GET INVESTMENT BY ID
    // GET /investments/{id}
    // Called by → Anyone
    
    @GetMapping("/{id}")
    public ResponseEntity<InvestmentResponseDto> getInvestmentById(
            @PathVariable Long id) {

        InvestmentResponseDto response = investmentService
                .getInvestmentById(id);

        return ResponseEntity.ok(response);
    }
}