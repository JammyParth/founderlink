package com.founderlink.investment.events;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import com.founderlink.investment.config.RabbitMQConfig;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class InvestmentEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishInvestmentCreatedEvent(InvestmentCreatedEvent event) {
    	
    	try {

	        log.info("Publishing INVESTMENT_CREATED event for startupId: {}",
	                event.getStartupId());
	
	        rabbitTemplate.convertAndSend(
	                RabbitMQConfig.INVESTMENT_EXCHANGE,
	                RabbitMQConfig.INVESTMENT_ROUTING_KEY,
	                event
	        );
	
	        log.info("INVESTMENT_CREATED event published successfully");
        
    	}
    	catch (Exception e) {
            log.error("Failed to publish event: {}", e.getMessage());
        }
    	
    }
}