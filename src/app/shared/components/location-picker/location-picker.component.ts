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
  HostListener,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';
import * as L from 'leaflet';

interface PlaceSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  address?: any;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="location-picker-container" [dir]="currentLang() === 'ar' ? 'rtl' : 'ltr'">
      <!-- Toolbar Header: Search & GPS Button -->
      <div class="picker-toolbar">
        <div class="search-box" #searchBoxRef>
          <span class="material-icons-round search-icon">search</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (input)="onSearchInput()"
            (focus)="onSearchFocus()"
            (keydown)="onSearchKeyDown($event)"
            [placeholder]="currentLang() === 'en' ? 'Search place, mall, street, city...' : 'ابحث عن مكان، مول، شارع، أو مدينة...'"
            class="search-input"
            autocomplete="off"
          />

          <!-- Loading Spinner in Search -->
          <div class="search-spinner" *ngIf="isSearching">
            <span class="material-icons-round spinning">sync</span>
          </div>

          <!-- Clear Query Button -->
          <button
            type="button"
            class="btn-clear-query"
            *ngIf="searchQuery && !isSearching"
            (click)="clearQuery($event)"
            [title]="currentLang() === 'en' ? 'Clear' : 'مسح'"
          >
            <span class="material-icons-round">close</span>
          </button>

          <!-- Search / Enter Button -->
          <button
            type="button"
            class="btn-search"
            (click)="onSearchSubmit($event)"
            [title]="currentLang() === 'en' ? 'Search location' : 'بحث'"
          >
            <span class="material-icons-round">arrow_forward</span>
          </button>

          <!-- Floating Autocomplete Suggestions Dropdown -->
          <div class="suggestions-dropdown" *ngIf="showSuggestions && (suggestions.length > 0 || (searchQuery.trim().length >= 2 && !isSearching && hasSearched))">
            <ul class="suggestions-list" *ngIf="suggestions.length > 0">
              <li
                *ngFor="let item of suggestions; let i = index"
                class="suggestion-item"
                [class.selected]="i === selectedSuggestionIndex"
                (mousedown)="selectSuggestion(item, $event)"
              >
                <div class="suggestion-icon">
                  <span class="material-icons-round">{{ getPlaceIcon(item) }}</span>
                </div>
                <div class="suggestion-details">
                  <span class="place-main-title">{{ getPlaceMainTitle(item) }}</span>
                  <span class="place-sub-title">{{ getPlaceSubTitle(item) }}</span>
                </div>
                <span class="material-icons-round select-arrow">north_west</span>
              </li>
            </ul>

            <!-- No Results State -->
            <div class="suggestions-empty" *ngIf="suggestions.length === 0 && searchQuery.trim().length >= 2 && !isSearching">
              <span class="material-icons-round">search_off</span>
              <span>{{ currentLang() === 'en' ? 'No places found for this search' : 'لم يتم العثور على أماكن مطابقة' }}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="btn-gps"
          (click)="locateMe($event)"
          [disabled]="isLocating"
          [title]="currentLang() === 'en' ? 'Use My Current GPS Location' : 'استخدم موقعي الحالي'"
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
          <span>{{ currentLang() === 'en' ? 'Click map or drag pin to select coordinates' : 'انقر على الخريطة أو اسحب الدبوس لتعديل الإحداثيات' }}</span>
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
      position: relative;
    }

    .location-picker-container {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      width: 100%;
      position: relative;
    }

    .picker-toolbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      position: relative;
      z-index: 1100;
    }

    .search-box {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      font-size: 1.15rem;
      color: #94a3b8;
      pointer-events: none;
      z-index: 2;
    }
    :host-context([dir="rtl"]) .search-icon, [dir="rtl"] .search-icon {
      left: auto;
      right: 0.75rem;
    }

    .search-input {
      width: 100%;
      height: 38px;
      padding: 0 4.5rem 0 2.35rem;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.84rem;
      color: #0f172a;
      outline: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: all 0.15s ease;
    }
    :host-context([dir="rtl"]) .search-input, [dir="rtl"] .search-input {
      padding: 0 2.35rem 0 4.5rem;
    }

    .search-input:focus {
      border-color: #10b981;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
    }

    .search-spinner {
      position: absolute;
      right: 2.35rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #10b981;
      z-index: 2;
    }
    :host-context([dir="rtl"]) .search-spinner, [dir="rtl"] .search-spinner {
      right: auto;
      left: 2.35rem;
    }

    .search-spinner .material-icons-round {
      font-size: 1.1rem;
    }

    .btn-clear-query {
      position: absolute;
      right: 2.35rem;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      border-radius: 50%;
      transition: color 0.12s;
      z-index: 2;
    }
    :host-context([dir="rtl"]) .btn-clear-query, [dir="rtl"] .btn-clear-query {
      right: auto;
      left: 2.35rem;
    }

    .btn-clear-query:hover {
      color: #0f172a;
    }
    .btn-clear-query .material-icons-round {
      font-size: 1.05rem;
    }

    .btn-search {
      position: absolute;
      right: 0.3rem;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      border: none;
      border-radius: 6px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
      transition: all 0.15s ease;
      z-index: 2;
    }
    :host-context([dir="rtl"]) .btn-search, [dir="rtl"] .btn-search {
      right: auto;
      left: 0.3rem;
    }

    .btn-search:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: scale(1.04);
    }
    .btn-search .material-icons-round {
      font-size: 1.1rem;
    }

    /* Floating Autocomplete Suggestions Dropdown */
    .suggestions-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      box-shadow: 0 12px 28px -4px rgba(0, 0, 0, 0.16), 0 4px 10px -2px rgba(0, 0, 0, 0.08);
      max-height: 240px;
      overflow-y: auto;
      overflow-x: hidden;
      z-index: 1200;
      animation: dropdownFadeIn 0.14s ease-out;
    }

    @keyframes dropdownFadeIn {
      from {
        opacity: 0;
        transform: translateY(-6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .suggestions-list {
      list-style: none;
      margin: 0;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.55rem 0.75rem;
      border-radius: 7px;
      cursor: pointer;
      transition: all 0.12s ease;
      border-bottom: 1px solid #f1f5f9;
    }

    .suggestion-item:last-child {
      border-bottom: none;
    }

    .suggestion-item:hover,
    .suggestion-item.selected {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }

    .suggestion-icon {
      width: 30px;
      height: 30px;
      border-radius: 7px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      flex-shrink: 0;
    }

    .suggestion-item:hover .suggestion-icon,
    .suggestion-item.selected .suggestion-icon {
      background: #d1fae5;
      color: #059669;
    }

    .suggestion-icon .material-icons-round {
      font-size: 1.1rem;
    }

    .suggestion-details {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .place-main-title {
      font-size: 0.84rem;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .suggestion-item:hover .place-main-title,
    .suggestion-item.selected .place-main-title {
      color: #047857;
    }

    .place-sub-title {
      font-size: 0.72rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .select-arrow {
      font-size: 1rem;
      color: #94a3b8;
      flex-shrink: 0;
      opacity: 0;
      transition: opacity 0.12s;
    }

    .suggestion-item:hover .select-arrow,
    .suggestion-item.selected .select-arrow {
      opacity: 1;
      color: #059669;
    }

    .suggestions-empty {
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
      text-align: center;
    }

    .suggestions-empty .material-icons-round {
      font-size: 1.2rem;
      color: #94a3b8;
    }

    .btn-gps {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      height: 38px;
      padding: 0 0.85rem;
      background: #eff6ff;
      border: 1.5px solid #bfdbfe;
      border-radius: 8px;
      color: #2563eb;
      font-size: 0.8rem;
      font-weight: 800;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);
      transition: all 0.15s ease;
    }

    .btn-gps:hover {
      background: #2563eb;
      border-color: #2563eb;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }

    .btn-gps .material-icons-round {
      font-size: 1.1rem;
    }

    .map-wrapper {
      position: relative;
      width: 100%;
      border-radius: 10px;
      overflow: hidden;
      border: 1.5px solid #cbd5e1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      z-index: 1;
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
      background: rgba(15, 23, 42, 0.85);
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 20px;
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
      color: #10b981;
    }

    .coords-bar {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
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
      font-size: 0.74rem;
      font-weight: 700;
      color: #64748b;
      white-space: nowrap;
    }

    .coord-input {
      width: 100%;
      height: 32px;
      padding: 0 0.5rem;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      color: #0f172a;
      outline: none;
      transition: all 0.14s ease;
    }

    .coord-input:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
    }

    .coord-status {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.76rem;
      font-weight: 800;
      color: #059669;
      margin-left: auto;
    }
    :host-context([dir="rtl"]) .coord-status, [dir="rtl"] .coord-status {
      margin-left: 0;
      margin-right: auto;
    }

    .text-primary-color {
      color: #10b981;
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
  @ViewChild('searchBoxRef') searchBoxRef!: ElementRef<HTMLDivElement>;

  @Input() lat: number = 24.7136;
  @Input() lng: number = 46.6753;
  @Input() height: string = '280px';
  @Input() zoom: number = 13;

  @Output() latChange = new EventEmitter<number>();
  @Output() lngChange = new EventEmitter<number>();
  @Output() locationSelect = new EventEmitter<{ lat: number; lng: number }>();

  searchQuery = '';
  isLocating = false;
  isSearching = false;
  hasSearched = false;
  showSuggestions = false;
  suggestions: PlaceSuggestion[] = [];
  selectedSuggestionIndex = -1;

  private map?: L.Map;
  private marker?: L.Marker;
  private searchDebounceTimer?: any;

  private defaultMarkerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.searchBoxRef && !this.searchBoxRef.nativeElement.contains(event.target as Node)) {
      this.showSuggestions = false;
    }
  }

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
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
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

  onSearchInput(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    const query = this.searchQuery.trim();
    if (query.length < 2) {
      this.suggestions = [];
      this.showSuggestions = false;
      this.isSearching = false;
      this.hasSearched = false;
      return;
    }

    this.isSearching = true;
    this.showSuggestions = true;
    this.selectedSuggestionIndex = -1;

    this.searchDebounceTimer = setTimeout(() => {
      this.fetchSuggestions(query);
    }, 350);
  }

  onSearchFocus(): void {
    if (this.suggestions.length > 0 || (this.searchQuery.trim().length >= 2 && this.hasSearched)) {
      this.showSuggestions = true;
    }
  }

  clearQuery(event: Event): void {
    event.stopPropagation();
    this.searchQuery = '';
    this.suggestions = [];
    this.showSuggestions = false;
    this.isSearching = false;
    this.hasSearched = false;
  }

  onSearchKeyDown(event: KeyboardEvent): void {
    if (!this.showSuggestions || this.suggestions.length === 0) {
      if (event.key === 'Enter') {
        this.onSearchSubmit(event);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedSuggestionIndex = (this.selectedSuggestionIndex + 1) % this.suggestions.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedSuggestionIndex =
        this.selectedSuggestionIndex <= 0 ? this.suggestions.length - 1 : this.selectedSuggestionIndex - 1;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.selectedSuggestionIndex >= 0 && this.selectedSuggestionIndex < this.suggestions.length) {
        this.selectSuggestion(this.suggestions[this.selectedSuggestionIndex]);
      } else {
        this.onSearchSubmit(event);
      }
    } else if (event.key === 'Escape') {
      this.showSuggestions = false;
    }
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    if (this.suggestions.length > 0) {
      this.selectSuggestion(this.suggestions[0]);
    } else {
      const query = this.searchQuery.trim();
      if (!query) return;
      this.isSearching = true;
      this.fetchSuggestions(query, true);
    }
  }

  private fetchSuggestions(query: string, selectFirst = false): void {
    const lang = this.currentLang() === 'ar' ? 'ar,en' : 'en,ar';
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&addressdetails=1&limit=6&accept-language=${lang}`;

    fetch(url)
      .then((res) => res.json())
      .then((data: PlaceSuggestion[]) => {
        this.isSearching = false;
        this.hasSearched = true;
        this.suggestions = data || [];
        this.showSuggestions = true;

        if (selectFirst && this.suggestions.length > 0) {
          this.selectSuggestion(this.suggestions[0]);
        }
      })
      .catch((err) => {
        this.isSearching = false;
        this.hasSearched = true;
        console.error('Nominatim search failed:', err);
      });
  }

  selectSuggestion(item: PlaceSuggestion, event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const newLat = parseFloat(item.lat);
    const newLng = parseFloat(item.lon);

    this.searchQuery = this.getPlaceMainTitle(item);
    this.showSuggestions = false;

    this.updateMapPosition(newLat, newLng, true);
    if (this.map) {
      this.map.setZoom(15);
    }
  }

  getPlaceMainTitle(item: PlaceSuggestion): string {
    if (!item.display_name) return '';
    const parts = item.display_name.split(',');
    return parts[0].trim();
  }

  getPlaceSubTitle(item: PlaceSuggestion): string {
    if (!item.display_name) return '';
    const parts = item.display_name.split(',');
    return parts.slice(1, 4).join(',').trim();
  }

  getPlaceIcon(item: PlaceSuggestion): string {
    const cls = (item.class || '').toLowerCase();
    const type = (item.type || '').toLowerCase();

    if (cls === 'shop' || type === 'mall' || type === 'supermarket') return 'storefront';
    if (cls === 'amenity' || type === 'restaurant' || type === 'cafe') return 'restaurant';
    if (cls === 'highway' || type === 'residential') return 'add_road';
    if (cls === 'place' || type === 'city' || type === 'town') return 'location_city';
    if (cls === 'tourism' || cls === 'leisure') return 'attractions';
    return 'place';
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
