import { getStoredString, removeStoredKey, setStoredString } from "@/atoms/storage"
import type { Locale } from "date-fns"
import { enUS as enUSDateLocale } from "date-fns/locale/en-US"
import { fr as frDateLocale } from "date-fns/locale/fr"
import { I18nManager, Platform, Settings } from "react-native"
import { createTranslator, type Dictionary, matchLanguage } from "./core"
import fr from "./locales/fr.json"

/**
 * English is the source language: the English text is the key, so it needs no dictionary and
 * a missing translation simply shows the English text.
 *
 * The language is fixed for the lifetime of the JS runtime. Changing it stores the preference
 * and reloads the app (see reloadApp in ./reload), which is why the translation functions can
 * be called anywhere, including at module level and outside of React.
 */
export const SUPPORTED_LANGUAGES = ["en", "fr"] as const
export type AppLanguage = typeof SUPPORTED_LANGUAGES[number]
export type LanguagePreference = AppLanguage | "system"

/** Each language in its own language, for the language picker. */
export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
    en: "English",
    fr: "Français",
}

const DICTIONARIES: Record<AppLanguage, Dictionary | null> = {
    en: null,
    fr,
}

const DATE_LOCALES: Record<AppLanguage, Locale> = {
    en: enUSDateLocale,
    fr: frDateLocale,
}

const INTL_LOCALES: Record<AppLanguage, string> = {
    en: "en-US",
    fr: "fr-FR",
}

const LANGUAGE_PREFERENCE_STORAGE_KEY = "app-language"

function isAppLanguage(value: unknown): value is AppLanguage {
    return SUPPORTED_LANGUAGES.includes(value as AppLanguage)
}

function getDeviceLanguageTags(): unknown[] {
    const tags: unknown[] = []
    try {
        if (Platform.OS === "ios") {
            // The user's preferred languages. Unlike the current locale, this list does not
            // depend on which localizations the app bundle declares.
            const languages = Settings.get("AppleLanguages")
            if (Array.isArray(languages)) tags.push(...languages)
        } else if (Platform.OS === "android") {
            tags.push(I18nManager.getConstants().localeIdentifier)
        }
    }
    catch {
    }
    try {
        tags.push(new Intl.DateTimeFormat().resolvedOptions().locale)
    }
    catch {
    }
    return tags
}

export function getLanguagePreference(): LanguagePreference {
    const stored = getStoredString(LANGUAGE_PREFERENCE_STORAGE_KEY)
    return isAppLanguage(stored) ? stored : "system"
}

function resolveLanguage(preference: LanguagePreference): AppLanguage {
    return preference === "system"
        ? matchLanguage(getDeviceLanguageTags(), SUPPORTED_LANGUAGES, "en")
        : preference
}

const activeLanguage = resolveLanguage(getLanguagePreference())

/** The language this run of the app is displayed in. */
export function getLanguage(): AppLanguage {
    return activeLanguage
}

/**
 * Stores the preference. Returns true when it changes the displayed language, in which case
 * the app has to be reloaded for the change to show.
 */
export function setLanguagePreference(preference: LanguagePreference): boolean {
    if (preference === "system") {
        removeStoredKey(LANGUAGE_PREFERENCE_STORAGE_KEY)
    } else {
        setStoredString(LANGUAGE_PREFERENCE_STORAGE_KEY, preference)
    }
    return resolveLanguage(preference) !== activeLanguage
}

export const { t, tc, tn } = createTranslator(activeLanguage, DICTIONARIES[activeLanguage])

/** Locale for date-fns, to pass as the `locale` option of `format` along with a translated pattern. */
export function getDateLocale(): Locale {
    return DATE_LOCALES[activeLanguage]
}

/** BCP 47 tag for `Intl` formatters and `toLocale*String` calls. */
export function getIntlLocale(): string {
    return INTL_LOCALES[activeLanguage]
}

/** Fixed-point number with the decimal separator of the displayed language: 1.5 in English, 1,5 in French. */
export function formatDecimal(value: number, fractionDigits: number): string {
    const text = value.toFixed(fractionDigits)
    return activeLanguage === "fr" ? text.replace(".", ",") : text
}
