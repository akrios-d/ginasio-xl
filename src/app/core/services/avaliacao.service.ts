import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { FichaAvaliacao, EntradaAvaliacao } from '../models';

@Injectable({ providedIn: 'root' })
export class AvaliacaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/avaliacao`;

  list(alunoId?: string): Observable<FichaAvaliacao[]> {
    const params = alunoId ? { alunoId } : {};
    return this.http.get<FichaAvaliacao[]>(this.base, { params, withCredentials: true });
  }

  get(id: string): Observable<FichaAvaliacao> {
    return this.http.get<FichaAvaliacao>(`${this.base}/${id}`, { withCredentials: true });
  }

  create(
    payload: Omit<FichaAvaliacao, '_id' | 'criadoPorId' | 'createdAt' | 'updatedAt'>,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, payload, { withCredentials: true });
  }

  update(id: string, payload: Partial<FichaAvaliacao>): Observable<{ updated: boolean }> {
    return this.http.put<{ updated: boolean }>(`${this.base}/${id}`, payload, {
      withCredentials: true,
    });
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`, { withCredentials: true });
  }

  /** Adiciona uma nova medição a uma ficha existente */
  addEntrada(fichaId: string, entrada: EntradaAvaliacao): Observable<{ added: boolean }> {
    return this.http.post<{ added: boolean }>(`${this.base}/${fichaId}/entrada`, entrada, {
      withCredentials: true,
    });
  }
}
