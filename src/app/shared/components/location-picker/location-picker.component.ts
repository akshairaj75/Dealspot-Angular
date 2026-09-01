import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="location-picker-container" [dir]="currentLang() === 'ar' ? 'rtl' : 'ltr'">
      <!-- Toolbar Header: Search & GPS Button -->
      <div class="picker-toolbar">
        <div class="search-box">
          <span class="material-icons-round search-icon">search</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keydown.enter)="searchLocation($event)"
            [placeholder]="currentLang() === 'en' ? 'Search place, mall, or street...' : 'ابحث عن مكان، مول، أو شارع...'"
            class="search-input"
          />
          <button
            type="button"
            class="btn-search"
            (click)="searchLocation($event)"
            [title]="currentLang() === 'en' ? 'Search location' : 'بحث'"
          >
            <span class="material-icons-round">arrow_forward</span>
          </button>
        </div>

        <button
          type="button"
          class="btn-gps"
          (click)="locateMe($event)"
          [disabled]="isLocating"
          [title]="currentLang() === 'en' ? 'Use My Current GPS Location' : 'موقعي الحالي'"
        >
          <span class="material-icons-round" [class.spinning]="isLocating">my_location</span>
          <span>{{ currentLang() === 'en' ? 'My Location' : 'موقعي' }}</span>
        </button>
      </div>

      <!-- Map Render Container -->
      <div class="map-wrapper" [style.height]="height">
        <div #mapElement class="leaflet-map-container"></div>

        <div class="map-hint">
          <span class="material-icons-round">touch_app</span>
          <span>{{ currentLang() === 'en' ? 'Click map or drag pin to select location' : 'انقر على الخريطة أو اسحب الدبوس لتحديد الموقع' }}</span>
        </div>
      </div>

      <!-- Coordinates Display & Manual Adjustment Bar -->
      <div class="coords-bar">
        <div class="coord-field">
          <label class="coord-label">{{ currentLang() === 'en' ? 'Latitude' : 'خط العرض' }}</label>
          <input
            type="number"
            step="0.000001"
            [ngModel]="lat"
            (ngModelChange)="onManualLatChange($event)"
            class="coord-input"
          />
        </div>

        <div class="coord-field">
          <label class="coord-label">{{ currentLang() === 'en' ? 'Longitude' : 'خط الطول' }}</label>
          <input
            type="number"
            step="0.000001"
            [ngModel]="lng"
            (ngModelChange)="onManualLngChange($event)"
            class="coord-input"
          />
        </div>

        <div class="coord-status">
          <span class="material-icons-round text-primary-color">location_on</span>
          <span>{{ lat | number:'1.2-5' }}, {{ lng | number:'1.2-5' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .location-picker-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
    }

    .picker-toolbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
    }

    .search-box {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 0.65rem;
      font-size: 1.1rem;
      color: var(--text-muted, #94a3b8);
      pointer-events: none;
    }
    :host-context([dir="rtl"]) .search-icon, [dir="rtl"] .search-icon {
      left: auto;
      right: 0.65rem;
    }

    .search-input {
      width: 100%;
      height: 36px;
      padding: 0 2.25rem 0 2rem;
      background: var(--surface-hover, #f8fafc);
      border: 1px solid var(--border, #cbd5e1);
      border-radius: var(--radius-md, 8px);
      font-size: 0.8rem;
      color: var(--text-primary, #0f172a);
      outline: none;
      transition: all 0.15s ease;
    }
    :host-context([dir="rtl"]) .search-input, [dir="rtl"] .search-input {
      padding: 0 2rem 0 2.25rem;
    }

    .search-input:focus {
      border-color: var(--primary, #10b981);
      background: var(--surface, #ffffff);
      box-shadow: 0 0 0 3px var(--primary-glow, rgba(16, 185, 129, 0.15));
    }

    .btn-search {
      position: absolute;
      right: 0.35rem;
      background: var(--primary, #10b981);
      color: #ffffff;
      border: none;
      border-radius: 6px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s;
    }
    :host-context([dir="rtl"]) .btn-search, [dir="rtl"] .btn-search {
      right: auto;
      left: 0.35rem;
    }

    .btn-search:hover {
      background: var(--primary-hover, #059669);
    }
    .btn-search .material-icons-round {
      font-size: 1.05rem;
    }

    .btn-gps {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      height: 36px;
      padding: 0 0.75rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: var(--radius-md, 8px);
      color: #2563eb;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .btn-gps:hover {
      background: #dbeafe;
      border-color: #93c5fd;
    }

    .btn-gps .material-icons-round {
      font-size: 1.05rem;
    }

    .map-wrapper {
      position: relative;
      width: 100%;
      border-radius: var(--radius-md, 10px);
      overflow: hidden;
      border: 1.5px solid var(--border, #cbd5e1);
      box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
    }

    .leaflet-map-container {
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .map-hint {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 400;
      background: rgba(15, 23, 42, 0.82);
      color: #ffffff;
      padding: 4px 12px;
      border-radius: var(--radius-full, 20px);
      font-size: 0.72rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      backdrop-filter: blur(4px);
      pointer-events: none;
      white-space: nowrap;
    }

    .map-hint .material-icons-round {
      font-size: 0.95rem;
      color: var(--primary, #10b981);
    }

    .coords-bar {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: var(--surface-hover, #f8fafc);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      padding: 0.5rem 0.75rem;
      flex-wrap: wrap;
    }

    .coord-field {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex: 1;
      min-width: 130px;
    }

    .coord-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted, #64748b);
      white-space: nowrap;
    }

    .coord-input {
      width: 100%;
      height: 32px;
      padding: 0 0.5rem;
      background: var(--surface, #ffffff);
      border: 1px solid var(--border, #cbd5e1);
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      outline: none;
    }

    .coord-input:focus {
      border-color: var(--primary, #10b981);
    }

    .coord-status {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.74rem;
      font-weight: 800;
      color: var(--primary, #10b981);
      margin-left: auto;
    }
    :host-context([dir="rtl"]) .coord-status, [dir="rtl"] .coord-status {
      margin-left: 0;
      margin-right: auto;
    }

    .text-primary-color {
      color: var(--primary, #10b981);
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class LocationPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  private translationService = inject(TranslationService);
  currentLang = this.translationService.currentLang;

  @ViewChild('mapElement') mapElement!: ElementRef<HTMLDivElement>;

  @Input() lat: number = 24.7136;
  @Input() lng: number = 46.6753;
  @Input() height: string = '280px';
  @Input() zoom: number = 13;

  @Output() latChange = new EventEmitter<number>();
  @Output() lngChange = new EventEmitter<number>();
  @Output() locationSelect = new EventEmitter<{ lat: number; lng: number }>();

  searchQuery = '';
  isLocating = false;

  private map?: L.Map;
  private marker?: L.Marker;

  private defaultMarkerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && (changes['lat'] || changes['lng'])) {
      const newLat = Number(this.lat) || 24.7136;
      const newLng = Number(this.lng) || 46.6753;
      this.updateMapPosition(newLat, newLng, false);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    if (!this.mapElement || this.map) return;

    const initialLat = Number(this.lat) || 24.7136;
    const initialLng = Number(this.lng) || 46.6753;

    this.map = L.map(this.mapElement.nativeElement, {
      center: [initialLat, initialLng],
      zoom: this.zoom,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.marker = L.marker([initialLat, initialLng], {
      icon: this.defaultMarkerIcon,
      draggable: true
    }).addTo(this.map);

    // Drag marker event
    this.marker.on('dragend', () => {
      const position = this.marker?.getLatLng();
      if (position) {
        this.emitLocation(position.lat, position.lng);
      }
    });

    // Click map event
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.updateMapPosition(e.latlng.lat, e.latlng.lng, true);
    });

    // Invalidate size after rendering to prevent gray tiles in modals
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 300);
  }

  private updateMapPosition(lat: number, lng: number, emit = true): void {
    const validLat = Number(lat);
    const validLng = Number(lng);
    if (isNaN(validLat) || isNaN(validLng)) return;

    if (this.marker) {
      this.marker.setLatLng([validLat, validLng]);
    }
    if (this.map) {
      this.map.panTo([validLat, validLng]);
    }

    if (emit) {
      this.emitLocation(validLat, validLng);
    }
  }

  private emitLocation(lat: number, lng: number): void {
    const formattedLat = Number(lat.toFixed(6));
    const formattedLng = Number(lng.toFixed(6));

    this.lat = formattedLat;
    this.lng = formattedLng;

    this.latChange.emit(formattedLat);
    this.lngChange.emit(formattedLng);
    this.locationSelect.emit({ lat: formattedLat, lng: formattedLng });
  }

  onManualLatChange(newLat: number): void {
    const latNum = Number(newLat);
    if (!isNaN(latNum)) {
      this.updateMapPosition(latNum, this.lng, true);
    }
  }

  onManualLngChange(newLng: number): void {
    const lngNum = Number(newLng);
    if (!isNaN(lngNum)) {
      this.updateMapPosition(this.lat, lngNum, true);
    }
  }

  searchLocation(event: Event): void {
    event.preventDefault();
    const query = this.searchQuery.trim();
    if (!query) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const result = data[0];
          const newLat = parseFloat(result.lat);
          const newLng = parseFloat(result.lon);
          this.updateMapPosition(newLat, newLng, true);
          if (this.map) {
            this.map.setZoom(15);
          }
        }
      })
      .catch(err => console.error('Geocoding search failed:', err));
  }

  locateMe(event: Event): void {
    event.preventDefault();
    if (!navigator.geolocation) return;

    this.isLocating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isLocating = false;
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        this.updateMapPosition(newLat, newLng, true);
        if (this.map) {
          this.map.setZoom(16);
        }
      },
      (err) => {
        this.isLocating = false;
        console.warn('Geolocation failed:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
}
