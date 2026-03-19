package com.founderlink.team.dto.request;

import com.founderlink.team.entity.TeamRole;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvitationRequestDto {

    @NotNull(message = "Startup ID is required")
    private Long startupId;

    @NotNull(message = "Invited user ID is required")
    private Long invitedUserId;

    @NotNull(message = "Role is required")
    private TeamRole role;
}