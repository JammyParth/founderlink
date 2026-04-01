import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/http/api-client.service';
import { UserProfile, UserProfileDto, UserProfileUpdateDto } from '../../shared/models/user.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiEnvelope } from '../../shared/models/api-envelope.model';
import { parseUserRole } from '../../shared/models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiClient = inject(ApiClientService);

  private mapDtoToModel(dto: UserProfileDto): UserProfile {
    return {
      userId: dto.userId,
      name: dto.name,
      email: dto.email,
      role: parseUserRole(dto.role),
      skills: dto.skills,
      experience: dto.experience,
      bio: dto.bio,
      portfolioLinks: dto.portfolioLinks
    };
  }

  getUserById(id: number): Observable<ApiEnvelope<UserProfile>> {
    return this.apiClient.get<UserProfileDto>(`/users/${id}`).pipe(
      map(envelope => {
        if (envelope.success && envelope.data) {
          return { ...envelope, data: this.mapDtoToModel(envelope.data) };
        }
        return envelope as ApiEnvelope<any>;
      })
    );
  }

  updateUser(id: number, data: UserProfileUpdateDto): Observable<ApiEnvelope<UserProfile>> {
    return this.apiClient.put<UserProfileDto>(`/users/${id}`, data).pipe(
      map(envelope => {
        if (envelope.success && envelope.data) {
          return { ...envelope, data: this.mapDtoToModel(envelope.data) };
        }
        return envelope as ApiEnvelope<any>;
      })
    );
  }
}
