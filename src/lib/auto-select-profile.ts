import type {
    Anime_AutoSelectPreference,
    Anime_AutoSelectProfile,
    Models_DebridSettings,
    Models_TorrentstreamSettings,
} from "@/api/generated/types"

export type AutoSelectPreferenceKey = "multipleSubsPreference" | "multipleAudioPreference"

export type AutoSelectPreferencePatch = Partial<Record<AutoSelectPreferenceKey, Anime_AutoSelectPreference>>

type StreamResolutionSettings = {
    torrentstreamSettings?: Pick<Models_TorrentstreamSettings, "enabled" | "preferredResolution"> | null
    debridSettings?: Pick<Models_DebridSettings, "enabled" | "streamPreferredResolution"> | null
}

const DEFAULT_RESOLUTION = "1080p"

const PREFERENCES: readonly Anime_AutoSelectPreference[] = ["never", "avoid", "neutral", "prefer", "only"]

// Ordered from "reject" to "require" so the control reads as a scale.
export const AUTO_SELECT_PREFERENCE_OPTIONS: { value: Anime_AutoSelectPreference; label: string }[] = [
    { value: "never", label: "Never" },
    { value: "avoid", label: "Avoid" },
    { value: "neutral", label: "Neutral" },
    { value: "prefer", label: "Prefer" },
    { value: "only", label: "Only" },
]

// The server returns an empty string for a preference that was never saved.
export function normalizeAutoSelectPreference(value: string | null | undefined): Anime_AutoSelectPreference {
    return PREFERENCES.includes(value as Anime_AutoSelectPreference) ? value as Anime_AutoSelectPreference : "neutral"
}

export function hasSavedAutoSelectProfile(profile: Anime_AutoSelectProfile | null | undefined): boolean {
    return !!profile?.dbId
}

/**
 * Resolutions the server falls back to when no profile is saved:
 * the preferred resolution of each enabled streaming mode, or 1080p.
 */
export function getStreamPreferredResolutions(status: StreamResolutionSettings | null | undefined): string[] {
    const resolutions = [
        status?.torrentstreamSettings?.enabled ? status.torrentstreamSettings.preferredResolution : "",
        status?.debridSettings?.enabled ? status.debridSettings.streamPreferredResolution : "",
    ].filter(Boolean)

    return resolutions.length > 0 ? [...new Set(resolutions)] : [DEFAULT_RESOLUTION]
}

/**
 * Builds the full profile to send when a preference changes.
 *
 * The server stores one profile and replaces it on save, so every other field is carried over.
 * Without a saved profile the server auto-selects with the preferred streaming resolution;
 * a saved profile without resolutions drops that, so the first save seeds them.
 */
export function buildAutoSelectProfileUpdate(
    profile: Anime_AutoSelectProfile | null | undefined,
    patch: AutoSelectPreferencePatch,
    fallbackResolutions: readonly string[],
): Anime_AutoSelectProfile {
    const seedResolutions = !hasSavedAutoSelectProfile(profile) && !profile?.resolutions?.length

    return {
        ...profile,
        dbId: profile?.dbId ?? 0,
        resolutions: seedResolutions ? [...fallbackResolutions] : profile?.resolutions,
        multipleAudioPreference: normalizeAutoSelectPreference(patch.multipleAudioPreference ?? profile?.multipleAudioPreference),
        multipleSubsPreference: normalizeAutoSelectPreference(patch.multipleSubsPreference ?? profile?.multipleSubsPreference),
        batchPreference: normalizeAutoSelectPreference(profile?.batchPreference),
        bestReleasePreference: normalizeAutoSelectPreference(profile?.bestReleasePreference),
        requireLanguage: profile?.requireLanguage ?? false,
        requireCodec: profile?.requireCodec ?? false,
        requireSource: profile?.requireSource ?? false,
    }
}
