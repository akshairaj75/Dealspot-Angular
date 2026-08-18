import { Component, inject, OnInit, signal, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FlyerService } from '../../../core/services/flyer.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-flyer-viewer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './flyer-viewer.component.html',
  styleUrls: ['./flyer-viewer.component.css']
})
export class FlyerViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private flyerService = inject(FlyerService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  flyer = signal<any | null>(null);
  pages = signal<any[]>([]);
  currentPageIndex = signal<number>(0);
  
  loading = true;
  hasError = false;
  zoomMode = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);
  copied = signal<boolean>(false);

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') {
      if (this.currentLang() === 'ar') {
        this.prevPage();
      } else {
        this.nextPage();
      }
    } else if (event.key === 'ArrowLeft') {
      if (this.currentLang() === 'ar') {
        this.nextPage();
      } else {
        this.prevPage();
      }
    } else if (event.key === 'Escape') {
      if (this.isFullscreen()) {
        this.toggleFullscreen();
      }
    }
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) {
        this.loadFlyer(id);
      } else {
        this.loading = false;
        this.hasError = true;
        this.cd.detectChanges();
      }
    });
  }

  loadFlyer(id: number): void {
    this.loading = true;
    this.hasError = false;
    this.flyerService.getFlyerById(id).subscribe({
      next: (data) => {
        if (!data) {
          this.loading = false;
          this.hasError = true;
          this.cd.detectChanges();
          return;
        }
        this.flyer.set(data);
        const flyerPages = (data.pages && data.pages.length > 0) 
          ? data.pages 
          : (data.coverImageUrl || data.cover_image_url) 
            ? [{ id: 1, pageNumber: 1, imageUrl: data.coverImageUrl || data.cover_image_url, thumbUrl: data.coverImageUrl || data.cover_image_url }]
            : [];
        this.pages.set(flyerPages);
        this.currentPageIndex.set(0);
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load flyer:', err);
        this.loading = false;
        this.hasError = true;
        this.cd.detectChanges();
      }
    });
  }

  getCurrentPage(): any | undefined {
    return this.pages()[this.currentPageIndex()];
  }

  nextPage(): void {
    if (this.currentPageIndex() < this.pages().length - 1) {
      this.currentPageIndex.update(idx => idx + 1);
    }
  }

  prevPage(): void {
    if (this.currentPageIndex() > 0) {
      this.currentPageIndex.update(idx => idx - 1);
    }
  }

  jumpToPage(index: number): void {
    if (index >= 0 && index < this.pages().length) {
      this.currentPageIndex.set(index);
    }
  }

  toggleZoom(): void {
    this.zoomMode.update(z => !z);
  }

  toggleFullscreen(): void {
    const elem = document.getElementById('flyer-book-viewer');
    if (!document.fullscreenElement) {
      if (elem?.requestFullscreen) {
        elem.requestFullscreen();
        this.isFullscreen.set(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        this.isFullscreen.set(false);
      }
    }
  }

  shareFlyer(): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      this.copied.set(true);
      setTimeout(() => {
        this.copied.set(false);
        this.cd.detectChanges();
      }, 2500);
    }
  }

  getImageUrl(url: string | null | undefined, fallback: string = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80'): string {
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }

  getPdfUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return this.filePath + url;
  }
}
