import { getStoredString, setStoredString } from "@/atoms/storage"
import { isManualOfflineModeEnabled } from "@/lib/connection-state"
import { t } from "@/lib/i18n"
import { toast } from "@/lib/utils/toast"
import Constants from "expo-constants"
import * as Updates from "expo-updates"
import * as React from "react"
import { Alert, Platform } from "react-native"

type SeanimeUpdateExtra = {
    otaVersion?: string
    updateGroup?: string
    channel?: string
    platform?: string
    appVersion?: string
    publishedAt?: string
}

type OtaVersionInfo = {
    appVersion: string
    otaVersion: string
    detail: string
}

export type OtaPromptInfo = {
    updateId?: string
    otaVersion?: string
}

type OtaPromptListener = (info: OtaPromptInfo) => void

const CHECK_DELAY_MS = 1200
const DISMISSED_OTA_ID_KEY = "sea-ota-dismissed-id"
const promptListeners = new Set<OtaPromptListener>()

export function onOtaPrompt(listener: OtaPromptListener) {
    promptListeners.add(listener)
    return () => {
        promptListeners.delete(listener)
    }
}

export function dismissOta(info: OtaPromptInfo) {
    if (info.updateId) {
        setStoredString(DISMISSED_OTA_ID_KEY, info.updateId)
    }
}

export async function downloadOta(): Promise<boolean> {
    const result = await Updates.fetchUpdateAsync()
    return result.isNew || result.isRollBackToEmbedded
}

export async function restartOta(): Promise<void> {
    await Updates.reloadAsync()
}

export function OtaUpdatePrompt() {
    const promptShownRef = React.useRef(false)

    React.useEffect(() => {
        if (__DEV__ || !Updates.isEnabled || isManualOfflineModeEnabled()) {
            return
        }

        let cancelled = false

        const checkTimeout = setTimeout(() => {
            void checkForPromptableUpdate({
                shouldCancel: () => cancelled,
                markPromptShown: () => {
                    promptShownRef.current = true
                },
                hasPromptShown: () => promptShownRef.current,
            })
        }, CHECK_DELAY_MS)

        return () => {
            cancelled = true
            clearTimeout(checkTimeout)
        }
    }, [])

    return null
}

export function getOtaVersionInfo(): OtaVersionInfo {
    const appVersion = Constants.expoConfig?.version ?? "unknown"
    const extra = getSeanimeUpdateExtra(Updates.manifest)
    const channel = extra.channel ?? Updates.channel ?? "stable"
    const fallbackVersion = Updates.isEmbeddedLaunch
        ? "embedded"
        : Updates.updateId
            ? shortUpdateId(Updates.updateId)
            : "development"
    const otaVersion = extra.otaVersion ?? fallbackVersion
    const runtimeVersion = Updates.runtimeVersion ?? appVersion

    return {
        appVersion,
        otaVersion,
        detail: `${channel} · runtime ${runtimeVersion}`,
    }
}

export async function checkForOtaUpdateManually(): Promise<void> {
    if (__DEV__ || !Updates.isEnabled) {
        toast.info(t("OTA updates are available in release builds"))
        return
    }

    if (isManualOfflineModeEnabled()) {
        toast.info(t("Disable offline mode to check for updates"))
        return
    }

    try {
        const result = await Updates.checkForUpdateAsync()
        if (!result.isAvailable || result.isRollBackToEmbedded) {
            toast.info(t("Seanime is up to date"))
            return
        }

        promptInstallUpdate(result.manifest)
    }
    catch (error: any) {
        console.error(error)
        toast.error(t("Failed to check for updates"))
    }
}

async function checkForPromptableUpdate({
    shouldCancel,
    markPromptShown,
    hasPromptShown,
}: {
    shouldCancel: () => boolean
    markPromptShown: () => void
    hasPromptShown: () => boolean
}) {
    if (hasPromptShown()) {
        return
    }

    try {
        const result = await Updates.checkForUpdateAsync()
        if (shouldCancel() || hasPromptShown() || !result.isAvailable || result.isRollBackToEmbedded) {
            return
        }

        const updateId = result.manifest && typeof (result.manifest as any).id === "string" ? (result.manifest as any).id : undefined
        if (updateId && getStoredString(DISMISSED_OTA_ID_KEY) === updateId) {
            return
        }

        markPromptShown()
        promptInstallUpdate(result.manifest)
    }
    catch {
        // expected when the update server is unreachable
    }
}

function promptInstallUpdate(manifest: unknown) {
    const extra = getSeanimeUpdateExtra(manifest)
    const message = extra.otaVersion
        ? t("OTA {{version}} is ready to install.", { version: extra.otaVersion })
        : t("A new update is ready to install.")
    const updateId = isRecord(manifest) && typeof manifest.id === "string" ? manifest.id : undefined
    const info = { updateId, otaVersion: extra.otaVersion }

    if (Platform.isTV) {
        promptListeners.forEach(listener => listener(info))
        return
    }

    Alert.alert(
        t("Update available"),
        message,
        [
            {
                text: t("Later"),
                style: "cancel",
                onPress: () => {
                    dismissOta(info)
                },
            },
            {
                text: t("Install"),
                onPress: () => {
                    void fetchAndPromptReload(updateId, extra.otaVersion)
                },
            },
        ],
    )
}

async function fetchAndPromptReload(updateId: string | undefined, otaVersion: string | undefined) {
    try {
        const ready = await downloadOta()
        if (!ready) {
            toast.info(t("Seanime is already up to date"))
            return
        }

        const message = otaVersion
            ? t("OTA {{version}} has been downloaded and will load after restart.", { version: otaVersion })
            : t("The update has been downloaded and will load after restart.")
        Alert.alert(
            t("Restart Seanime?"),
            message,
            [
                { text: t("Later"), style: "cancel" },
                {
                    text: t("Restart"),
                    onPress: () => {
                        void restartOta()
                    },
                },
            ],
        )
    }
    catch (error: any) {
        console.error(error)
        if (updateId) {
            setStoredString(DISMISSED_OTA_ID_KEY, updateId)
        }
        toast.error(t("Failed to download update: {{error}}", { error: String(error?.message || error) }))
    }
}

function getSeanimeUpdateExtra(manifest: unknown): SeanimeUpdateExtra {
    if (!isRecord(manifest)) {
        return {}
    }

    const extra = manifest.extra
    if (!isRecord(extra)) {
        return {}
    }

    const seanime = extra.seanime
    if (!isRecord(seanime)) {
        return {}
    }

    return {
        otaVersion: readString(seanime.otaVersion),
        updateGroup: readString(seanime.updateGroup),
        channel: readString(seanime.channel),
        platform: readString(seanime.platform),
        appVersion: readString(seanime.appVersion),
        publishedAt: readString(seanime.publishedAt),
    }
}

function readString(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function shortUpdateId(updateId: string): string {
    return updateId.slice(0, 8)
}
