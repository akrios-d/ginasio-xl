import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Perfil } from '../models';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/perfil`;

  get(): Observable<Perfil> {
    return this.http.get<Perfil>(this.base, { withCredentials: true });
  }

  save(payload: Pick<Perfil, 'nome' | 'numeroAluno'>): Observable<{ saved: boolean }> {
    return this.http.put<{ saved: boolean }>(this.base, payload, { withCredentials: true });
  }
}
