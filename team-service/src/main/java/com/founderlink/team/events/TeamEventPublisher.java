package com.founderlink.team.events;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import com.founderlink.team.config.RabbitMQConfig;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class TeamEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishTeamInviteEvent(TeamInviteEvent event) {
        try {
            log.info("Publishing TEAM_INVITE_SENT event " +
                            "for startupId: {} invitedUserId: {}",
                    event.getStartupId(),
                    event.getInvitedUserId());

            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.TEAM_EXCHANGE,
                    RabbitMQConfig.TEAM_ROUTING_KEY,
                    event
            );

            log.info("TEAM_INVITE_SENT event " +
                    "published successfully");

        } catch (Exception e) {
        	
        	//Service Continues if the server is down.
        	
            log.error("Failed to publish " +
                    "TEAM_INVITE_SENT event: {}",
                    e.getMessage());
        }
    }
}