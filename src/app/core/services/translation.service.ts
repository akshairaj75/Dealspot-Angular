import { Injectable, signal } from '@angular/core';

export type Lang = 'en' | 'ar';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLangSignal = signal<Lang>('en');
  
  readonly currentLang = this.currentLangSignal.asReadonly();

  constructor() {
    // Load saved language if available
    const saved = localStorage.getItem('dealspot_lang') as Lang;
    if (saved === 'en' || saved === 'ar') {
      this.setLanguage(saved);
    } else {
      this.setLanguage('en');
    }
  }

  setLanguage(lang: Lang): void {
    this.currentLangSignal.set(lang);
    localStorage.setItem('dealspot_lang', lang);
    
    // Update HTML attribute and direction
    document.documentElement.lang = lang;
    if (lang === 'ar') {
      document.body.setAttribute('dir', 'rtl');
      document.body.classList.add('rtl');
    } else {
      document.body.setAttribute('dir', 'ltr');
      document.body.classList.remove('rtl');
    }
  }

  toggleLanguage(): void {
    this.setLanguage(this.currentLang() === 'en' ? 'ar' : 'en');
  }

  translate(obj: any, fieldName: string): string {
    if (!obj) return '';
    const lang = this.currentLang();
    
    // Check if dynamic field exists, e.g. title_en, title_ar
    const key = `${fieldName}_${lang}`;
    if (key in obj) {
      return obj[key] || obj[`${fieldName}_en`] || '';
    }
    
    // If not found, try to fall back or return exact field
    return obj[fieldName] || '';
  }
}
