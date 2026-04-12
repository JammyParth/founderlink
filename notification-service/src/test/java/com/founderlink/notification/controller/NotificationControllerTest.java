package com.founderlink.notification.controller;

import com.founderlink.notification.dto.NotificationResponseDTO;
import com.founderlink.notification.exception.GlobalExceptionHandler;
import com.founderlink.notification.exception.NotificationNotFoundException;
import com.founderlink.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {

    private MockMvc mockMvc;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private NotificationController notificationController;

    private NotificationResponseDTO dto1;
    private NotificationResponseDTO dto2;
    private NotificationResponseDTO unreadDto;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(notificationController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        dto1 = NotificationResponseDTO.builder()
                .id(1L).userId(100L).type("STARTUP_CREATED")
                .message("New startup").read(true)
                .createdAt(LocalDateTime.now().minusHours(2)).build();

        dto2 = NotificationResponseDTO.builder()
                .id(2L).userId(100L).type("INVESTMENT_CREATED")
                .message("New investment").read(true)
                .createdAt(LocalDateTime.now().minusHours(1)).build();

        unreadDto = NotificationResponseDTO.builder()
                .id(3L).userId(100L).type("TEAM_INVITE_SENT")
                .message("You have been invited").read(false)
                .createdAt(LocalDateTime.now()).build();
    }

    // --- GET /notifications/{userId} ---

    @Test
    @DisplayName("GET /notifications/{userId} - returns all notifications")
    void getNotifications_ReturnsAll() throws Exception {
        when(notificationService.getNotificationsByUser(100L))
                .thenReturn(Arrays.asList(unreadDto, dto2, dto1));

        mockMvc.perform(get("/notifications/100").header("X-User-Id", 100L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].type").value("TEAM_INVITE_SENT"))
                .andExpect(jsonPath("$[1].type").value("INVESTMENT_CREATED"));
    }

    @Test
    @DisplayName("GET /notifications/{userId} - returns empty for unknown user")
    void getNotifications_EmptyForUnknownUser() throws Exception {
        when(notificationService.getNotificationsByUser(999L)).thenReturn(List.of());

        mockMvc.perform(get("/notifications/999").header("X-User-Id", 999L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("GET /notifications/{userId} - forbidden when token userId mismatches path userId")
    void getNotifications_ForbiddenOnUserMismatch() throws Exception {
        mockMvc.perform(get("/notifications/100").header("X-User-Id", 999L))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Requested userId does not match authenticated user."));
    }

    // --- GET /notifications/{userId}/unread ---

    @Test
    @DisplayName("GET /notifications/{userId}/unread - returns only unread")
    void getUnreadNotifications_ReturnsUnread() throws Exception {
        when(notificationService.getUnreadNotifications(100L))
                .thenReturn(List.of(unreadDto));

        mockMvc.perform(get("/notifications/100/unread").header("X-User-Id", 100L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].read").value(false));
    }

    // --- PUT /notifications/{id}/read ---

    @Test
    @DisplayName("PUT /notifications/{id}/read - marks as read")
    void markAsRead_Success() throws Exception {
        NotificationResponseDTO readDto = NotificationResponseDTO.builder()
                .id(3L).userId(100L).type("TEAM_INVITE_SENT")
                .message("Invite").read(true)
                .createdAt(LocalDateTime.now()).build();

        when(notificationService.markAsReadForUser(3L, 100L)).thenReturn(readDto);

        mockMvc.perform(patch("/notifications/3/read").header("X-User-Id", 100L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.read").value(true));
    }

    @Test
    @DisplayName("PUT /notifications/{id}/read - not found returns 404")
    void markAsRead_NotFound_Returns404() throws Exception {
        when(notificationService.markAsReadForUser(999L, 100L))
                .thenThrow(new NotificationNotFoundException(999L));

        mockMvc.perform(put("/notifications/999/read").header("X-User-Id", 100L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Notification not found with id: 999"));
    }

    @Test
    @DisplayName("PATCH /notifications/{id}/read - forbidden when notification belongs to another user")
    void markAsRead_Forbidden_WhenOwnershipFails() throws Exception {
        when(notificationService.markAsReadForUser(3L, 999L))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to modify this notification."));

        mockMvc.perform(patch("/notifications/3/read").header("X-User-Id", 999L))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You are not allowed to modify this notification."));
    }
}
