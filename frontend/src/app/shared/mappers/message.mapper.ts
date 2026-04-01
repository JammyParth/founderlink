import { Message } from '../models/message.model';
import { MessageDto } from '../models/message.dto';
import { DateAdapter } from '../utils/date.adapter';
import { Mapper } from './base.mapper';

export class MessageMapper implements Mapper<Message, MessageDto> {
  toDomain(dto: MessageDto): Message {
    return {
      id: dto.id,
      senderId: dto.senderId,
      receiverId: dto.receiverId,
      content: dto.content,
      createdAt: DateAdapter.fromServer(dto.createdAt)
    };
  }
}

export const messageMapper = new MessageMapper();
