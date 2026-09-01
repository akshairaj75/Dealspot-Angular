export interface MapLocationOptions {
  lat?: number | string | null;
  lng?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  addressEn?: string | null;
  addressAr?: string | null;
  city?: string | null;
  cityName?: string | null;
  cityNameEn?: string | null;
  cityNameAr?: string | null;
  storeName?: string | null;
  lang?: string;
}

export class MapUtils {
  /**
   * Generates a valid Google Maps URL using GPS coordinates if available,
   * or falling back to text search (Address, City, Store).
   */
  static getGoogleMapsUrl(options: MapLocationOptions): string {
    const lat = Number(options.lat ?? options.latitude);
    const lng = Number(options.lng ?? options.longitude);

    // If valid numeric coordinates exist and are non-zero
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }

    // Fallback to text query (Store, Address, City)
    const lang = options.lang || 'en';
    const address = options.address || (lang === 'ar' ? (options.addressAr || options.addressEn) : (options.addressEn || options.addressAr));
    const city = options.city || options.cityName || (lang === 'ar' ? (options.cityNameAr || options.cityNameEn) : (options.cityNameEn || options.cityNameAr));
    const store = options.storeName || '';

    const queryParts = [store, address, city].filter(Boolean);

    if (queryParts.length > 0) {
      const query = queryParts.join(', ');
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }

    return 'https://maps.google.com';
  }

  /**
   * Opens Google Maps in a new tab.
   */
  static openInGoogleMaps(options: MapLocationOptions, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const url = this.getGoogleMapsUrl(options);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
