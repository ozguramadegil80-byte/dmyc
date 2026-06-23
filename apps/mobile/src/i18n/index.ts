import { dictionaries } from './dictionaries';

export type Locale = keyof typeof dictionaries;
export type TranslationKey = keyof typeof dictionaries.tr;

export const defaultLocale: Locale = 'tr';

export function normalizeLocale(value: string | undefined | null): Locale {
  if (value?.toLowerCase().startsWith('en')) {
    return 'en';
  }

  return defaultLocale;
}

export function createTranslator(locale: Locale = defaultLocale) {
  const dictionary = dictionaries[locale] ?? dictionaries[defaultLocale];

  return function translate(key: TranslationKey) {
    return dictionary[key] ?? dictionaries[defaultLocale][key] ?? key;
  };
}

export const t = createTranslator(defaultLocale);
