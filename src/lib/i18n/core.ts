// Platform-free translation logic, kept apart from index.ts so it can be tested under Node.

export type TranslationParams = Record<string, string | number>
export type Dictionary = Readonly<Record<string, unknown>>

// In a dictionary, a translation that depends on context is keyed "English text ## context".
export const CONTEXT_SEPARATOR = " ## "

type PluralForm = "one" | "other"

const PLURAL_RULES: Record<string, (count: number) => PluralForm> = {
    en: count => count === 1 ? "one" : "other",
    // French treats 0 and 1 (and anything below 2) as singular: "0 épisode", "1,5 épisode".
    fr: count => Math.abs(count) < 2 ? "one" : "other",
}

export function interpolate(text: string, params?: TranslationParams): string {
    if (!params) return text
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (placeholder, name: string) => {
        const value = params[name]
        return value === undefined ? placeholder : String(value)
    })
}

export function getPlaceholders(text: string): string[] {
    return Array.from(text.matchAll(/\{\{\s*(\w+)\s*\}\}/g), match => match[1]!).sort()
}

export function createTranslator(language: string, dictionary: Dictionary | null) {
    const pluralForm = PLURAL_RULES[language] ?? PLURAL_RULES.en!

    function find(key: string): string | undefined {
        if (!dictionary || !Object.hasOwn(dictionary, key)) return undefined
        const value = dictionary[key]
        return typeof value === "string" ? value : undefined
    }

    /** Translates `text`, the English source string. Falls back to `text` itself. */
    function t(text: string, params?: TranslationParams): string {
        return interpolate(find(text) ?? text, params)
    }

    /**
     * Same as `t`, for an English string whose translation depends on what it refers to
     * (gender or number agreement, noun versus verb). Falls back to the context-free translation.
     */
    function tc(context: string, text: string, params?: TranslationParams): string {
        return interpolate(find(text + CONTEXT_SEPARATOR + context) ?? find(text) ?? text, params)
    }

    /** Picks the singular or plural English string for `count`, then translates it. `{{count}}` is filled in. */
    function tn(one: string, other: string, count: number, params?: TranslationParams): string {
        const text = pluralForm(count) === "one" ? one : other
        return interpolate(find(text) ?? text, { count, ...params })
    }

    return { t, tc, tn }
}

/**
 * Returns the first supported language among the device's preferred language tags
 * ("fr-FR", "fr_CA", "en"...), in the user's order of preference.
 */
export function matchLanguage<Language extends string>(
    tags: readonly unknown[],
    supported: readonly Language[],
    fallback: Language,
): Language {
    for (const tag of tags) {
        if (typeof tag !== "string") continue
        const primary = tag.trim().toLowerCase().split(/[-_]/)[0]
        const match = supported.find(language => language === primary)
        if (match) return match
    }
    return fallback
}
