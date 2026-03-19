package com.founderlink.team.service.invitation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.founderlink.team.dto.response.InvitationResponseDto;
import com.founderlink.team.entity.Invitation;
import com.founderlink.team.entity.InvitationStatus;
import com.founderlink.team.entity.TeamRole;
import com.founderlink.team.events.TeamEventPublisher;
import com.founderlink.team.mapper.InvitationMapper;
import com.founderlink.team.repository.InvitationRepository;
import com.founderlink.team.serviceImpl.InvitationServiceImpl;

@ExtendWith(MockitoExtension.class)
class GetInvitationsTest {

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private InvitationMapper invitationMapper;

    @Mock
    private TeamEventPublisher eventPublisher;

    @InjectMocks
    private InvitationServiceImpl invitationService;

    private Invitation invitation;
    private InvitationResponseDto responseDto;

    @BeforeEach
    void setUp() {
        invitation = new Invitation();
        invitation.setId(1L);
        invitation.setStartupId(101L);
        invitation.setFounderId(5L);
        invitation.setInvitedUserId(202L);
        invitation.setRole(TeamRole.CTO);
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setCreatedAt(LocalDateTime.now());

        responseDto = new InvitationResponseDto();
        responseDto.setId(1L);
        responseDto.setStartupId(101L);
        responseDto.setFounderId(5L);
        responseDto.setInvitedUserId(202L);
        responseDto.setRole(TeamRole.CTO);
        responseDto.setStatus(InvitationStatus.PENDING);
        responseDto.setCreatedAt(LocalDateTime.now());
    }

    // GET BY USER ID — SUCCESS
    
    @Test
    void getInvitationsByUserId_Success() {

        // Arrange
        when(invitationRepository
                .findByInvitedUserIdAndStatus(
                        202L, InvitationStatus.PENDING))
                .thenReturn(List.of(invitation));
        when(invitationMapper.toResponseDto(invitation))
                .thenReturn(responseDto);

        // Act
        List<InvitationResponseDto> result = invitationService
                .getInvitationsByUserId(202L);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getInvitedUserId())
                .isEqualTo(202L);
        assertThat(result.get(0).getStatus())
                .isEqualTo(InvitationStatus.PENDING);
    }

    // GET BY USER ID — EMPTY
    
    @Test
    void getInvitationsByUserId_NoInvitations_ReturnsEmptyList() {

        // Arrange
        when(invitationRepository
                .findByInvitedUserIdAndStatus(
                        202L, InvitationStatus.PENDING))
                .thenReturn(List.of());

        // Act
        List<InvitationResponseDto> result = invitationService
                .getInvitationsByUserId(202L);

        // Assert
        assertThat(result).isEmpty();
    }

    // GET BY STARTUP ID — SUCCESS
    
    @Test
    void getInvitationsByStartupId_Success() {

        // Arrange
        when(invitationRepository
                .findByStartupId(101L))
                .thenReturn(List.of(invitation));
        when(invitationMapper.toResponseDto(invitation))
                .thenReturn(responseDto);

        // Act
        List<InvitationResponseDto> result = invitationService
                .getInvitationsByStartupId(101L);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStartupId())
                .isEqualTo(101L);
    }

    // GET BY STARTUP ID — EMPTY
    
    @Test
    void getInvitationsByStartupId_NoInvitations_ReturnsEmptyList() {

        // Arrange
        when(invitationRepository.findByStartupId(101L))
                .thenReturn(List.of());

        // Act
        List<InvitationResponseDto> result = invitationService
                .getInvitationsByStartupId(101L);

        // Assert
        assertThat(result).isEmpty();
    }
}