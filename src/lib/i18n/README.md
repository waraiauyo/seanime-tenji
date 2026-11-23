# Translations

The app's text is written in English in the code and translated through `@/lib/i18n`.
English is the source language: the English text is the key, so a string with no translation
is simply shown in English.

The language follows the device (iOS per-app language included) and can be forced in
Profile → Language. It is fixed while the app runs; changing it reloads the app. That is why the
functions below are plain functions that can be called anywhere, including at module level and
outside of React.

## Writing translatable text

```ts
import { t, tc, tn } from "@/lib/i18n"

t("Clear All")
t("Remove {{title}}?", { title })
tn("{{count}} episode", "{{count}} episodes", count) // singular, plural, count
tc("genres", "All")                                  // same English, different translation
```

- Pass a string literal, one complete sentence per call. No concatenation, and wrap each branch
  of a condition separately: `busy ? t("Saving…") : t("Save")`.
- `tc(context, text)` is for a short label whose translation depends on what it describes
  (agreement, noun versus verb). Its dictionary key is `"All ## genres"`; without that entry it
  falls back to the translation of `"All"`.
- A label built at runtime from a server enum goes through `t(variable)`; its possible values
  are listed in the dictionary by hand.
- Dates: `format(date, t("MMM d, yyyy"), { locale: getDateLocale() })`. The pattern is translated
  like any other string (`"d MMM yyyy"` in French). `getIntlLocale()` is the locale for `Intl`.
- Never store, compare or send a translated string. Translate where the text is displayed.
- Do not call these functions inside a Reanimated worklet.

## Dictionaries

`locales/fr.json` maps each English string to its translation, with keys sorted alphabetically.
`npm test` checks that every string literal passed to `t`, `tc` or `tn` has an entry, that
placeholders match and that the keys are sorted.

To add a language: add `locales/<code>.json`, register it in `index.ts` (`SUPPORTED_LANGUAGES`,
`LANGUAGE_NAMES`, `DICTIONARIES`, `DATE_LOCALES`, `INTL_LOCALES`), add its plural rule in
`core.ts` if it differs from English, add it to `DICTIONARIES` in `tests/i18n.test.ts`, and add
the iOS permission texts under `locales` in `app.config.ts`.
