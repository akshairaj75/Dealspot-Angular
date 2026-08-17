import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
// import { AdminService } from '../../../core/services/admin.service';
// import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
// import { AuditLog } from '../../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  // private adminService = inject(AdminService);
  
  stats = signal<any>(null);
  // recentLogs = signal<AuditLog[]>([]);
  loading = false;

  ngOnInit(): void {
    // this.adminService.getDashboardStats().subscribe(res => this.stats.set(res));
    // this.adminService.getAuditLogs().subscribe({
    //   next: (logs) => {
    //     this.recentLogs.set(logs.slice(0, 5));
    //     this.loading = false;
    //   },
    //   error: () => {
    //     this.loading = false;
    //   }
    // });
  }

  
}
