import { ProfileMenuItem, ProfileMenuSection, ProfileMenuToggle, ProfileSubpageHeader, RowDivider } from "@/components/features/profile/profile-menu"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { t, tn } from "@/lib/i18n"
import {
    clearOfflineLogs,
    copyOfflineLogTextToClipboard,
    getOfflineCrashText,
    getOfflineLogEntries,
    getOfflineLogText,
    isOfflineLoggingEnabled,
    setOfflineLoggingEnabled,
} from "@/lib/offline-logger"
import { toast } from "@/lib/utils/toast"
import * as React from "react"
import { Alert, ScrollView, Share, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type LogSummary = {
    entries: number
    crashes: number
}

function readLogSummary(): LogSummary {
    const entries = getOfflineLogEntries()

    return {
        entries: entries.length,
        crashes: entries.filter(entry => entry.level === "fatal" || entry.scope.includes("crash")).length,
    }
}

function formatSummary(summary: LogSummary) {
    if (summary.entries === 0) return t("No local logs saved")

    const entryLabel = tn("1 entry", "{{count}} entries", summary.entries)
    const crashLabel = summary.crashes === 0
        ? null
        : tn("1 crash", "{{count}} crashes", summary.crashes)

    return crashLabel ? `${entryLabel} · ${crashLabel}` : entryLabel
}

function formatCrashSummary(crashes: number) {
    if (crashes === 0) return t("No crash records saved")
    return tn("1 crash record", "{{count}} crash records", crashes)
}

export default function LogsScreen() {
    const insets = useSafeAreaInsets()
    const [loggingEnabled, setLoggingEnabledState] = React.useState(isOfflineLoggingEnabled)
    const [summary, setSummary] = React.useState(readLogSummary)
    const [copyingKind, setCopyingKind] = React.useState<"crash" | "logs" | null>(null)

    useIOSScrollRefreshRateWorkaround()

    const refreshSummary = React.useCallback(() => {
        setLoggingEnabledState(isOfflineLoggingEnabled())
        setSummary(readLogSummary())
    }, [])

    const handleToggleLogging = React.useCallback((enabled: boolean) => {
        setOfflineLoggingEnabled(enabled)
        refreshSummary()
        toast.info(enabled ? t("Logging enabled") : t("Logging disabled"))
    }, [refreshSummary])

    const copyText = React.useCallback((kind: "crash" | "logs") => {
        if (copyingKind) return

        (async () => {
            setCopyingKind(kind)
            try {
                const text = kind === "crash" ? await getOfflineCrashText() : await getOfflineLogText()
                if (!text.trim()) {
                    toast.info(kind === "crash" ? t("No crash records yet") : t("No diagnostic logs yet"))
                    return
                }

                const copied = copyOfflineLogTextToClipboard(text)
                if (copied) {
                    toast.success(kind === "crash" ? t("Crash report copied") : t("Logs copied"))
                    return
                }

                await Share.share({ message: text })
                toast.success(kind === "crash" ? t("Crash report ready to share") : t("Logs ready to share"))
            }
            catch {
                toast.error(kind === "crash" ? t("Failed to copy crash report") : t("Failed to copy logs"))
            }
            finally {
                setCopyingKind(null)
                refreshSummary()
            }
        })()
    }, [copyingKind, refreshSummary])

    const handleClearLogs = React.useCallback(() => {
        Alert.alert(
            t("Clear local logs?"),
            t("Crash records and diagnostic logs stored on this device will be removed."),
            [
                { text: t("Cancel"), style: "cancel" },
                {
                    text: t("Clear"),
                    style: "destructive",
                    onPress: () => {
                        clearOfflineLogs()
                        refreshSummary()
                        toast.success(t("Logs cleared"))
                    },
                },
            ],
        )
    }, [refreshSummary])

    return (
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
            <ProfileSubpageHeader
                title={t("Logs")}
                detail={t("Crash records and temporary diagnostics.")}
            />

            <ScrollView
                className="flex-1 bg-background"
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
            >
                <View className="mx-4 mt-4 gap-4">
                    <ProfileMenuSection title={t("Capture")}>
                        <ProfileMenuToggle
                            icon="document-text-outline"
                            label={t("Enable Logging")}
                            detail={t("Temporarily save app logs on this device")}
                            value={loggingEnabled}
                            onToggle={handleToggleLogging}
                        />
                    </ProfileMenuSection>

                    <ProfileMenuSection title={t("Local Logs")}>
                        <ProfileMenuItem
                            icon="warning-outline"
                            label={copyingKind === "crash" ? t("Preparing Crash Report") : t("Copy Crash Report")}
                            detail={formatCrashSummary(summary.crashes)}
                            onPress={() => copyText("crash")}
                            hideChevron
                        />
                        <RowDivider />
                        <ProfileMenuItem
                            icon="copy-outline"
                            label={copyingKind === "logs" ? t("Preparing Logs") : t("Copy Diagnostic Logs")}
                            detail={formatSummary(summary)}
                            onPress={() => copyText("logs")}
                            hideChevron
                        />
                        <RowDivider />
                        <ProfileMenuItem
                            icon="trash-outline"
                            label={t("Clear Logs")}
                            detail={t("Remove logs stored on this device")}
                            onPress={handleClearLogs}
                            hideChevron
                        />
                    </ProfileMenuSection>

                    <Text className="px-1 text-xs leading-5 text-white/35">
                        {t("Crash records are saved automatically. Continuous app logging is off unless enabled here.")}
                    </Text>
                </View>
            </ScrollView>
        </View>
    )
}
