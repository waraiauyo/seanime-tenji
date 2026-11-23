import { subscribeWsMessage } from "@/api/components/websocket-hub"
import { useScanLocalFiles } from "@/api/hooks/scan.hooks"
import { useCurrentUser } from "@/atoms/server.atoms"
import { ExternalPlayerPickerSheet } from "@/components/features/player/external-player-picker-sheet"
import { languagePreferenceLabel, showLanguagePicker } from "@/components/features/profile/language-setting"
import { ProfileMenuItem, ProfileMenuSection, ProfileMenuToggle, RowDivider } from "@/components/features/profile/profile-menu"
import { SafeView } from "@/components/layout/layout-view"
import { Badge } from "@/components/ui/badge"
import { Text as UIText } from "@/components/ui/text"
import { TVSettingsScreen } from "@/components/tv/tv-settings-screen"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { checkForAppReleaseUpdateManually } from "@/lib/app-release-updates"
import {
    useActiveAnimeDownloads,
    useActiveMangaDownloads,
    useAllDownloadedAnime,
    useAllDownloadedManga,
    useAnimeTotalDownloadSize,
    useFailedAnimeDownloads,
    useFailedMangaDownloads,
    useIsLocalServer,
    useMangaDownloadDiskUsage,
} from "@/lib/downloads"
import { getLanguagePreference, t, tc } from "@/lib/i18n"
import { useIsServerConnected, useManualOfflineMode, useServerConnectionState } from "@/lib/offline"
import { checkForOtaUpdateManually, getOtaVersionInfo } from "@/lib/ota/updates"
import { type ActiveStreamSession, activeStreamSessionAtom } from "@/lib/player"
import { getPlayerPreferences } from "@/lib/player/player-preferences"
import { downloadLabel, playerLabel, streamLabel } from "@/lib/profile/profile-info"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/utils/toast"
import { Ionicons } from "@expo/vector-icons"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useAtomValue } from "jotai"
import * as React from "react"
import { ActivityIndicator, Alert, Platform, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function ProfileScreen() {
    if (Platform.isTV) {
        return <TVSettingsScreen />
    }

    return <MobileProfileScreen />
}

function MobileProfileScreen() {
    const user = useCurrentUser()
    const insets = useSafeAreaInsets()
    const connectionState = useServerConnectionState()
    const [manualOffline, setManualOffline] = useManualOfflineMode()
    const activeStream = useAtomValue(activeStreamSessionAtom)
    const isServerConnected = useIsServerConnected()
    const isLocalServer = useIsLocalServer()

    const [scanProgress, setScanProgress] = React.useState<number | null>(null)
    const [scanStatus, setScanStatus] = React.useState<string | null>(null)

    React.useEffect(() => {
        return subscribeWsMessage(message => {
            if (message.type === "scan-progress" && typeof message.payload === "number") {
                setScanProgress(message.payload)
            } else if (message.type === "scan-status" && typeof message.payload === "string") {
                setScanStatus(message.payload)
            }
        })
    }, [])

    React.useEffect(() => {
        if (scanProgress === 100) {
            const timer = setTimeout(() => {
                setScanProgress(null)
                setScanStatus(null)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [scanProgress])

    const { mutate: scanLibrary, isPending: isScanPending } = useScanLocalFiles()
    const isScanning = (scanProgress !== null && scanProgress < 100) || isScanPending

    const handleRescan = React.useCallback(() => {
        if (isScanning) return
        scanLibrary({
            enhanced: false,
            enhanceWithOfflineDatabase: false,
            skipLockedFiles: true,
            skipIgnoredFiles: true,
        })
    }, [isScanning, scanLibrary])

    useIOSScrollRefreshRateWorkaround()

    const downloadedAnime = useAllDownloadedAnime()
    const activeAnimeDownloads = useActiveAnimeDownloads()
    const failedAnimeDownloads = useFailedAnimeDownloads()
    const totalAnimeSize = useAnimeTotalDownloadSize()
    const downloadedManga = useAllDownloadedManga()
    const activeMangaDownloads = useActiveMangaDownloads()
    const failedMangaDownloads = useFailedMangaDownloads()
    const totalMangaSize = useMangaDownloadDiskUsage()

    const [playerPickerOpen, setPlayerPickerOpen] = React.useState(false)
    const [isClearingImageCache, setIsClearingImageCache] = React.useState(false)
    const [isCheckingAppReleaseUpdate, setIsCheckingAppReleaseUpdate] = React.useState(false)
    const [isCheckingOtaUpdate, setIsCheckingOtaUpdate] = React.useState(false)
    const otaVersionInfo = React.useMemo(() => getOtaVersionInfo(), [])
    const [languagePreference, setLanguagePreferenceState] = React.useState(getLanguagePreference)

    const [externalPlayerLabel, setExternalPlayerLabel] = React.useState(() =>
        playerLabel(getPlayerPreferences().externalPlayerTemplate),
    )

    const handleChangeServerUrlPress = React.useCallback(() => {
        Alert.alert(
            t("Change server URL?"),
            "",
            [
                { text: t("Cancel"), style: "cancel" },
                {
                    text: t("Continue"),
                    onPress: () => router.push("/(out)/set-server-url" as never),
                },
            ],
        )
    }, [])

    const handlePlayerPickerClose = (open: boolean) => {
        setPlayerPickerOpen(open)
        if (!open) {
            setExternalPlayerLabel(playerLabel(getPlayerPreferences().externalPlayerTemplate))
        }
    }

    const clearImageCache = React.useCallback(() => {
        if (isClearingImageCache) {
            return
        }

        (async () => {
            try {
                setIsClearingImageCache(true)

                const [memoryCleared, diskCleared] = await Promise.all([
                    Image.clearMemoryCache(),
                    Image.clearDiskCache(),
                ])

                if (!memoryCleared && !diskCleared) {
                    toast.info(t("Image cache was already empty"))
                    return
                }

                toast.success(t("Image cache cleared"))
            }
            catch {
                toast.error(t("Failed to clear image cache"))
            }
            finally {
                setIsClearingImageCache(false)
            }
        })()
    }, [isClearingImageCache])

    const handleClearImageCachePress = React.useCallback(() => {
        if (isClearingImageCache) {
            return
        }

        Alert.alert(
            t("Clear image cache?"),
            t("This removes cached posters, banners, and avatars. Images will download again the next time they are shown."),
            [
                { text: t("Cancel"), style: "cancel" },
                {
                    text: t("Clear"),
                    style: "destructive",
                    onPress: clearImageCache,
                },
            ],
        )
    }, [isClearingImageCache, clearImageCache])

    const handleCheckForOtaUpdatePress = React.useCallback(() => {
        if (isCheckingOtaUpdate) {
            return
        }

        setIsCheckingOtaUpdate(true)
        checkForOtaUpdateManually()
            .finally(() => {
                setIsCheckingOtaUpdate(false)
            })
    }, [isCheckingOtaUpdate])

    const handleCheckForAppReleaseUpdatePress = React.useCallback(() => {
        if (isCheckingAppReleaseUpdate) {
            return
        }

        setIsCheckingAppReleaseUpdate(true)
        checkForAppReleaseUpdateManually()
            .finally(() => {
                setIsCheckingAppReleaseUpdate(false)
            })
    }, [isCheckingAppReleaseUpdate])

    const viewer = user?.viewer
    const connectionLabel = connectionState === "connected"
        ? t("Connected to server")
        : connectionState === "connecting"
            ? t("Checking server")
            : t("Offline")
    const connectionColorClassName = connectionState === "connected"
        ? "bg-green-400"
        : connectionState === "connecting"
            ? "bg-amber-400"
            : "bg-red-400"

    return (
        <SafeView>
            <ScrollView
                className="flex-1 bg-background"
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
            >
                {/* header / user info */}
                <View className="items-center pt-8 pb-6 gap-3">
                    {viewer?.avatar?.large ? (
                        <Image
                            source={{ uri: viewer.avatar.large }}
                            style={{ width: 80, height: 80, borderRadius: 40 }}
                            contentFit="cover"
                            transition={120}
                        />
                    ) : (
                        <View className="w-20 h-20 rounded-full bg-white/10 items-center justify-center">
                            <Ionicons name="person" size={32} color="rgba(255,255,255,0.5)" />
                        </View>
                    )}

                    <Text className="text-xl font-bold text-foreground">
                        {viewer?.name || t("User")}
                    </Text>


                    <View className="flex-row items-center gap-1.5">
                        <View
                            className={cn("h-2 w-2 rounded-full", connectionColorClassName)}
                        />
                        <Text className="text-xs text-white/40">
                            {connectionLabel}
                        </Text>
                    </View>
                </View>


                <View className="mx-4 gap-3">
                    <ProfileMenuSection title="AniList">
                        <ProfileMenuItem
                            icon="list-outline"
                            label={t("My Lists")}
                            detail={t("Browse your anime & manga lists")}
                            onPress={() => router.push("/(app)/(tabs)/(profile)/my-lists" as never)}
                        />
                    </ProfileMenuSection>

                    {(activeStream || isServerConnected) ? (
                        <ProfileMenuSection title={t("Streaming")}>
                            {activeStream ? (
                                <ProfileMenuItem
                                    icon={activeStream.streamMode === "debrid" ? "cloud-outline" : "radio-outline"}
                                    label={t("Playback Session")}
                                    detail={streamLabel(activeStream)}
                                    accessory={<ActiveStreamBadge status={activeStream.status} />}
                                    onPress={() => router.push("/(app)/(tabs)/(profile)/active-stream" as never)}
                                />
                            ) : null}
                            {(activeStream && isServerConnected) ? <RowDivider /> : null}
                            {isServerConnected ? (
                                <ProfileMenuItem
                                    icon="funnel-outline"
                                    label={t("Auto-Select Profile")}
                                    detail={t("Multi-sub and multi-audio preferences")}
                                    onPress={() => router.push("/(app)/(tabs)/(profile)/auto-select-profile" as never)}
                                />
                            ) : null}
                        </ProfileMenuSection>
                    ) : null}

                    <ProfileMenuSection title={t("Downloads")}>
                        <ProfileMenuItem
                            icon="tv-outline"
                            label={t("Anime Downloads")}
                            detail={downloadLabel({
                                active: activeAnimeDownloads.length,
                                failed: failedAnimeDownloads.length,
                                downloaded: downloadedAnime.length,
                                size: totalAnimeSize.formatted,
                                media: "anime",
                            })}
                            accessory={activeAnimeDownloads.length > 0 || failedAnimeDownloads.length > 0
                                ? <QueueBadges activeCount={activeAnimeDownloads.length} failedCount={failedAnimeDownloads.length} />
                                : undefined}
                            onPress={() => router.push("/(app)/(media)/anime-downloads" as never)}
                        />
                        <RowDivider />
                        <ProfileMenuItem
                            icon="book-outline"
                            label={t("Manga Downloads")}
                            detail={downloadLabel({
                                active: activeMangaDownloads.length,
                                failed: failedMangaDownloads.length,
                                downloaded: downloadedManga.length,
                                size: totalMangaSize.formatted,
                                media: "manga",
                            })}
                            accessory={activeMangaDownloads.length > 0 || failedMangaDownloads.length > 0
                                ? <QueueBadges activeCount={activeMangaDownloads.length} failedCount={failedMangaDownloads.length} />
                                : undefined}
                            onPress={() => router.push("/(app)/(media)/manga-downloads" as never)}
                        />
                        <RowDivider />
                        <ProfileMenuItem
                            icon="options-outline"
                            label={t("Download Settings")}
                            detail={t("Wi-Fi, background, and queue preferences")}
                            onPress={() => router.push("/(app)/(tabs)/(profile)/download-settings" as never)}
                        />
                    </ProfileMenuSection>

                    {(isServerConnected && isLocalServer) && (
                        <ProfileMenuSection title={t("Server Library")}>
                            <ProfileMenuItem
                                icon="cloud-download-outline"
                                label={t("Server Download Queue")}
                                detail={t("Monitor active downloads running on the server")}
                                onPress={() => router.push("/(app)/(tabs)/(profile)/server-downloads" as never)}
                            />
                            <RowDivider />
                            <ProfileMenuItem
                                icon="alert-circle-outline"
                                label={t("Resolve Unmatched")}
                                detail={t("Manually match unmatched files/folders to anime entries")}
                                onPress={() => router.push("/(app)/(tabs)/(profile)/unmatched" as never)}
                            />
                            <RowDivider />
                            <ProfileMenuItem
                                icon={isScanning ? "refresh" : "search-circle-outline"}
                                label={isScanning ? (scanStatus || t("Scanning library...")) : t("Rescan Library")}
                                detail={isScanning ? t("Progress: {{progress}}%", { progress: scanProgress ?? 0 }) : t("Scan files in your host library")}
                                accessory={isScanning ? <ActivityIndicator size="small" color="rgba(255,255,255,0.45)" /> : undefined}
                                onPress={handleRescan}
                                hideChevron={isScanning}
                            />
                        </ProfileMenuSection>
                    )}

                    <ProfileMenuSection title={t("App")}>
                        <ProfileMenuItem
                            icon="language-outline"
                            label={t("Language")}
                            detail={languagePreferenceLabel(languagePreference)}
                            onPress={() => showLanguagePicker(setLanguagePreferenceState)}
                            hideChevron
                        />
                        <RowDivider />
                        <ProfileMenuToggle
                            icon="cloud-offline-outline"
                            label={t("Offline Mode")}
                            detail={t("Force offline behavior even when connected")}
                            value={manualOffline}
                            onToggle={setManualOffline}
                        />
                        <RowDivider />
                        <ProfileMenuItem
                            icon="images-outline"
                            label={t("Clear Image Cache")}
                            detail={t("Purge cached posters, banners, and avatars")}
                            onPress={handleClearImageCachePress}
                            hideChevron
                        />
                        <RowDivider />
                        <ProfileMenuItem
                            icon="document-text-outline"
                            label={t("Logs")}
                            detail={t("Crash records and temporary diagnostics")}
                            onPress={() => router.push("/(app)/(tabs)/(profile)/logs" as never)}
                        />
                        <RowDivider />
                        {/*<ProfileMenuItem*/}
                        {/*    icon="phone-portrait-outline"*/}
                        {/*    label="App Version"*/}
                        {/*    detail={`v${otaVersionInfo.appVersion}`}*/}
                        {/*    hideChevron*/}
                        {/*/>*/}
                        <RowDivider />
                        <ProfileMenuItem
                            icon="reload-circle-outline"
                            label={t("Check New Release")}
                            detail={isCheckingAppReleaseUpdate ? t("Checking releases") : undefined}
                            accessory={isCheckingAppReleaseUpdate ? <ActivityIndicator size="small" color="rgba(255,255,255,0.45)" /> : undefined}
                            onPress={handleCheckForAppReleaseUpdatePress}
                            hideChevron
                        />
                        <RowDivider />
                        {/*<ProfileMenuItem*/}
                        {/*    icon="cloud-download-outline"*/}
                        {/*    label="OTA Version"*/}
                        {/*    detail={`${otaVersionInfo.otaVersion} · ${otaVersionInfo.detail}`}*/}
                        {/*    hideChevron*/}
                        {/*/>*/}
                        <RowDivider />
                        <ProfileMenuItem
                            icon="code-download-outline"
                            label={t("Check OTA Update")}
                            detail={isCheckingOtaUpdate ? t("Checking update server") : undefined}
                            accessory={isCheckingOtaUpdate ? <ActivityIndicator size="small" color="rgba(255,255,255,0.45)" /> : undefined}
                            onPress={handleCheckForOtaUpdatePress}
                            hideChevron
                        />
                        <RowDivider />
                        <ProfileMenuItem
                            icon="server-outline"
                            label={t("Change Server URL")}
                            onPress={handleChangeServerUrlPress}
                            hideChevron
                        />
                    </ProfileMenuSection>

                    <ProfileMenuSection title={t("Player")}>
                        <ProfileMenuItem
                            icon="play-circle-outline"
                            label={t("External Player")}
                            detail={externalPlayerLabel}
                            onPress={() => setPlayerPickerOpen(true)}
                        />
                    </ProfileMenuSection>
                </View>

                <ExternalPlayerPickerSheet
                    open={playerPickerOpen}
                    onOpenChange={handlePlayerPickerClose}
                />

                <View className="mx-5 pt-4">
                    <Text className="text-muted-foreground text-sm text-right">{`v${otaVersionInfo.appVersion}`} | {`${otaVersionInfo.otaVersion}`}</Text>
                </View>
            </ScrollView>
        </SafeView>
    )
}

function ActiveStreamBadge({ status }: { status: ActiveStreamSession["status"] }) {
    const label = status === "playing" ? tc("stream", "Live") : t("Loading")

    return (
        <Badge variant="secondary" className="items-center justify-center rounded-full bg-green-400/15 px-2 py-0.5">
            <UIText className="text-[11px] font-semibold text-green-300">{label}</UIText>
        </Badge>
    )
}

function QueueBadges({ activeCount, failedCount }: { activeCount: number; failedCount: number }) {
    if (activeCount <= 0 && failedCount <= 0) {
        return null
    }

    return (
        <>
            {activeCount > 0 ? (
                <Badge variant="secondary" className="min-w-6 items-center justify-center rounded-full bg-brand-300/20 px-2 py-0.5">
                    <UIText className="text-[11px] font-semibold text-brand-200">{activeCount}</UIText>
                </Badge>
            ) : null}
            {failedCount > 0 ? (
                <Badge variant="destructive" className="min-w-6 items-center justify-center rounded-full bg-red-500/15 px-2 py-0.5">
                    <UIText className="text-[11px] font-semibold text-red-300">{failedCount}</UIText>
                </Badge>
            ) : null}
        </>
    )
}
