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

export interface PlaceSuggestion {
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
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.css']
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
