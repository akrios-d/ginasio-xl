import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Anamnesis } from '../models';

type SavePayload = Omit<Anamnesis, '_id' | 'userId' | 'createdAt' | 'updatedAt'>;

@Injectable({ providedIn: 'root' })
export class AnamnesisService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/anamnesis`;

  get(): Observable<Anamnesis | null> {
    return this.http.get<Anamnesis | null>(this.base, { withCredentials: true });
  }

  getForStudent(userId: string): Observable<Anamnesis | null> {
    return this.http.get<Anamnesis | null>(`${this.base}?userId=${encodeURIComponent(userId)}`, {
      withCredentials: true,
    });
  }

  save(payload: SavePayload): Observable<{ saved: boolean }> {
    return this.http.put<{ saved: boolean }>(this.base, payload, { withCredentials: true });
  }
}
