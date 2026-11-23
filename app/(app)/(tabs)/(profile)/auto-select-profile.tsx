import { Anime_AutoSelectPreference } from "@/api/generated/types"
import { useGetAutoSelectProfile, useSaveAutoSelectProfile } from "@/api/hooks/torrent_search.hooks"
import { useServerStatus } from "@/atoms/server.atoms"
import { ProfileMenuItem, ProfileMenuSection, ProfileSubpageHeader, RowDivider } from "@/components/features/profile/profile-menu"
import { SegmentedControl } from "@/components/shared/segmented-control"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import {
    AUTO_SELECT_PREFERENCE_OPTIONS,
    AutoSelectPreferenceKey,
    AutoSelectPreferencePatch,
    buildAutoSelectProfileUpdate,
    getStreamPreferredResolutions,
    hasSavedAutoSelectProfile,
    normalizeAutoSelectPreference,
} from "@/lib/auto-select-profile"
import { t, tc } from "@/lib/i18n"
import { Ionicons } from "@expo/vector-icons"
import { Redirect } from "expo-router"
import * as React from "react"
import { ActivityIndicator, Platform, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type PreferenceRowConfig = {
    key: AutoSelectPreferenceKey
    icon: React.ComponentProps<typeof Ionicons>["name"]
    label: string
    detail: string
    // How the release is named in the explanation under the control.
    noun: string
}

const PREFERENCE_ROWS: PreferenceRowConfig[] = [
    {
        key: "multipleSubsPreference",
        icon: "chatbubble-ellipses-outline",
        label: t("Multiple Subtitles"),
        detail: t("Releases named with several subtitle languages, like Multi-Subs"),
        noun: t("multi-sub"),
    },
    {
        key: "multipleAudioPreference",
        icon: "mic-outline",
        label: t("Multiple Audio"),
        detail: t("Releases named with several audio tracks, like Dual Audio"),
        noun: t("multi-audio"),
    },
]

// The labels live in a module that is also loaded by the Node tests, so they are translated here.
const PREFERENCE_OPTIONS = AUTO_SELECT_PREFERENCE_OPTIONS.map(option => ({ ...option, label: tc("preference", option.label) }))

export default function AutoSelectProfileScreen() {
    if (Platform.isTV) {
        return <Redirect href="/(app)/(tabs)/(profile)" />
    }

    return <MobileAutoSelectProfileScreen />
}

function MobileAutoSelectProfileScreen() {
    const insets = useSafeAreaInsets()
    const serverStatus = useServerStatus()
    const { data: profile, isLoading, isRefetching, refetch } = useGetAutoSelectProfile()
    const { mutate: saveProfile, isPending: isSaving } = useSaveAutoSelectProfile()
    // The choice being saved, shown right away until the server answers.
    const [pendingPatch, setPendingPatch] = React.useState<AutoSelectPreferencePatch>({})

    useIOSScrollRefreshRateWorkaround()

    const fallbackResolutions = React.useMemo(() => getStreamPreferredResolutions(serverStatus), [serverStatus])

    const handleChange = React.useCallback((key: AutoSelectPreferenceKey, value: Anime_AutoSelectPreference) => {
        if (normalizeAutoSelectPreference(profile?.[key]) === value) return

        const patch: AutoSelectPreferencePatch = { [key]: value }
        setPendingPatch(patch)
        saveProfile(
            { profile: buildAutoSelectProfileUpdate(profile, patch, fallbackResolutions) },
            { onSettled: () => setPendingPatch({}) },
        )
    }, [fallbackResolutions, profile, saveProfile])

    return (
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
            <ProfileSubpageHeader
                title={t("Auto-Select Profile")}
                detail={t("How the server picks a torrent for you.")}
            />

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="rgba(255,255,255,0.45)" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1 bg-background"
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                    contentInsetAdjustmentBehavior="automatic"
                >
                    {!profile ? (
                        <View className="mx-4 mt-4 gap-4">
                            <ProfileMenuSection title={t("Profile")}>
                                <ProfileMenuItem
                                    icon="refresh"
                                    label={t("Couldn't load the profile")}
                                    detail={t("Check the server connection, then try again")}
                                    accessory={isRefetching
                                        ? <ActivityIndicator size="small" color="rgba(255,255,255,0.45)" />
                                        : undefined}
                                    onPress={() => refetch()}
                                    hideChevron
                                />
                            </ProfileMenuSection>
                        </View>
                    ) : (
                        <View className="mx-4 mt-4 gap-4">
                            {/* One save at a time: the server replaces the whole profile on each save. */}
                            <View pointerEvents={isSaving ? "none" : "auto"}>
                                <ProfileMenuSection title={t("Release Preferences")}>
                                    {PREFERENCE_ROWS.map((row, index) => (
                                        <React.Fragment key={row.key}>
                                            {index > 0 ? <RowDivider /> : null}
                                            <PreferenceRow
                                                row={row}
                                                value={normalizeAutoSelectPreference(pendingPatch[row.key] ?? profile[row.key])}
                                                onChange={value => handleChange(row.key, value)}
                                            />
                                        </React.Fragment>
                                    ))}
                                </ProfileMenuSection>
                            </View>

                            <Text className="px-1 text-xs leading-5 text-white/35">
                                {t("Applies when the server auto-selects a torrent for torrent or debrid streaming. The profile is stored on the server, so it is shared with your other devices.")}
                            </Text>

                            <Text className="px-1 text-xs leading-5 text-white/35">
                                {hasSavedAutoSelectProfile(profile)
                                    ? t("Other profile options, like release groups and resolutions, keep their values. Edit them from the Seanime web interface.")
                                    : t("No profile is saved yet. Changing a preference creates one and keeps your preferred streaming resolution ({{resolutions}}).", {
                                        resolutions: fallbackResolutions.join(", "),
                                    })}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    )
}

function PreferenceRow({
    row,
    value,
    onChange,
}: {
    row: PreferenceRowConfig
    value: Anime_AutoSelectPreference
    onChange: (value: Anime_AutoSelectPreference) => void
}) {
    return (
        <View className="gap-3 px-4 py-3.5">
            <View className="flex-row items-center">
                <Ionicons name={row.icon} size={20} color="rgba(255,255,255,0.6)" />
                <View className="ml-3 flex-1">
                    <Text className="text-foreground text-sm font-medium">{row.label}</Text>
                    <Text className="mt-0.5 text-xs text-white/40">{row.detail}</Text>
                </View>
            </View>

            {/* Five segments are tight on narrow phones, so the control reaches a little past the row padding. */}
            <View className="-mx-1">
                <SegmentedControl
                    options={PREFERENCE_OPTIONS}
                    value={value}
                    onChange={onChange}
                />
            </View>

            <Text className="text-xs leading-5 text-white/50">
                {describePreference(value, row.noun)}
            </Text>
        </View>
    )
}

function describePreference(preference: Anime_AutoSelectPreference, noun: string): string {
    switch (preference) {
        case "never":
            return t("Skips every {{noun}} release.", { noun })
        case "avoid":
            return t("Between otherwise equal torrents, the {{noun}} release loses.", { noun })
        case "prefer":
            return t("Between otherwise equal torrents, the {{noun}} release wins.", { noun })
        case "only":
            return t("Skips everything else. Auto-select fails when no {{noun}} release is found.", { noun })
        default:
            return t("Treats {{noun}} releases like any other.", { noun })
    }
}
