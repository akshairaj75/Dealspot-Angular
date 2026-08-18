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
    
    // Check camelCase first, e.g. titleEn / titleAr, nameEn / nameAr
    const capitalizedLang = lang.charAt(0).toUpperCase() + lang.slice(1);
    const camelKey = `${fieldName}${capitalizedLang}`;
    if (obj[camelKey] !== undefined && obj[camelKey] !== null && obj[camelKey] !== '') {
      return obj[camelKey];
    }

    // Check snake_case, e.g. title_en, title_ar
    const snakeKey = `${fieldName}_${lang}`;
    if (obj[snakeKey] !== undefined && obj[snakeKey] !== null && obj[snakeKey] !== '') {
      return obj[snakeKey];
    }

    // Fallbacks to English
    const fallbackCamel = `${fieldName}En`;
    if (obj[fallbackCamel] !== undefined && obj[fallbackCamel] !== null && obj[fallbackCamel] !== '') {
      return obj[fallbackCamel];
    }

    const fallbackSnake = `${fieldName}_en`;
    if (obj[fallbackSnake] !== undefined && obj[fallbackSnake] !== null && obj[fallbackSnake] !== '') {
      return obj[fallbackSnake];
    }

    return obj[fieldName] || '';
  }
}
