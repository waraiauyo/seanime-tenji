import * as Updates from "expo-updates"
import { DevSettings } from "react-native"

/**
 * Restarts the JS runtime so a new language preference takes effect.
 * Returns false when the app cannot reload itself and the user has to restart it by hand.
 */
export async function reloadApp(): Promise<boolean> {
    if (__DEV__) {
        // expo-updates refuses to reload a development build.
        try {
            DevSettings.reload()
            return true
        }
        catch {
            return false
        }
    }

    try {
        if (!Updates.isEnabled) return false
        await Updates.reloadAsync()
        return true
    }
    catch {
        return false
    }
}
