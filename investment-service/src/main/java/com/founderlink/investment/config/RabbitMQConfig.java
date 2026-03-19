package com.founderlink.investment.config;

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

    public static final String INVESTMENT_QUEUE    = "investment.queue";
    public static final String INVESTMENT_EXCHANGE = "investment.exchange";
    public static final String INVESTMENT_ROUTING_KEY = "investment.created";

    @Bean
    public Queue investmentQueue() {
        return new Queue(INVESTMENT_QUEUE, true);
    }

   
    @Bean
    public DirectExchange investmentExchange() {
        return new DirectExchange(INVESTMENT_EXCHANGE);
    }

   
    @Bean
    public Binding investmentBinding() {
        return BindingBuilder
                .bind(investmentQueue())
                .to(investmentExchange())
                .with(INVESTMENT_ROUTING_KEY);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(messageConverter());
        return rabbitTemplate;
    }
}