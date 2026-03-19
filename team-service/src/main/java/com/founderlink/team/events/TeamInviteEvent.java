package com.founderlink.team.events;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamInviteEvent {

    private Long startupId;
    private Long invitedUserId;
    private String role;
}