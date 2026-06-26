import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Perfil, TeacherProfile } from '../models';

export interface TeacherInfo {
  _id: string;
  userId: string;
  name: string;
  email: string;
  teacherProfile?: TeacherProfile;
}

export interface StudentInfo {
  _id: string;
  userId: string;
  name?: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/perfil`;
  private readonly baseMulti = `${environment.apiUrl}/api/perfis`;

  get(): Observable<Perfil> {
    return this.http.get<Perfil>(this.base, { withCredentials: true });
  }

  save(payload: { teacherIds: string[] }): Observable<{ saved: boolean }> {
    return this.http.put<{ saved: boolean }>(this.base, payload, { withCredentials: true });
  }

  listTeachers(): Observable<TeacherInfo[]> {
    return this.http.get<TeacherInfo[]>(`${this.baseMulti}?role=teacher`, {
      withCredentials: true,
    });
  }

  listStudents(): Observable<StudentInfo[]> {
    return this.http.get<StudentInfo[]>(`${this.baseMulti}?role=student`, {
      withCredentials: true,
    });
  }
}
