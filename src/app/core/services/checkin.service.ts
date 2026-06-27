import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Checkin } from '../models';

@Injectable({ providedIn: 'root' })
export class CheckinService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/checkin`;

  list(from?: Date, to?: Date): Observable<Checkin[]> {
    const params: Record<string, string> = {};
    if (from) params['from'] = from.toISOString().slice(0, 10);
    if (to) params['to'] = to.toISOString().slice(0, 10);
    return this.http.get<Checkin[]>(this.base, { params, withCredentials: true });
  }

  listForStudent(studentId: string): Observable<Checkin[]> {
    return this.http.get<Checkin[]>(this.base, {
      params: { studentId },
      withCredentials: true,
    });
  }

  create(
    payload: Pick<Checkin, 'data' | 'programaTreinoId' | 'grupoLetra' | 'notas' | 'cargas'>,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, payload, { withCredentials: true });
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`, { withCredentials: true });
  }
}
