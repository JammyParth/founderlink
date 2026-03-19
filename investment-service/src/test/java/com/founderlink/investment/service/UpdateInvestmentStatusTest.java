package com.founderlink.investment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.founderlink.investment.dto.request.InvestmentStatusUpdateDto;
import com.founderlink.investment.dto.response.InvestmentResponseDto;
import com.founderlink.investment.entity.Investment;
import com.founderlink.investment.entity.InvestmentStatus;
import com.founderlink.investment.events.InvestmentEventPublisher;
import com.founderlink.investment.exception.InvalidStatusTransitionException;
import com.founderlink.investment.exception.InvestmentNotFoundException;
import com.founderlink.investment.mapper.InvestmentMapper;
import com.founderlink.investment.repository.InvestmentRepository;
import com.founderlink.investment.serviceImpl.InvestmentServiceImpl;

@ExtendWith(MockitoExtension.class)
class UpdateInvestmentStatusTest {

    @Mock
    private InvestmentRepository investmentRepository;

    @Mock
    private InvestmentMapper investmentMapper;

    @Mock
    private InvestmentEventPublisher eventPublisher;

    @InjectMocks
    private InvestmentServiceImpl investmentService;

    private Investment investment;

    @BeforeEach
    void setUp() {
        investment = new Investment();
        investment.setId(1L);
        investment.setStartupId(101L);
        investment.setInvestorId(202L);
        investment.setAmount(new BigDecimal("1000000.00"));
        investment.setStatus(InvestmentStatus.PENDING);
        investment.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void updateStatus_PendingToApproved_Success() {

        // Arrange
        InvestmentStatusUpdateDto statusUpdateDto =
                new InvestmentStatusUpdateDto(InvestmentStatus.APPROVED);

        Investment approvedInvestment = new Investment();
        approvedInvestment.setId(1L);
        approvedInvestment.setStatus(InvestmentStatus.APPROVED);

        InvestmentResponseDto approvedResponse = new InvestmentResponseDto();
        approvedResponse.setId(1L);
        approvedResponse.setStatus(InvestmentStatus.APPROVED);

        when(investmentRepository.findById(1L))
                .thenReturn(Optional.of(investment));
        when(investmentRepository.save(any(Investment.class)))
                .thenReturn(approvedInvestment);
        when(investmentMapper.toResponseDto(approvedInvestment))
                .thenReturn(approvedResponse);

        // Act
        InvestmentResponseDto result = investmentService
                .updateInvestmentStatus(1L, statusUpdateDto);

        // Assert
        assertThat(result.getStatus())
                .isEqualTo(InvestmentStatus.APPROVED);
    }

    @Test
    void updateStatus_PendingToRejected_Success() {

        // Arrange
        InvestmentStatusUpdateDto statusUpdateDto =
                new InvestmentStatusUpdateDto(InvestmentStatus.REJECTED);

        Investment rejectedInvestment = new Investment();
        rejectedInvestment.setId(1L);
        rejectedInvestment.setStatus(InvestmentStatus.REJECTED);

        InvestmentResponseDto rejectedResponse = new InvestmentResponseDto();
        rejectedResponse.setId(1L);
        rejectedResponse.setStatus(InvestmentStatus.REJECTED);

        when(investmentRepository.findById(1L))
                .thenReturn(Optional.of(investment));
        when(investmentRepository.save(any(Investment.class)))
                .thenReturn(rejectedInvestment);
        when(investmentMapper.toResponseDto(rejectedInvestment))
                .thenReturn(rejectedResponse);

        // Act
        InvestmentResponseDto result = investmentService
                .updateInvestmentStatus(1L, statusUpdateDto);

        // Assert
        assertThat(result.getStatus())
                .isEqualTo(InvestmentStatus.REJECTED);
    }

    @Test
    void updateStatus_ApprovedToCompleted_Success() {

        // Arrange
        investment.setStatus(InvestmentStatus.APPROVED);

        InvestmentStatusUpdateDto statusUpdateDto =
                new InvestmentStatusUpdateDto(InvestmentStatus.COMPLETED);

        Investment completedInvestment = new Investment();
        completedInvestment.setId(1L);
        completedInvestment.setStatus(InvestmentStatus.COMPLETED);

        InvestmentResponseDto completedResponse = new InvestmentResponseDto();
        completedResponse.setId(1L);
        completedResponse.setStatus(InvestmentStatus.COMPLETED);

        when(investmentRepository.findById(1L))
                .thenReturn(Optional.of(investment));
        when(investmentRepository.save(any(Investment.class)))
                .thenReturn(completedInvestment);
        when(investmentMapper.toResponseDto(completedInvestment))
                .thenReturn(completedResponse);

        // Act
        InvestmentResponseDto result = investmentService
                .updateInvestmentStatus(1L, statusUpdateDto);

        // Assert
        assertThat(result.getStatus())
                .isEqualTo(InvestmentStatus.COMPLETED);
    }

    @Test
    void updateStatus_CompletedInvestment_ThrowsException() {

        // Arrange
        investment.setStatus(InvestmentStatus.COMPLETED);
        InvestmentStatusUpdateDto statusUpdateDto =
                new InvestmentStatusUpdateDto(InvestmentStatus.APPROVED);

        when(investmentRepository.findById(1L))
                .thenReturn(Optional.of(investment));

        // Act & Assert
        assertThatThrownBy(() ->
                investmentService.updateInvestmentStatus(1L, statusUpdateDto))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessage("Cannot update a COMPLETED investment");
    }

    @Test
    void updateStatus_RejectedInvestment_ThrowsException() {

        // Arrange
        investment.setStatus(InvestmentStatus.REJECTED);
        InvestmentStatusUpdateDto statusUpdateDto =
                new InvestmentStatusUpdateDto(InvestmentStatus.APPROVED);

        when(investmentRepository.findById(1L))
                .thenReturn(Optional.of(investment));

        // Act & Assert
        assertThatThrownBy(() ->
                investmentService.updateInvestmentStatus(1L, statusUpdateDto))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessage("Cannot update a REJECTED investment");
    }

    @Test
    void updateStatus_PendingToCompleted_ThrowsException() {

        // Arrange
        investment.setStatus(InvestmentStatus.PENDING);
        InvestmentStatusUpdateDto statusUpdateDto =
                new InvestmentStatusUpdateDto(InvestmentStatus.COMPLETED);

        when(investmentRepository.findById(1L))
                .thenReturn(Optional.of(investment));

        // Act & Assert
        assertThatThrownBy(() ->
                investmentService.updateInvestmentStatus(1L, statusUpdateDto))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessage(
                    "Investment must be APPROVED before marking COMPLETED");
    }

    @Test
    void updateStatus_InvestmentNotFound_ThrowsException() {

        // Arrange
        InvestmentStatusUpdateDto statusUpdateDto =
                new InvestmentStatusUpdateDto(InvestmentStatus.APPROVED);

        when(investmentRepository.findById(999L))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() ->
                investmentService.updateInvestmentStatus(999L, statusUpdateDto))
                .isInstanceOf(InvestmentNotFoundException.class)
                .hasMessage("Investment not found with id: 999");
    }
}