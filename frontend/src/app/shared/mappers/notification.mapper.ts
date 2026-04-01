import { AppNotification } from '../models/notification.model';
import { AppNotificationDto } from '../models/notification.dto';
import { DateAdapter } from '../utils/date.adapter';
import { Mapper } from './base.mapper';

export class NotificationMapper implements Mapper<AppNotification, AppNotificationDto> {
  toDomain(dto: AppNotificationDto): AppNotification {
    return {
      id: dto.id,
      userId: dto.userId,
      type: dto.type,
      message: dto.message,
      read: dto.read,
      createdAt: DateAdapter.fromServer(dto.createdAt)
    };
  }
}

export const notificationMapper = new NotificationMapper();
