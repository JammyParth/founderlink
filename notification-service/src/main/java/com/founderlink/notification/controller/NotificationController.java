package com.founderlink.notification.controller;

import com.founderlink.notification.dto.NotificationResponseDTO;
import com.founderlink.notification.service.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.servlet.http.HttpServletRequest;

@Slf4j
@RestController
@RequestMapping("/notifications")
@Tag(name = "Notifications", description = "Endpoints for managing notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/{userId}")
    @Operation(summary = "Get all notifications for a user", description = "Fetches all notifications for the specified user.")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Notifications fetched successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<List<NotificationResponseDTO>> getNotifications(
            @PathVariable Long userId,
            @RequestHeader("X-User-Id") Long authenticatedUserId
    ) {
        verifyOwnershipOrThrow("GET /notifications/{userId}", authenticatedUserId, userId);
        log.info("GET /notifications/{} - fetching all notifications", userId);
        return ResponseEntity.ok(notificationService.getNotificationsByUser(userId));
    }

    @GetMapping("/{userId}/unread")
    @Operation(summary = "Get unread notifications for a user", description = "Fetches all unread notifications for the specified user.")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Unread notifications fetched successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<List<NotificationResponseDTO>> getUnreadNotifications(
            @PathVariable Long userId,
            @RequestHeader("X-User-Id") Long authenticatedUserId
    ) {
        verifyOwnershipOrThrow("GET /notifications/{userId}/unread", authenticatedUserId, userId);
        log.info("GET /notifications/{}/unread - fetching unread notifications", userId);
        return ResponseEntity.ok(notificationService.getUnreadNotifications(userId));
    }

    @RequestMapping(value = "/{id}/read", method = {RequestMethod.PATCH, RequestMethod.PUT})
    @Operation(summary = "Mark notification as read", description = "Marks the specified notification as read.")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Notification marked as read successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Forbidden"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Notification not found")
    })
    public ResponseEntity<NotificationResponseDTO> markAsRead(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long authenticatedUserId,
            HttpServletRequest request
    ) {
        log.info(
                "{} /notifications/{}/read - token.userId={} marking as read",
                request.getMethod(),
                id,
                authenticatedUserId
        );
        return ResponseEntity.ok(notificationService.markAsReadForUser(id, authenticatedUserId));
    }

    private void verifyOwnershipOrThrow(String endpoint, Long tokenUserId, Long pathUserId) {
        log.info(
                "{} ownership check - token.userId={}, path.userId={}",
                endpoint,
                tokenUserId,
                pathUserId
        );
        if (!tokenUserId.equals(pathUserId)) {
            log.warn(
                    "{} forbidden - token.userId={} does not match path.userId={}",
                    endpoint,
                    tokenUserId,
                    pathUserId
            );
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Requested userId does not match authenticated user.");
        }
    }
}
