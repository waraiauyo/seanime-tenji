import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import test from "node:test"
import { CONTEXT_SEPARATOR, createTranslator, getPlaceholders, interpolate, matchLanguage } from "../src/lib/i18n/core.ts"

const ROOT = join(import.meta.dirname, "..")
const SOURCE_DIRS = ["app", "src"]
const DICTIONARIES = { fr: "src/lib/i18n/locales/fr.json" }

test("interpolation fills in known placeholders only", () => {
    assert.equal(interpolate("{{count}} of {{ total }}", { count: 2, total: 5 }), "2 of 5")
    assert.equal(interpolate("Hello {{name}}", {}), "Hello {{name}}")
    assert.equal(interpolate("No placeholders"), "No placeholders")
})

test("a missing translation falls back to the English text", () => {
    const { t, tc, tn } = createTranslator("fr", { "Cancel": "Annuler" })
    assert.equal(t("Cancel"), "Annuler")
    assert.equal(t("Not translated {{n}}", { n: 1 }), "Not translated 1")
    assert.equal(t("constructor"), "constructor")
    assert.equal(tc("anything", "Cancel"), "Annuler")
    assert.equal(tn("{{count}} item", "{{count}} items", 3), "3 items")
})

test("context picks a more specific translation", () => {
    const { tc } = createTranslator("fr", {
        "All": "Tout",
        [`All${CONTEXT_SEPARATOR}genres`]: "Tous",
    })
    assert.equal(tc("genres", "All"), "Tous")
    assert.equal(tc("unknown", "All"), "Tout")
})

test("plural forms follow the rules of each language", () => {
    const english = createTranslator("en", null)
    assert.equal(english.tn("{{count}} episode", "{{count}} episodes", 0), "0 episodes")
    assert.equal(english.tn("{{count}} episode", "{{count}} episodes", 1), "1 episode")
    assert.equal(english.tn("{{count}} episode", "{{count}} episodes", 2), "2 episodes")

    const french = createTranslator("fr", {
        "{{count}} episode": "{{count}} épisode",
        "{{count}} episodes": "{{count}} épisodes",
    })
    assert.equal(french.tn("{{count}} episode", "{{count}} episodes", 0), "0 épisode")
    assert.equal(french.tn("{{count}} episode", "{{count}} episodes", 1), "1 épisode")
    assert.equal(french.tn("{{count}} episode", "{{count}} episodes", 2), "2 épisodes")
})

test("the device language is matched in order of preference", () => {
    const supported = ["en", "fr"] as const
    assert.equal(matchLanguage(["fr-FR", "en-US"], supported, "en"), "fr")
    assert.equal(matchLanguage(["de-DE", "fr_CA", "en"], supported, "en"), "fr")
    assert.equal(matchLanguage(["en-GB", "fr-FR"], supported, "en"), "en")
    assert.equal(matchLanguage(["ja-JP", undefined, 42], supported, "en"), "en")
})

// The checks below read the source files: every string given to t(), tc() or tn() as a literal
// must have a translation in each dictionary, with the same {{placeholders}}.

type SourceKey = { key: string; placeholders: string[]; file: string }

const STRING = String.raw`"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|` + "`(?:[^`\\\\$]|\\\\.)*`"
const CALLS: { pattern: RegExp; keys: (literals: string[]) => string[] }[] = [
    { pattern: new RegExp(String.raw`(?<![\w.$])t\(\s*(${STRING})`, "g"), keys: ([text]) => [text!] },
    {
        pattern: new RegExp(String.raw`(?<![\w.$])tc\(\s*(${STRING})\s*,\s*(${STRING})`, "g"),
        keys: ([context, text]) => [text + CONTEXT_SEPARATOR + context],
    },
    { pattern: new RegExp(String.raw`(?<![\w.$])tn\(\s*(${STRING})\s*,\s*(${STRING})`, "g"), keys: literals => literals },
]

function listSourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) return listSourceFiles(path)
        return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [path] : []
    })
}

function readLiteral(literal: string): string {
    // The literals matched above have no interpolation, so evaluating them only resolves escapes.
    return new Function(`return ${literal}`)() as string
}

function collectSourceKeys(): SourceKey[] {
    const found: SourceKey[] = []
    for (const dir of SOURCE_DIRS) {
        for (const path of listSourceFiles(join(ROOT, dir))) {
            const source = readFileSync(path, "utf8")
            for (const { pattern, keys } of CALLS) {
                for (const match of source.matchAll(pattern)) {
                    const literals = match.slice(1).map(readLiteral)
                    for (const key of keys(literals)) {
                        const text = key.split(CONTEXT_SEPARATOR)[0]!
                        found.push({ key, placeholders: getPlaceholders(text), file: relative(ROOT, path) })
                    }
                }
            }
        }
    }
    return found
}

const sourceKeys = collectSourceKeys()

for (const [language, dictionaryPath] of Object.entries(DICTIONARIES)) {
    const dictionary = JSON.parse(readFileSync(join(ROOT, dictionaryPath), "utf8")) as Record<string, unknown>

    test(`${language}: every translatable string in the source has a translation`, () => {
        const missing = new Map<string, string>()
        for (const { key, file } of sourceKeys) {
            if (typeof dictionary[key] !== "string" && !missing.has(key)) missing.set(key, file)
        }
        assert.deepEqual(
            Array.from(missing, ([key, file]) => `${JSON.stringify(key)} (${file})`),
            [],
            `${missing.size} string(s) missing from ${dictionaryPath}`,
        )
    })

    test(`${language}: translations keep the placeholders of the English text`, () => {
        const mismatched: string[] = []
        for (const [key, translation] of Object.entries(dictionary)) {
            if (typeof translation !== "string" || translation.trim() === "") {
                mismatched.push(`${JSON.stringify(key)}: empty or not a string`)
                continue
            }
            const expected = getPlaceholders(key.split(CONTEXT_SEPARATOR)[0]!)
            const actual = getPlaceholders(translation)
            // A plural form may drop {{count}} ("1 day ago" → "il y a 1 jour"), never add a placeholder.
            const unknown = actual.filter(name => !expected.includes(name))
            const dropped = expected.filter(name => !actual.includes(name) && name !== "count")
            if (unknown.length > 0 || dropped.length > 0) {
                mismatched.push(`${JSON.stringify(key)} → ${JSON.stringify(translation)}`)
            }
        }
        assert.deepEqual(mismatched, [])
    })

    test(`${language}: dictionary keys are sorted`, () => {
        const keys = Object.keys(dictionary)
        assert.deepEqual(keys, keys.toSorted(compareKeys))
    })
}

function compareKeys(a: string, b: string): number {
    const lowerA = a.toLowerCase()
    const lowerB = b.toLowerCase()
    if (lowerA !== lowerB) return lowerA < lowerB ? -1 : 1
    return a < b ? -1 : a > b ? 1 : 0
}
