import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface PartnerRequestItem {
  id: number;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  storeNameEn: string;
  storeNameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  cityId: number;
  cityNameEn?: string;
  cityNameAr?: string;
  categoryId: number;
  categoryNameEn?: string;
  categoryNameAr?: string;
  crNumber?: string;
  vatNumber?: string;
  website?: string;
  logoUrl?: string;
  bannerUrl?: string;
  contactAddress?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdStoreId?: number;
  reviewedAt?: string;
  createdAt: string;
}

export interface PartnerApplyForm {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  storeNameEn: string;
  storeNameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  cityId: number;
  categoryId: number;
  crNumber?: string;
  vatNumber?: string;
  website?: string;
  logoUrl?: string;
  bannerUrl?: string;
  contactAddress?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PartnerRequestService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Public submission
  submitApplication(data: PartnerApplyForm): Observable<PartnerRequestItem> {
    return this.http.post<PartnerRequestItem>(`${this.apiUrl}/partner-requests/apply`, data);
  }

  // Admin listing
  getAllRequests(status?: string): Observable<PartnerRequestItem[]> {
    let url = `${this.apiUrl}/admin/partner-requests`;
    if (status && status !== 'ALL') {
      url += `?status=${status}`;
    }
    return this.http.get<PartnerRequestItem[]>(url);
  }

  // Admin get single request
  getRequestById(id: number): Observable<PartnerRequestItem> {
    return this.http.get<PartnerRequestItem>(`${this.apiUrl}/admin/partner-requests/${id}`);
  }

  // Admin Approve
  approveRequest(id: number): Observable<PartnerRequestItem> {
    return this.http.post<PartnerRequestItem>(`${this.apiUrl}/admin/partner-requests/${id}/approve`, {});
  }

  // Admin Reject
  rejectRequest(id: number, reason: string): Observable<PartnerRequestItem> {
    return this.http.post<PartnerRequestItem>(`${this.apiUrl}/admin/partner-requests/${id}/reject`, { reason });
  }
}
