package com.founderlink.team.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // CONSTANTS
 
    public static final String TEAM_QUEUE       = "team.queue";
    public static final String TEAM_EXCHANGE    = "team.exchange";
    public static final String TEAM_ROUTING_KEY = "team.invite.sent";

    // QUEUE
    
    @Bean
    public Queue teamQueue() {
        return new Queue(TEAM_QUEUE, true);
    }

    // EXCHANGE

    @Bean
    public DirectExchange teamExchange() {
        return new DirectExchange(TEAM_EXCHANGE);
    }

    // BINDING
    
    @Bean
    public Binding teamBinding() {
        return BindingBuilder
                .bind(teamQueue())
                .to(teamExchange())
                .with(TEAM_ROUTING_KEY);
    }
    
    // MESSAGE CONVERTER
    // converts Java object → JSON automatically
    
    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    // RABBIT TEMPLATE
    
    @Bean
    public RabbitTemplate rabbitTemplate(
            ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate =
                new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(messageConverter());
        return rabbitTemplate;
    }
}