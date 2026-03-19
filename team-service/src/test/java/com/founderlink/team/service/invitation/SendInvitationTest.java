package com.founderlink.team.service.invitation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.founderlink.team.dto.request.InvitationRequestDto;
import com.founderlink.team.dto.response.InvitationResponseDto;
import com.founderlink.team.entity.Invitation;
import com.founderlink.team.entity.InvitationStatus;
import com.founderlink.team.entity.TeamRole;
import com.founderlink.team.events.TeamEventPublisher;
import com.founderlink.team.events.TeamInviteEvent;
import com.founderlink.team.exception.DuplicateInvitationException;
import com.founderlink.team.exception.UnauthorizedAccessException;
import com.founderlink.team.mapper.InvitationMapper;
import com.founderlink.team.repository.InvitationRepository;
import com.founderlink.team.serviceImpl.InvitationServiceImpl;

@ExtendWith(MockitoExtension.class)
class SendInvitationTest {

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private InvitationMapper invitationMapper;

    @Mock
    private TeamEventPublisher eventPublisher;

    @InjectMocks
    private InvitationServiceImpl invitationService;

    private InvitationRequestDto requestDto;
    private Invitation invitation;
    private InvitationResponseDto responseDto;

    @BeforeEach
    void setUp() {
        requestDto = new InvitationRequestDto();
        requestDto.setStartupId(101L);
        requestDto.setInvitedUserId(202L);
        requestDto.setRole(TeamRole.CTO);

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

    // SUCCESS

    @Test
    void sendInvitation_Success() {

        // Arrange
        when(invitationRepository
                .existsByStartupIdAndInvitedUserIdAndStatus(
                        101L, 202L, InvitationStatus.PENDING))
                .thenReturn(false);
        when(invitationRepository
                .existsByStartupIdAndRoleAndStatus(
                        101L, TeamRole.CTO, InvitationStatus.PENDING))
                .thenReturn(false);
        when(invitationMapper.toEntity(requestDto, 5L))
                .thenReturn(invitation);
        when(invitationRepository.save(any(Invitation.class)))
                .thenReturn(invitation);
        when(invitationMapper.toResponseDto(invitation))
                .thenReturn(responseDto);

        // Act
        InvitationResponseDto result = invitationService
                .sendInvitation(5L, requestDto);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getStartupId()).isEqualTo(101L);
        assertThat(result.getFounderId()).isEqualTo(5L);
        assertThat(result.getInvitedUserId()).isEqualTo(202L);
        assertThat(result.getRole()).isEqualTo(TeamRole.CTO);
        assertThat(result.getStatus())
                .isEqualTo(InvitationStatus.PENDING);

        // Verify
        verify(invitationRepository, times(1))
                .save(any(Invitation.class));
        verify(eventPublisher, times(1))
                .publishTeamInviteEvent(any(TeamInviteEvent.class));
    }

    // FOUNDER INVITING THEMSELVES
    
    @Test
    void sendInvitation_FounderInvitingThemselves_ThrowsException() {

        // requestDto invitedUserId same as founderId
        requestDto.setInvitedUserId(5L);

        // Act & Assert
        assertThatThrownBy(() ->
                invitationService.sendInvitation(5L, requestDto))
                .isInstanceOf(UnauthorizedAccessException.class)
                .hasMessage(
                        "You cannot invite yourself to your startup");

        // Verify save never called
        verify(invitationRepository, never())
                .save(any(Invitation.class));
        verify(eventPublisher, never())
                .publishTeamInviteEvent(any());
    }

    // DUPLICATE INVITATION
    
    @Test
    void sendInvitation_DuplicateInvitation_ThrowsException() {

        // Arrange
        when(invitationRepository
                .existsByStartupIdAndInvitedUserIdAndStatus(
                        101L, 202L, InvitationStatus.PENDING))
                .thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() ->
                invitationService.sendInvitation(5L, requestDto))
                .isInstanceOf(DuplicateInvitationException.class)
                .hasMessage(
                        "User already has a pending invitation " +
                        "for this startup");

        verify(invitationRepository, never())
                .save(any(Invitation.class));
        verify(eventPublisher, never())
                .publishTeamInviteEvent(any());
    }

    // DUPLICATE ROLE INVITATION
    
    @Test
    void sendInvitation_DuplicateRoleInvitation_ThrowsException() {

        // Arrange
        when(invitationRepository
                .existsByStartupIdAndInvitedUserIdAndStatus(
                        101L, 202L, InvitationStatus.PENDING))
                .thenReturn(false);
        when(invitationRepository
                .existsByStartupIdAndRoleAndStatus(
                        101L, TeamRole.CTO, InvitationStatus.PENDING))
                .thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() ->
                invitationService.sendInvitation(5L, requestDto))
                .isInstanceOf(DuplicateInvitationException.class)
                .hasMessage(
                        "This role already has a pending invitation");

        verify(invitationRepository, never())
                .save(any(Invitation.class));
        verify(eventPublisher, never())
                .publishTeamInviteEvent(any());
    }
}