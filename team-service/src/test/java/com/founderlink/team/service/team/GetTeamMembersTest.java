package com.founderlink.team.service.team;

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

import com.founderlink.team.dto.response.TeamMemberResponseDto;
import com.founderlink.team.entity.TeamMember;
import com.founderlink.team.entity.TeamRole;
import com.founderlink.team.mapper.TeamMemberMapper;
import com.founderlink.team.repository.InvitationRepository;
import com.founderlink.team.repository.TeamMemberRepository;
import com.founderlink.team.serviceImpl.TeamMemberServiceImpl;

@ExtendWith(MockitoExtension.class)
class GetTeamMembersTest {

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private TeamMemberMapper teamMemberMapper;

    @InjectMocks
    private TeamMemberServiceImpl teamMemberService;

    private TeamMember teamMember1;
    private TeamMember teamMember2;
    private TeamMemberResponseDto responseDto1;
    private TeamMemberResponseDto responseDto2;

    @BeforeEach
    void setUp() {
        teamMember1 = new TeamMember();
        teamMember1.setId(1L);
        teamMember1.setStartupId(101L);
        teamMember1.setUserId(202L);
        teamMember1.setRole(TeamRole.CTO);
        teamMember1.setJoinedAt(LocalDateTime.now());

        teamMember2 = new TeamMember();
        teamMember2.setId(2L);
        teamMember2.setStartupId(101L);
        teamMember2.setUserId(303L);
        teamMember2.setRole(TeamRole.CPO);
        teamMember2.setJoinedAt(LocalDateTime.now());

        responseDto1 = new TeamMemberResponseDto();
        responseDto1.setId(1L);
        responseDto1.setStartupId(101L);
        responseDto1.setUserId(202L);
        responseDto1.setRole(TeamRole.CTO);
        responseDto1.setJoinedAt(LocalDateTime.now());

        responseDto2 = new TeamMemberResponseDto();
        responseDto2.setId(2L);
        responseDto2.setStartupId(101L);
        responseDto2.setUserId(303L);
        responseDto2.setRole(TeamRole.CPO);
        responseDto2.setJoinedAt(LocalDateTime.now());
    }
    
    // SUCCESS — MULTIPLE MEMBERS
    
    @Test
    void getTeamByStartupId_Success() {

        // Arrange
        when(teamMemberRepository.findByStartupId(101L))
                .thenReturn(List.of(teamMember1, teamMember2));
        when(teamMemberMapper.toResponseDto(teamMember1))
                .thenReturn(responseDto1);
        when(teamMemberMapper.toResponseDto(teamMember2))
                .thenReturn(responseDto2);

        // Act
        List<TeamMemberResponseDto> result = teamMemberService
                .getTeamByStartupId(101L);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getRole())
                .isEqualTo(TeamRole.CTO);
        assertThat(result.get(1).getRole())
                .isEqualTo(TeamRole.CPO);
    }

    // EMPTY TEAM
    
    @Test
    void getTeamByStartupId_EmptyTeam_ReturnsEmptyList() {

        // Arrange
        when(teamMemberRepository.findByStartupId(101L))
                .thenReturn(List.of());

        // Act
        List<TeamMemberResponseDto> result = teamMemberService
                .getTeamByStartupId(101L);

        // Assert
        assertThat(result).isEmpty();
    }


    // SINGLE MEMBER
    
    @Test
    void getTeamByStartupId_SingleMember_ReturnsList() {

        // Arrange
        when(teamMemberRepository.findByStartupId(101L))
                .thenReturn(List.of(teamMember1));
        when(teamMemberMapper.toResponseDto(teamMember1))
                .thenReturn(responseDto1);

        // Act
        List<TeamMemberResponseDto> result = teamMemberService
                .getTeamByStartupId(101L);

        // Assert
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUserId()).isEqualTo(202L);
        assertThat(result.get(0).getRole())
                .isEqualTo(TeamRole.CTO);
    }
}