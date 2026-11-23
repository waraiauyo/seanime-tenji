import {
    getLanguagePreference,
    LANGUAGE_NAMES,
    type LanguagePreference,
    setLanguagePreference,
    SUPPORTED_LANGUAGES,
    t,
} from "@/lib/i18n"
import { reloadApp } from "@/lib/i18n/reload"
import { Alert, type AlertButton, Platform } from "react-native"

export const LANGUAGE_PREFERENCES: LanguagePreference[] = ["system", ...SUPPORTED_LANGUAGES]

export function languagePreferenceLabel(preference: LanguagePreference): string {
    return preference === "system" ? t("System language") : LANGUAGE_NAMES[preference]
}

/** Stores the preference and, when it changes the displayed language, reloads the app. */
export async function applyLanguagePreference(preference: LanguagePreference): Promise<void> {
    const languageChanged = setLanguagePreference(preference)
    if (!languageChanged) return

    const reloaded = await reloadApp()
    if (!reloaded) {
        Alert.alert(t("Restart required"), t("Close and reopen the app to apply the new language."))
    }
}

export function showLanguagePicker(onChanged: (preference: LanguagePreference) => void) {
    const current = getLanguagePreference()

    const buttons: AlertButton[] = LANGUAGE_PREFERENCES.map(preference => ({
        text: `${preference === current ? "✓ " : ""}${languagePreferenceLabel(preference)}`,
        onPress: () => {
            onChanged(preference)
            void applyLanguagePreference(preference)
        },
    }))

    // Android alerts show three buttons at most; they are dismissed by tapping outside instead.
    if (Platform.OS !== "android") {
        buttons.push({ text: t("Cancel"), style: "cancel" })
    }

    Alert.alert(t("Language"), undefined, buttons, { cancelable: true })
}
