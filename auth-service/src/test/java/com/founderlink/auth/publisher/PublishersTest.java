package com.founderlink.auth.publisher;

import com.founderlink.auth.config.RabbitMQConfig;
import com.founderlink.auth.dto.PasswordResetEmailEvent;
import com.founderlink.auth.dto.UserRegisteredEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublishersTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private UserRegisteredEventPublisher userRegisteredEventPublisher;

    @InjectMocks
    private PasswordResetEventPublisher passwordResetEventPublisher;

    // ─── UserRegisteredEventPublisher ──────────────────────────────────────────

    @Test
    void publishUserRegisteredEventShouldSendToCorrectExchangeAndRoutingKey() {
        UserRegisteredEvent event = UserRegisteredEvent.builder()
                .userId(1L)
                .email("alice@founderlink.com")
                .name("Alice")
                .role("FOUNDER")
                .build();

        userRegisteredEventPublisher.publishUserRegisteredEvent(event);

        verify(rabbitTemplate).convertAndSend(
                RabbitMQConfig.FOUNDERLINK_EXCHANGE,
                RabbitMQConfig.USER_REGISTERED_ROUTING_KEY,
                event
        );
    }

    @Test
    void publishUserRegisteredEventShouldSwallowExceptionOnFailure() {
        UserRegisteredEvent event = UserRegisteredEvent.builder()
                .userId(2L)
                .email("bob@founderlink.com")
                .name("Bob")
                .role("INVESTOR")
                .build();

        doThrow(new RuntimeException("RabbitMQ unavailable"))
                .when(rabbitTemplate).convertAndSend(any(String.class), any(String.class), any(Object.class));

        // Exception is swallowed — registration should not be disrupted
        userRegisteredEventPublisher.publishUserRegisteredEvent(event);
    }

    // ─── PasswordResetEventPublisher ──────────────────────────────────────────

    @Test
    void publishPasswordResetEventShouldSendToCorrectExchangeAndRoutingKey() {
        PasswordResetEmailEvent event = PasswordResetEmailEvent.builder()
                .email("charlie@founderlink.com")
                .pin("123456")
                .userName("Charlie")
                .build();

        passwordResetEventPublisher.publishPasswordResetEvent(event);

        verify(rabbitTemplate).convertAndSend(
                RabbitMQConfig.FOUNDERLINK_EXCHANGE,
                RabbitMQConfig.PASSWORD_RESET_ROUTING_KEY,
                event
        );
    }

    @Test
    void publishPasswordResetEventShouldThrowIllegalStateOnFailure() {
        PasswordResetEmailEvent event = PasswordResetEmailEvent.builder()
                .email("dan@founderlink.com")
                .pin("654321")
                .userName("Dan")
                .build();

        doThrow(new RuntimeException("RabbitMQ unavailable"))
                .when(rabbitTemplate).convertAndSend(any(String.class), any(String.class), any(Object.class));

        assertThrows(
                IllegalStateException.class,
                () -> passwordResetEventPublisher.publishPasswordResetEvent(event)
        );
    }
}
