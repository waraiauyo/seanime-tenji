import { downloadSettingsAtom } from "@/atoms/download-settings.atoms"
import { ProfileMenuSection, ProfileMenuToggle, ProfileSubpageHeader, RowDivider } from "@/components/features/profile/profile-menu"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { t } from "@/lib/i18n"
import { Redirect } from "expo-router"
import { useAtom } from "jotai"
import * as React from "react"
import { Platform, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function DownloadSettingsScreen() {
    if (Platform.isTV) {
        return <Redirect href="/(app)/(tabs)/(profile)" />
    }

    return <MobileDownloadSettingsScreen />
}

function MobileDownloadSettingsScreen() {
    const insets = useSafeAreaInsets()
    const [downloadSettings, setDownloadSettings] = useAtom(downloadSettingsAtom)

    useIOSScrollRefreshRateWorkaround()

    return (
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
            <ProfileSubpageHeader
                title={t("Download Settings")}
                detail={t("Control anime and manga downloads.")}
            />

            <ScrollView
                className="flex-1 bg-background"
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                contentInsetAdjustmentBehavior="automatic"
            >
                <View className="mx-4 mt-4 gap-4">
                    <ProfileMenuSection title={t("Network")}>
                        <ProfileMenuToggle
                            icon="wifi-outline"
                            label={t("Only Download on Wi-Fi")}
                            detail={t("Block new downloads when you are on cellular data")}
                            value={downloadSettings.wifiOnly}
                            onToggle={(value) => setDownloadSettings(current => ({ ...current, wifiOnly: value }))}
                        />
                    </ProfileMenuSection>

                    <ProfileMenuSection title={t("Queue")}>
                        <ProfileMenuToggle
                            icon="albums-outline"
                            label={t("Background Downloading")}
                            detail={t("Keep queued downloads running when the app is backgrounded, where supported")}
                            value={downloadSettings.backgroundDownloading}
                            onToggle={(value) => setDownloadSettings(current => ({ ...current, backgroundDownloading: value }))}
                        />
                        <RowDivider />
                        <ProfileMenuToggle
                            icon="git-branch-outline"
                            label={t("Parallel Downloading")}
                            detail={t("Download multiple episodes or chapters at the same time")}
                            value={downloadSettings.parallelDownloading}
                            onToggle={(value) => setDownloadSettings(current => ({ ...current, parallelDownloading: value }))}
                        />
                    </ProfileMenuSection>

                    <Text className="px-1 text-xs leading-5 text-white/35">
                        {t("Background downloading is enabled by default, but actual behavior still depends on platform background execution limits.")}
                    </Text>
                </View>
            </ScrollView>
        </View>
    )
}
