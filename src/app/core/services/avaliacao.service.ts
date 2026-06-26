import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { FichaAvaliacao, EntradaAvaliacao } from '../models';

@Injectable({ providedIn: 'root' })
export class AvaliacaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/avaliacao`;

  list(studentId?: string): Observable<FichaAvaliacao[]> {
    const params: Record<string, string> | undefined = studentId ? { studentId } : undefined;
    return this.http.get<FichaAvaliacao[]>(this.base, { params, withCredentials: true });
  }

  get(id: string): Observable<FichaAvaliacao> {
    return this.http.get<FichaAvaliacao>(`${this.base}/${id}`, { withCredentials: true });
  }

  create(
    payload: Omit<FichaAvaliacao, '_id' | 'createdById' | 'createdAt' | 'updatedAt'>,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, payload, { withCredentials: true });
  }

  update(
    id: string,
    payload: Partial<
      Pick<FichaAvaliacao, 'objetivo' | 'outrosObjetivos' | 'metas' | 'sharedWithTeacherIds'>
    >,
  ): Observable<{ updated: boolean }> {
    return this.http.put<{ updated: boolean }>(`${this.base}/${id}`, payload, {
      withCredentials: true,
    });
  }

  /** Update just the sharedWithTeacherIds for an assessment */
  share(id: string, teacherIds: string[]): Observable<{ updated: boolean }> {
    return this.update(id, { sharedWithTeacherIds: teacherIds });
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`, { withCredentials: true });
  }

  addEntrada(fichaId: string, entrada: EntradaAvaliacao): Observable<{ added: boolean }> {
    return this.http.post<{ added: boolean }>(`${this.base}/${fichaId}/entrada`, entrada, {
      withCredentials: true,
    });
  }
}
