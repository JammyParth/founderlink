package com.founderlink.team.service.team;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.founderlink.team.entity.TeamMember;
import com.founderlink.team.entity.TeamRole;
import com.founderlink.team.exception.TeamMemberNotFoundException;
import com.founderlink.team.exception.UnauthorizedAccessException;
import com.founderlink.team.mapper.TeamMemberMapper;
import com.founderlink.team.repository.InvitationRepository;
import com.founderlink.team.repository.TeamMemberRepository;
import com.founderlink.team.serviceImpl.TeamMemberServiceImpl;

@ExtendWith(MockitoExtension.class)
class RemoveTeamMemberTest {

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private TeamMemberMapper teamMemberMapper;

    @InjectMocks
    private TeamMemberServiceImpl teamMemberService;

    private TeamMember teamMember;

    @BeforeEach
    void setUp() {
        teamMember = new TeamMember();
        teamMember.setId(1L);
        teamMember.setStartupId(101L);
        teamMember.setUserId(202L);
        teamMember.setRole(TeamRole.CTO);
        teamMember.setJoinedAt(LocalDateTime.now());
    }

    // SUCCESS

    @Test
    void removeTeamMember_Success() {

        // Arrange
        // founderId 5L is different from
        // teamMember userId 202L
        when(teamMemberRepository.findById(1L))
                .thenReturn(Optional.of(teamMember));

        // Act
        teamMemberService.removeTeamMember(1L, 5L);

        // Verify delete called
        verify(teamMemberRepository, times(1))
                .delete(teamMember);
    }

    // ─────────────────────────────────────────
    // MEMBER NOT FOUND
    // ─────────────────────────────────────────
    @Test
    void removeTeamMember_NotFound_ThrowsException() {

        // Arrange
        when(teamMemberRepository.findById(999L))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() ->
                teamMemberService.removeTeamMember(999L, 5L))
                .isInstanceOf(TeamMemberNotFoundException.class)
                .hasMessage(
                        "Team member not found with id: 999");

        verify(teamMemberRepository, never())
                .delete(any(TeamMember.class));
    }

    // ─────────────────────────────────────────
    // FOUNDER REMOVING THEMSELVES
    // ─────────────────────────────────────────
    @Test
    void removeTeamMember_FounderRemovingThemselves_ThrowsException() {

        // Arrange
        // teamMember userId 202L
        // founderId also 202L → same person
        teamMember.setUserId(202L);
        when(teamMemberRepository.findById(1L))
                .thenReturn(Optional.of(teamMember));

        // Act & Assert
        assertThatThrownBy(() ->
                teamMemberService.removeTeamMember(1L, 202L))
                .isInstanceOf(UnauthorizedAccessException.class)
                .hasMessage(
                        "Founder cannot remove themselves " +
                        "from the team");

        verify(teamMemberRepository, never())
                .delete(any(TeamMember.class));
    }

    // ─────────────────────────────────────────
    // VERIFY DELETE NOT CALLED ON EXCEPTION
    // ─────────────────────────────────────────
    @Test
    void removeTeamMember_Exception_DeleteNeverCalled() {

        // Arrange
        when(teamMemberRepository.findById(999L))
                .thenReturn(Optional.empty());

        // Act
        try {
            teamMemberService.removeTeamMember(999L, 5L);
        } catch (TeamMemberNotFoundException e) {
            // expected
        }

        // Verify delete never called
        verify(teamMemberRepository, never())
                .delete(any(TeamMember.class));
    }
}