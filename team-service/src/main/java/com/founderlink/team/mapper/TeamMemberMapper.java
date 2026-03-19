package com.founderlink.team.mapper;

import com.founderlink.team.dto.response.TeamMemberResponseDto;
import com.founderlink.team.entity.TeamMember;
import org.springframework.stereotype.Component;

@Component
public class TeamMemberMapper {

    // ─────────────────────────────────────────
    // Entity → ResponseDto
    // ─────────────────────────────────────────
    public TeamMemberResponseDto toResponseDto(TeamMember teamMember) {
        TeamMemberResponseDto responseDto = new TeamMemberResponseDto();
        responseDto.setId(teamMember.getId());
        responseDto.setStartupId(teamMember.getStartupId());
        responseDto.setUserId(teamMember.getUserId());
        responseDto.setRole(teamMember.getRole());
        responseDto.setJoinedAt(teamMember.getJoinedAt());
        return responseDto;
    }
}