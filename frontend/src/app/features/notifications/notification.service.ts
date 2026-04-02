import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/http/api-client.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppNotification } from '../../shared/models/notification.model';
import { AppNotificationDto } from '../../shared/models/notification.dto';
import { notificationMapper } from '../../shared/mappers/notification.mapper';
import { ApiEnvelope } from '../../shared/models/api-envelope.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiClient = inject(ApiClientService);
  private readonly baseUrl = '/notifications';

  private mapNotification(envelope: ApiEnvelope<AppNotificationDto>): ApiEnvelope<AppNotification> {
    if (envelope.success && envelope.data) return { ...envelope, data: notificationMapper.toDomain(envelope.data) };
    return envelope as unknown as ApiEnvelope<AppNotification>;
  }

  private mapNotificationList(envelope: ApiEnvelope<AppNotificationDto[]>): ApiEnvelope<AppNotification[]> {
    if (envelope.success && envelope.data) return { ...envelope, data: envelope.data.map(d => notificationMapper.toDomain(d)) };
    return envelope as unknown as ApiEnvelope<AppNotification[]>;
  }

  getNotifications(userId: number): Observable<ApiEnvelope<AppNotification[]>> {
    return this.apiClient.get<AppNotificationDto[]>(`${this.baseUrl}/${userId}`).pipe(map(e => this.mapNotificationList(e)));
  }

  getUnreadNotifications(userId: number): Observable<ApiEnvelope<AppNotification[]>> {
    return this.apiClient.get<AppNotificationDto[]>(`${this.baseUrl}/${userId}/unread`).pipe(map(e => this.mapNotificationList(e)));
  }

  markAsRead(notificationId: number): Observable<ApiEnvelope<AppNotification>> {
    return this.apiClient.put<AppNotificationDto>(`${this.baseUrl}/${notificationId}/read`, null).pipe(map(e => this.mapNotification(e)));
  }
}
