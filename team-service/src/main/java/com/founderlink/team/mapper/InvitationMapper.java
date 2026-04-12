package com.founderlink.team.mapper;

import org.springframework.stereotype.Component;

import com.founderlink.team.dto.request.InvitationRequestDto;
import com.founderlink.team.dto.response.InvitationResponseDto;
import com.founderlink.team.entity.Invitation;

@Component
public class InvitationMapper {

    // ─────────────────────────────────────────
    // RequestDto + founderId → Entity
    // ─────────────────────────────────────────
    public Invitation toEntity(InvitationRequestDto requestDto,
                                Long founderId) {
        Invitation invitation = new Invitation();
        invitation.setStartupId(requestDto.getStartupId());
        invitation.setFounderId(founderId);
        invitation.setInvitedUserId(requestDto.getInvitedUserId());
        invitation.setRole(requestDto.getRole());
        return invitation;
    }

    // ─────────────────────────────────────────
    // Entity → ResponseDto
    // ─────────────────────────────────────────
    public InvitationResponseDto toResponseDto(Invitation invitation) {
        InvitationResponseDto responseDto = new InvitationResponseDto();
        responseDto.setId(invitation.getId());
        responseDto.setStartupId(invitation.getStartupId());
        responseDto.setFounderId(invitation.getFounderId());
        responseDto.setInvitedUserId(invitation.getInvitedUserId());
        responseDto.setRole(invitation.getRole());
        responseDto.setStatus(invitation.getStatus());
        responseDto.setCreatedAt(invitation.getCreatedAt());
        responseDto.setUpdatedAt(invitation.getUpdatedAt());
        return responseDto;
    }
}