package com.founderlink.team.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JoinTeamRequestDto {

    @NotNull(message = "Invitation ID is required")
    private Long invitationId;
}