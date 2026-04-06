package com.founderlink.notification.command;

import com.founderlink.notification.dto.NotificationResponseDTO;
import com.founderlink.notification.entity.Notification;
import com.founderlink.notification.exception.NotificationNotFoundException;
import com.founderlink.notification.repository.NotificationRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationCommandService {

    private static final Logger log = LoggerFactory.getLogger(NotificationCommandService.class);

    private final NotificationRepository notificationRepository;

    public NotificationCommandService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /**
     * COMMAND: Create a new notification.
     * Evicts notificationsByUser and unreadNotifications caches for that user.
     */
    @CircuitBreaker(name = "notificationService", fallbackMethod = "createNotificationFallback")
    @Retry(name = "notificationService")
    @Caching(evict = {
        @CacheEvict(value = "notificationsByUser",    key = "#userId"),
        @CacheEvict(value = "unreadNotifications",    key = "#userId")
    })
    public NotificationResponseDTO createNotification(Long userId, String type, String message) {
        log.info("COMMAND - createNotification: userId={}, type={}", userId, type);
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setMessage(message);
        return mapToDTO(notificationRepository.save(notification));
    }

    public NotificationResponseDTO createNotificationFallback(Long userId, String type, String message, Throwable throwable) {
        log.error("Fallback - createNotification. User: {}, Type: {}, Reason: {}", userId, type, throwable.getMessage());
        return NotificationResponseDTO.builder()
                .userId(userId).type(type).message(message).read(false).build();
    }

    /**
     * COMMAND: Mark a notification as read.
     * Evicts notificationsByUser and unreadNotifications caches for that user.
     */
    @CircuitBreaker(name = "notificationService", fallbackMethod = "markAsReadFallback")
    @Retry(name = "notificationService")
    @Caching(evict = {
        @CacheEvict(value = "notificationsByUser", allEntries = true),
        @CacheEvict(value = "unreadNotifications", allEntries = true)
    })
    public NotificationResponseDTO markAsRead(Long id) {
        log.info("COMMAND - markAsRead: notificationId={}", id);
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new NotificationNotFoundException(id));
        notification.setRead(true);
        return mapToDTO(notificationRepository.save(notification));
    }

    @CircuitBreaker(name = "notificationService", fallbackMethod = "markAsReadForUserFallback")
    @Retry(name = "notificationService")
    @Caching(evict = {
        @CacheEvict(value = "notificationsByUser", allEntries = true),
        @CacheEvict(value = "unreadNotifications", allEntries = true)
    })
    public NotificationResponseDTO markAsReadForUser(Long id, Long requesterUserId) {
        log.info("COMMAND - markAsReadForUser: notificationId={}, requesterUserId={}", id, requesterUserId);
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new NotificationNotFoundException(id));

        if (!notification.getUserId().equals(requesterUserId)) {
            log.warn(
                    "Forbidden mark-as-read request. token.userId={}, notificationId={}, notification.userId={}",
                    requesterUserId,
                    id,
                    notification.getUserId()
            );
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You are not allowed to modify this notification."
            );
        }

        notification.setRead(true);
        return mapToDTO(notificationRepository.save(notification));
    }

    public NotificationResponseDTO markAsReadFallback(Long id, Throwable throwable) {
        log.error("Fallback - markAsRead. Notification ID: {}, Reason: {}", id, throwable.getMessage());
        if (throwable instanceof NotificationNotFoundException) {
            throw (NotificationNotFoundException) throwable;
        }
        return NotificationResponseDTO.builder().id(id).read(true).build();
    }

    public NotificationResponseDTO markAsReadForUserFallback(Long id, Long requesterUserId, Throwable throwable) {
        log.error(
                "Fallback - markAsReadForUser. Notification ID: {}, Requester: {}, Reason: {}",
                id,
                requesterUserId,
                throwable.getMessage()
        );
        if (throwable instanceof NotificationNotFoundException) {
            throw (NotificationNotFoundException) throwable;
        }
        if (throwable instanceof ResponseStatusException responseStatusException) {
            throw responseStatusException;
        }
        return NotificationResponseDTO.builder().id(id).userId(requesterUserId).read(true).build();
    }

    private NotificationResponseDTO mapToDTO(Notification notification) {
        return NotificationResponseDTO.builder()
                .id(notification.getId())
                .userId(notification.getUserId())
                .type(notification.getType())
                .message(notification.getMessage())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
