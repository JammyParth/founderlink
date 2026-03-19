package com.founderlink.team.dto.response;

import java.time.LocalDateTime;

import com.founderlink.team.entity.InvitationStatus;
import com.founderlink.team.entity.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvitationResponseDto {

    private Long id;
    private Long startupId;
    private Long founderId;
    private Long invitedUserId;
    private TeamRole role;
    private InvitationStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}