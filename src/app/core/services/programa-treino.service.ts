import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ProgramaTreino } from '../models';

@Injectable({ providedIn: 'root' })
export class ProgramaTreinoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/programa-treino`;

  list(alunoId?: string): Observable<ProgramaTreino[]> {
    const params = alunoId ? { alunoId } : {};
    return this.http.get<ProgramaTreino[]>(this.base, { params, withCredentials: true });
  }

  get(id: string): Observable<ProgramaTreino> {
    return this.http.get<ProgramaTreino>(`${this.base}/${id}`, { withCredentials: true });
  }

  create(
    payload: Omit<ProgramaTreino, '_id' | 'criadoPorId' | 'ativo' | 'createdAt' | 'updatedAt'>,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, payload, { withCredentials: true });
  }

  update(id: string, payload: Partial<ProgramaTreino>): Observable<{ updated: boolean }> {
    return this.http.put<{ updated: boolean }>(`${this.base}/${id}`, payload, {
      withCredentials: true,
    });
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`, { withCredentials: true });
  }
}
