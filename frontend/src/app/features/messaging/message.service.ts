import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/http/api-client.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Message } from '../../shared/models/message.model';
import { MessageDto, MessageSendDto } from '../../shared/models/message.dto';
import { messageMapper } from '../../shared/mappers/message.mapper';
import { ApiEnvelope } from '../../shared/models/api-envelope.model';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiClient = inject(ApiClientService);
  private readonly baseUrl = '/messages';

  private mapMessage(envelope: ApiEnvelope<MessageDto>): ApiEnvelope<Message> {
    if (envelope.success && envelope.data) return { ...envelope, data: messageMapper.toDomain(envelope.data) };
    return envelope as unknown as ApiEnvelope<Message>;
  }

  private mapMessageList(envelope: ApiEnvelope<MessageDto[]>): ApiEnvelope<Message[]> {
    if (envelope.success && envelope.data) return { ...envelope, data: envelope.data.map(d => messageMapper.toDomain(d)) };
    return envelope as unknown as ApiEnvelope<Message[]>;
  }

  sendMessage(dto: MessageSendDto): Observable<ApiEnvelope<Message>> {
    return this.apiClient.post<MessageDto>(this.baseUrl, dto).pipe(map(e => this.mapMessage(e)));
  }

  getMessageById(id: number): Observable<ApiEnvelope<Message>> {
    return this.apiClient.get<MessageDto>(`${this.baseUrl}/${id}`).pipe(map(e => this.mapMessage(e)));
  }

  getConversation(user1Id: number, user2Id: number): Observable<ApiEnvelope<Message[]>> {
    return this.apiClient.get<MessageDto[]>(`${this.baseUrl}/conversation`, {
      params: { user1Id, user2Id }
    }).pipe(map(e => this.mapMessageList(e)));
  }

  getConversationPartners(userId: number): Observable<ApiEnvelope<number[]>> {
    return this.apiClient.get<number[]>(`${this.baseUrl}/partners/${userId}`);
  }
}
