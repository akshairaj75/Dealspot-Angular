import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FlyerService } from '../../../core/services/flyer.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-flyer-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './flyer-list.component.html',
  styleUrls: ['./flyer-list.component.css']
})
export class FlyerListComponent implements OnInit {
  private flyerService = inject(FlyerService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  flyers = signal<any[]>([]);
  searchQuery = '';
  loading = false;

  ngOnInit(): void {
    this.loadFlyers();
  }

  loadFlyers(): void {
    this.loading = true;
    this.flyerService.getAllFlyers().subscribe({
      next: (res) => {
        this.flyers.set(res || []);
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load flyers:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  getFilteredFlyers(): any[] {
    let list = this.flyers();

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(f => {
        const titleEn = (f.titleEn || f.title_en || '').toLowerCase();
        const titleAr = (f.titleAr || f.title_ar || '').toLowerCase();
        const storeNameEn = (f.storeNameEn || f.store?.nameEn || f.store?.name_en || '').toLowerCase();
        const storeNameAr = (f.storeNameAr || f.store?.nameAr || f.store?.name_ar || '').toLowerCase();
        return titleEn.includes(q) || titleAr.includes(q) || storeNameEn.includes(q) || storeNameAr.includes(q);
      });
    }

    return list;
  }

  getImageUrl(url: string | null | undefined, fallback: string = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&auto=format&fit=crop&q=60'): string {
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }

  getLogoUrl(url: string | null | undefined): string {
    if (!url) return 'https://placehold.co/80x80?text=Logo';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }
}
