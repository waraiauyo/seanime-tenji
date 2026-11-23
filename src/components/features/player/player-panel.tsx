import type { Anime_Episode, Onlinestream_VideoSource } from "@/api/generated/types"
import { Button } from "@/components/ui/button"
import { formatDecimal, t, tc, tn } from "@/lib/i18n"
import type { PlayerState as PlayerStateType, PlayerTrack } from "@/lib/player"
import type { PlayerPreferences } from "@/lib/player/player-preferences"
import {
    fetchAniZipMapping,
    filterSubtitles,
    searchSubtitles,
    SUBTITLE_FORMAT_OPTIONS,
    SUBTITLE_LANGUAGE_OPTIONS,
    WYZIE_SOURCES,
    type WyzieSource,
    type WyzieSubtitleResult,
} from "@/lib/player/subtitle-search"
import { cn } from "@/lib/utils"
import type { MpvVideoOutput } from "expo-mpv-player"
import Activity from "lucide-react-native/icons/activity"
import Captions from "lucide-react-native/icons/captions"
import Check from "lucide-react-native/icons/check"
import ChevronLeft from "lucide-react-native/icons/chevron-left"
import ChevronRight from "lucide-react-native/icons/chevron-right"
import Clapperboard from "lucide-react-native/icons/clapperboard"
import Cpu from "lucide-react-native/icons/cpu"
import Download from "lucide-react-native/icons/download"
import Gauge from "lucide-react-native/icons/gauge"
import Globe from "lucide-react-native/icons/globe"
import Languages from "lucide-react-native/icons/languages"
import List from "lucide-react-native/icons/list"
import Lock from "lucide-react-native/icons/lock"
import Mic2 from "lucide-react-native/icons/mic-vocal"
import Minus from "lucide-react-native/icons/minus"
import Pause from "lucide-react-native/icons/pause"
import PictureInPicture2 from "lucide-react-native/icons/picture-in-picture-2"
import Play from "lucide-react-native/icons/play"
import Plus from "lucide-react-native/icons/plus"
import RotateCw from "lucide-react-native/icons/rotate-cw"
import Search from "lucide-react-native/icons/search"
import SkipForward from "lucide-react-native/icons/skip-forward"
import Sun from "lucide-react-native/icons/sun"
import Timer from "lucide-react-native/icons/timer"
import Type from "lucide-react-native/icons/type"
import X from "lucide-react-native/icons/x"
import React from "react"
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, View } from "react-native"
import { Pressable } from "react-native-gesture-handler"
import Animated, { SlideInRight, SlideOutRight } from "react-native-reanimated"
import { AUDIO_DELAY_STEP, BRAND_ACCENT, BUTTON_SEEK_OPTIONS, SPEED_OPTIONS, SUBTITLE_DELAY_STEP, SUBTITLE_FONT_SIZE_OPTIONS } from "./constants"
import { formatSecondsLabel } from "./helpers"
import { getBackPanel } from "./helpers"
import type { PlayerPanel } from "./types"

///////////////////////////////////////////////////////////////////////////////
// Panel metadata
///////////////////////////////////////////////////////////////////////////////

const PANEL_META: Record<PlayerPanel, { title: string; icon?: React.ReactNode }> = {
    main: { title: t("Settings") },
    episodes: { title: t("Episodes"), icon: <List size={15} color={BRAND_ACCENT} /> },
    "audio-subtitles": { title: t("Audio & Subtitles"), icon: <Captions size={15} color={BRAND_ACCENT} /> },
    speed: { title: t("Playback Speed"), icon: <Gauge size={15} color={BRAND_ACCENT} /> },
    "seek-buttons": { title: t("Forward / Back Seek"), icon: <SkipForward size={15} color={BRAND_ACCENT} /> },
    "double-tap-seek": { title: t("Double-Tap Seek"), icon: <RotateCw size={15} color={BRAND_ACCENT} /> },
    "video-sources": { title: t("Video Source"), icon: <Clapperboard size={15} color={BRAND_ACCENT} /> },
    "video-output": { title: t("Video Renderer"), icon: <Cpu size={15} color={BRAND_ACCENT} /> },
    "subtitle-delay": { title: t("Subtitle Delay"), icon: <Timer size={15} color="#f59e0b" /> },
    "audio-delay": { title: t("Audio Delay"), icon: <Timer size={15} color="#a78bfa" /> },
    "subtitle-size": { title: t("Subtitle Size"), icon: <Type size={15} color={BRAND_ACCENT} /> },
    "audio-tracks": { title: t("Audio Tracks"), icon: <Mic2 size={15} color={BRAND_ACCENT} /> },
    "subtitle-tracks": { title: t("Subtitle Tracks"), icon: <Captions size={15} color={BRAND_ACCENT} /> },
    "external-subtitles": { title: t("Find Subtitles"), icon: <Globe size={15} color={BRAND_ACCENT} /> },
    "default-audio-lang": { title: t("Default Audio Language"), icon: <Languages size={15} color={BRAND_ACCENT} /> },
    "default-subtitle-lang": { title: t("Default Subtitle Language"), icon: <Languages size={15} color="#f59e0b" /> },
}

const PANEL_CARD_CLASS = "overflow-hidden rounded-xl border border-white/5 bg-white/[0.025]"
const PANEL_ROW_CLASS = "flex-row items-center px-3.5 py-3.5"
const PANEL_DIVIDER_CLASS = "border-t border-white/5"
const PANEL_INPUT_CLASS = "rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-white"

function getAccentTextClass(accent?: string) {
    switch (accent) {
        case BRAND_ACCENT:
            return "text-player-text"
        case "#a78bfa":
            return "text-violet-400"
        case "#f59e0b":
            return "text-amber-400"
        default:
            return "text-white/45"
    }
}

///////////////////////////////////////////////////////////////////////////////
// Settings panel overlay (drawer)
///////////////////////////////////////////////////////////////////////////////

export interface PlayerPanelOverlayProps {
    panel: PlayerPanel
    onNavigate: (panel: PlayerPanel) => void
    onClose: () => void
    insets: { top: number; bottom: number; left: number; right: number }
    state: PlayerStateType
    episodes?: Anime_Episode[]
    currentEpisodeNumber?: number
    onPlayEpisode?: (episode: Anime_Episode) => void
    videoSources?: Onlinestream_VideoSource[]
    videoSource?: Onlinestream_VideoSource
    onSetVideoSource?: (source: Onlinestream_VideoSource) => void
    prefs: PlayerPreferences
    updatePrefs: (p: Partial<PlayerPreferences>) => void
    onSetSpeed: (s: number) => void
    onSubDelayChange: (delta: number) => void
    onSubDelayReset: () => void
    onAudioDelayChange: (delta: number) => void
    onAudioDelayReset: () => void
    onSetSubFontSize: (s: number) => void
    onSetAudioTrack: (id: number) => void
    onSetSubtitleTrack: (id: number) => void
    onAddExternalSubtitle?: (url: string) => Promise<void>
    anilistId?: number
    wyzieApiKey: string
    onSaveWyzieApiKey: (value: string) => void
    onStartPiP?: () => void
    onToggleAutoNext?: () => void
    onToggleCenterTapPlayPause?: () => void
    onToggleSideSwipeControls?: () => void
    onToggleAutoSkipOpEd?: () => void
    onToggleStats?: () => void
    onLockScreen?: () => void
}

export function PlayerPanelOverlay(props: PlayerPanelOverlayProps) {
    const { panel, onNavigate, onClose, insets, state, prefs, updatePrefs } = props
    const meta = PANEL_META[panel]
    const backPanel = getBackPanel(panel)

    return (
        <View className="absolute inset-0 z-[100]" style={{ zIndex: 100 }}>
            <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />

            <Animated.View
                entering={SlideInRight.duration(200)}
                exiting={SlideOutRight.duration(150)}
                className="absolute bottom-0 right-0 top-0 border-l border-white/5 bg-black/95 z-[100]"
                style={{
                    width: 340 + insets.right * 0.5,
                    paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8,
                    paddingRight: insets.right * 0.5,
                    zIndex: 100,
                }}
            >
                <View className="flex-row items-center border-b border-white/5 px-4 pb-3">
                    {backPanel !== null && (
                        <Pressable
                            onPress={() => onNavigate(backPanel)}
                            hitSlop={8}
                            className="mr-2 p-1"
                        >
                            <ChevronLeft size={18} color="rgba(255,255,255,0.55)" />
                        </Pressable>
                    )}
                    {meta.icon && (
                        <View className="items-center justify-center" style={{ width: 18, height: 18 }}>
                            {meta.icon}
                        </View>
                    )}
                    <Text className="ml-2.5 flex-1 text-sm font-bold text-white">
                        {meta.title}
                    </Text>
                    <Pressable
                        onPress={onClose}
                        hitSlop={8}
                        className="rounded-full bg-white/5 p-1.5"
                    >
                        <X size={14} color="rgba(255,255,255,0.55)" />
                    </Pressable>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {panel === "main" && (
                        <MainSettingsContent
                            state={state} prefs={prefs} onNavigate={onNavigate}
                            onStartPiP={props.onStartPiP}
                            onToggleAutoNext={props.onToggleAutoNext}
                            onToggleCenterTapPlayPause={props.onToggleCenterTapPlayPause}
                            onToggleSideSwipeControls={props.onToggleSideSwipeControls}
                            onToggleAutoSkipOpEd={props.onToggleAutoSkipOpEd}
                            onToggleStats={props.onToggleStats}
                            onLockScreen={props.onLockScreen}
                            videoSources={props.videoSources}
                            videoSource={props.videoSource}
                        />
                    )}
                    {panel === "episodes" && (
                        <EpisodesListContent
                            episodes={props.episodes ?? []}
                            currentEpisodeNumber={props.currentEpisodeNumber}
                            onSelect={(ep: Anime_Episode) => { props.onPlayEpisode?.(ep) }}
                        />
                    )}
                    {panel === "audio-subtitles" && (
                        <AudioSubtitlesContent state={state} prefs={prefs} onNavigate={onNavigate} />
                    )}
                    {panel === "speed" && (
                        <SpeedContent
                            current={state.speed} onSelect={(s) => {
                            props.onSetSpeed(s)
                            onClose()
                        }}
                        />
                    )}
                    {panel === "seek-buttons" && (
                        <SeekAmountContent
                            current={prefs.buttonSeekSec}
                            description={t("Choose how far the center rewind and forward controls jump during playback.")}
                            onSelect={(seconds) => {
                                updatePrefs({ buttonSeekSec: seconds })
                                onClose()
                            }}
                        />
                    )}
                    {panel === "double-tap-seek" && (
                        <SeekAmountContent
                            current={prefs.doubleTapSeekSec}
                            description={t("Choose how far a left or right double-tap jumps while watching.")}
                            onSelect={(seconds) => {
                                updatePrefs({ doubleTapSeekSec: seconds })
                                onClose()
                            }}
                        />
                    )}
                    {/*{panel === "video-sources" && (
                     <VideoSourcesContent
                     sources={props.videoSources ?? []}
                     current={props.videoSource}
                     onSelect={(source) => {
                     props.onSetVideoSource?.(source)
                     onClose()
                     }}
                     />
                     )}*/}
                    {panel === "video-output" && (
                        <VideoOutputContent
                            current={prefs.androidVideoOutput}
                            onSelect={(videoOutput) => {
                                updatePrefs({ androidVideoOutput: videoOutput })
                                onClose()
                            }}
                        />
                    )}
                    {panel === "subtitle-delay" && (
                        <DelayContent
                            label="Subtitle" current={state.subtitleDelay}
                            step={SUBTITLE_DELAY_STEP}
                            onChange={props.onSubDelayChange} onReset={props.onSubDelayReset}
                        />
                    )}
                    {panel === "audio-delay" && (
                        <DelayContent
                            label="Audio" current={state.audioDelay}
                            step={AUDIO_DELAY_STEP}
                            onChange={props.onAudioDelayChange} onReset={props.onAudioDelayReset}
                        />
                    )}
                    {panel === "subtitle-size" && (
                        <SubSizeContent
                            current={prefs.subtitleFontSize} onSelect={(s) => {
                            props.onSetSubFontSize(s)
                            onClose()
                        }}
                        />
                    )}
                    {panel === "audio-tracks" && (
                        <TrackContent
                            tracks={state.audioTracks} onSelect={(id) => {
                            props.onSetAudioTrack(id)
                            onClose()
                        }}
                        />
                    )}
                    {panel === "subtitle-tracks" && (
                        <TrackContent
                            tracks={state.subtitleTracks}
                            allowNone
                            onSelect={(id) => {
                                props.onSetSubtitleTrack(id)
                                onClose()
                            }}
                        />
                    )}
                    {panel === "external-subtitles" && (
                        <ExternalSubtitleSearchContent
                            anilistId={props.anilistId}
                            preferredSubtitleLanguages={prefs.preferredSubtitleLanguages}
                            wyzieApiKey={props.wyzieApiKey}
                            onSaveWyzieApiKey={props.onSaveWyzieApiKey}
                            onAddSubtitle={props.onAddExternalSubtitle ?? (async () => { })}
                        />
                    )}
                    {panel === "default-audio-lang" && (
                        <LanguagePrefContent
                            label={t("Audio")} current={prefs.preferredAudioLanguages}
                            onSave={(v) => {
                                updatePrefs({ preferredAudioLanguages: v })
                                onNavigate("audio-subtitles")
                            }}
                        />
                    )}
                    {panel === "default-subtitle-lang" && (
                        <SubtitleLanguagePrefContent
                            preferred={prefs.preferredSubtitleLanguages}
                            ignored={prefs.ignoredSubtitleLabels}
                            onSave={(pref, ignored) => {
                                updatePrefs({
                                    preferredSubtitleLanguages: pref,
                                    ignoredSubtitleLabels: ignored,
                                })
                                onNavigate("audio-subtitles")
                            }}
                        />
                    )}
                </ScrollView>
            </Animated.View>
        </View>
    )
}

function PanelSelectableRow({
    active,
    borderTop,
    onPress,
    disabled,
    children,
    className,
}: {
    active?: boolean
    borderTop?: boolean
    onPress?: () => void
    disabled?: boolean
    children: React.ReactNode
    className?: string
}) {
    const [focused, setFocused] = React.useState(false)

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled ?? !onPress}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        >
            {({ pressed }) => (
                <View
                    className={cn(
                        PANEL_ROW_CLASS,
                        borderTop && PANEL_DIVIDER_CLASS,
                        active ? "bg-player-tint/15" : (pressed || focused) && onPress ? "bg-white/10" : "bg-transparent",
                        className,
                    )}
                >
                    {children}
                </View>
            )}
        </Pressable>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Content components
///////////////////////////////////////////////////////////////////////////////

function MainSettingsContent({
    state, prefs, onNavigate, onStartPiP, onToggleAutoNext,
    onToggleCenterTapPlayPause, onToggleSideSwipeControls, onToggleAutoSkipOpEd, onToggleStats, onLockScreen,
    videoSources = [], videoSource,
}: {
    state: PlayerStateType; prefs: PlayerPreferences; onNavigate: (p: PlayerPanel) => void
    onStartPiP?: () => void; onToggleAutoNext?: () => void
    onToggleCenterTapPlayPause?: () => void; onToggleSideSwipeControls?: () => void
    onToggleAutoSkipOpEd?: () => void
    onToggleStats?: () => void
    onLockScreen?: () => void
    videoSources?: Onlinestream_VideoSource[]
    videoSource?: Onlinestream_VideoSource
}) {
    const rows: Array<{
        label: string; value: string; panel: PlayerPanel; icon: React.ReactNode
        accent?: string; action?: "pip" | "lock" | "toggle-auto-next" | "toggle-center-tap" | "toggle-side-swipe" | "toggle-auto-skip-op-ed" | "toggle-stats"
    }> = [
        {
            label: t("Playback Speed"),
            value: state.speed === 1.0 ? tc("speed", "Normal") : `${state.speed}x`,
            panel: "speed",
            icon: <Gauge size={15} color="rgba(255,255,255,0.6)" />,
        },
        {
            label: t("Double-Tap Seek"),
            value: formatSecondsLabel(prefs.doubleTapSeekSec),
            panel: "double-tap-seek",
            icon: <RotateCw size={15} color="rgba(255,255,255,0.6)" />,
        },
        {
            label: t("Audio & Subtitles"),
            value: t("Tracks, delays, size"),
            panel: "audio-subtitles",
            icon: <Captions size={15} color="rgba(255,255,255,0.6)" />,
        },
        {
            label: t("Auto Next Episode"),
            value: prefs.autoNextEpisode ? t("On") : t("Off"),
            panel: "main",
            icon: <SkipForward size={15} color="rgba(255,255,255,0.6)" />,
            accent: prefs.autoNextEpisode ? BRAND_ACCENT : undefined,
            action: "toggle-auto-next",
        },
        {
            label: t("Auto Skip OP / ED"),
            value: prefs.autoSkipOpEd ? t("On") : t("Off"),
            panel: "main",
            icon: <SkipForward size={15} color="rgba(255,255,255,0.6)" />,
            accent: prefs.autoSkipOpEd ? BRAND_ACCENT : undefined,
            action: "toggle-auto-skip-op-ed",
        },
        {
            label: t("Tap to Play & Pause"),
            value: prefs.centerTapPlayPause ? t("On") : t("Off"),
            panel: "main",
            icon: state.paused
                ? <Play size={15} color="rgba(255,255,255,0.6)" fill="rgba(255,255,255,0.6)" />
                : <Pause size={15} color="rgba(255,255,255,0.6)" />,
            accent: prefs.centerTapPlayPause ? BRAND_ACCENT : undefined,
            action: "toggle-center-tap",
        },
        {
            label: t("Gesture Controls"),
            value: prefs.sideSwipeBrightnessVolume ? t("On") : t("Off"),
            panel: "main",
            icon: <Sun size={15} color="rgba(255,255,255,0.6)" />,
            accent: prefs.sideSwipeBrightnessVolume ? BRAND_ACCENT : undefined,
            action: "toggle-side-swipe",
        },
        {
            label: t("Picture-in-Picture"),
            value: "",
            panel: "main",
            icon: <PictureInPicture2 size={15} color="rgba(255,255,255,0.6)" />,
            action: "pip",
        },
        {
            label: t("Screen Lock"),
            value: "",
            panel: "main",
            icon: <Lock size={15} color="rgba(255,255,255,0.6)" />,
            action: "lock",
        },
        {
            label: t("Playback Stats"),
            value: prefs.showStats ? t("On") : t("Off"),
            panel: "main",
            icon: <Activity size={15} color="rgba(255,255,255,0.6)" />,
            accent: prefs.showStats ? BRAND_ACCENT : undefined,
            action: "toggle-stats",
        },
    ]

    if (videoSources.length > 1 && videoSource) {
        rows.unshift({
            label: t("Video Source"),
            value: [videoSource.server, videoSource.quality].filter(Boolean).join(" · "),
            panel: "video-sources",
            icon: <Clapperboard size={15} color="rgba(255,255,255,0.6)" />,
        })
    }

    if (Platform.OS === "android") {
        rows.push({
            label: t("Video Renderer"),
            value: prefs.androidVideoOutput === "gpu-next" ? t("Modern") : t("Compatibility"),
            panel: "video-output",
            icon: <Cpu size={15} color="rgba(255,255,255,0.6)" />,
            accent: undefined,
        })
    }

    return (
        <View>
            <SettingsCard
                rows={rows} onNavigate={onNavigate}
                onStartPiP={onStartPiP} onToggleAutoNext={onToggleAutoNext}
                onToggleCenterTapPlayPause={onToggleCenterTapPlayPause}
                onToggleSideSwipeControls={onToggleSideSwipeControls}
                onToggleAutoSkipOpEd={onToggleAutoSkipOpEd}
                onToggleStats={onToggleStats}
                onLockScreen={onLockScreen}
            />
        </View>
    )
}

function VideoSourcesContent({ sources, current, onSelect }: {
    sources: Onlinestream_VideoSource[]
    current?: Onlinestream_VideoSource
    onSelect: (source: Onlinestream_VideoSource) => void
}) {
    return (
        <View className="gap-3">
            <Text className="px-0.5 text-xs leading-5 text-white/45">
                {t("Switching source keeps your current playback position.")}
            </Text>
            <View className={PANEL_CARD_CLASS}>
                {sources.map((source, index) => {
                    const active = source.url === current?.url
                    const detail = [source.label, source.quality]
                        .filter((value, valueIndex, values) => value && values.indexOf(value) === valueIndex)
                        .join(" · ")

                    return (
                        <PanelSelectableRow
                            key={`${source.url}-${source.server}-${source.quality}`}
                            active={active}
                            borderTop={index > 0}
                            onPress={() => onSelect(source)}
                            className="justify-between"
                        >
                            <View className="mr-2 flex-1 gap-0.5">
                                <Text
                                    className={cn("text-sm text-white", active && "font-semibold text-player-text")}
                                    numberOfLines={1}
                                >
                                    {source.server || t("Source {{number}}", { number: index + 1 })}
                                </Text>
                                {!!detail && (
                                    <Text className="text-xs text-white/35" numberOfLines={1}>
                                        {detail}
                                    </Text>
                                )}
                            </View>
                            {active && <Check size={14} color={BRAND_ACCENT} />}
                        </PanelSelectableRow>
                    )
                })}
            </View>
        </View>
    )
}

function AudioSubtitlesContent({ state, prefs, onNavigate }: {
    state: PlayerStateType; prefs: PlayerPreferences; onNavigate: (p: PlayerPanel) => void
}) {
    const selectedAudio = state.audioTracks.find(t => t.selected)
    const selectedSub = prefs.showSubtitles ? state.subtitleTracks.find(t => t.selected) : undefined

    type Row = { label: string; value: string; panel: PlayerPanel; icon: React.ReactNode; accent?: string }

    const audioRows: Row[] = [
        {
            label: t("Track"),
            value: selectedAudio?.title || selectedAudio?.language || tn("{{count}} track", "{{count}} tracks", state.audioTracks.length),
            panel: "audio-tracks",
            icon: <Mic2 size={14} color="rgba(255,255,255,0.6)" />,
        },
        {
            label: t("Delay"),
            value: state.audioDelay === 0 ? tc("delay", "Off") : `${state.audioDelay > 0 ? "+" : ""}${formatDecimal(state.audioDelay, 1)}s`,
            panel: "audio-delay",
            icon: <Timer size={14} color="rgba(255,255,255,0.6)" />,
            accent: state.audioDelay !== 0 ? "#a78bfa" : undefined,
        },
        {
            label: t("Default Language"),
            value: prefs.preferredAudioLanguages.split(",")[0]?.trim() || tc("language", "Not set"),
            panel: "default-audio-lang",
            icon: <Languages size={14} color="rgba(255,255,255,0.6)" />,
        },
    ]

    const subtitleRows: Row[] = [
        {
            label: t("Track"),
            value: selectedSub?.title || selectedSub?.language || tn("{{count}} track", "{{count}} tracks", state.subtitleTracks.length),
            panel: "subtitle-tracks",
            icon: <Captions size={14} color="rgba(255,255,255,0.6)" />,
        },
        {
            label: t("Delay"),
            value: state.subtitleDelay === 0 ? tc("delay", "Off") : `${state.subtitleDelay > 0 ? "+" : ""}${formatDecimal(state.subtitleDelay, 1)}s`,
            panel: "subtitle-delay",
            icon: <Timer size={14} color="rgba(255,255,255,0.6)" />,
            accent: state.subtitleDelay !== 0 ? "#f59e0b" : undefined,
        },
        {
            label: t("Font Size"),
            value: `${prefs.subtitleFontSize}`,
            panel: "subtitle-size",
            icon: <Type size={14} color="rgba(255,255,255,0.6)" />,
        },
        {
            label: t("Default Language"),
            value: prefs.preferredSubtitleLanguages.split(",")[0]?.trim() || tc("language", "Not set"),
            panel: "default-subtitle-lang",
            icon: <Languages size={14} color="rgba(255,255,255,0.6)" />,
        },
        {
            label: t("Find Subtitles"),
            value: prefs.wyzieApiKey ? "" : t("Key required"),
            panel: "external-subtitles",
            icon: <Globe size={14} color="rgba(255,255,255,0.6)" />,
        },
    ]

    return (
        <View className="gap-4">
            <View>
                <SectionLabel>{t("Audio")}</SectionLabel>
                <SettingsCard rows={audioRows} onNavigate={onNavigate} />
            </View>
            <View>
                <SectionLabel>{t("Subtitles")}</SectionLabel>
                <SettingsCard rows={subtitleRows} onNavigate={onNavigate} />
            </View>
        </View>
    )
}

function SpeedContent({ current, onSelect }: { current: number; onSelect: (s: number) => void }) {
    return (
        <View className={PANEL_CARD_CLASS}>
            {SPEED_OPTIONS.map((s, idx) => {
                const active = Math.abs(current - s) < 0.01
                return (
                    <PanelSelectableRow key={s} active={active} borderTop={idx > 0} onPress={() => onSelect(s)} className="justify-between">
                        <View className="flex-row items-center gap-2">
                            <Text className={cn("text-sm text-white", active && "font-semibold text-player-text")}>
                                {s}x
                            </Text>
                            {s === 1.0 && (
                                <Text className="text-xs text-white/30">{tc("speed", "Normal")}</Text>
                            )}
                        </View>
                        {active && <Check size={14} color={BRAND_ACCENT} />}
                    </PanelSelectableRow>
                )
            })}
        </View>
    )
}

function SeekAmountContent({ current, onSelect, description }: {
    current: number; onSelect: (seconds: number) => void; description: string
}) {
    return (
        <View className="gap-3">
            <Text className="px-0.5 text-xs leading-5 text-white/45">
                {description}
            </Text>
            <View className={PANEL_CARD_CLASS}>
                {BUTTON_SEEK_OPTIONS.map((seconds, idx) => {
                    const active = current === seconds
                    return (
                        <PanelSelectableRow
                            key={seconds}
                            active={active}
                            borderTop={idx > 0}
                            onPress={() => onSelect(seconds)}
                            className="justify-between"
                        >
                            <View className="flex-row items-center gap-2">
                                <Text className={cn("text-sm text-white", active && "font-semibold text-player-text")}>
                                    {formatSecondsLabel(seconds)}
                                </Text>
                                {seconds === 3 && (
                                    <Text className="text-xs text-white/30">{t("Default")}</Text>
                                )}
                            </View>
                            {active && <Check size={14} color={BRAND_ACCENT} />}
                        </PanelSelectableRow>
                    )
                })}
            </View>
        </View>
    )
}

function VideoOutputContent({ current, onSelect }: {
    current: MpvVideoOutput
    onSelect: (videoOutput: MpvVideoOutput) => void
}) {
    const options: Array<{
        value: MpvVideoOutput
        label: string
        description: string
        badge: string
    }> = [
        {
            value: "gpu-next",
            label: t("Modern"),
            description: t("Uses gpu-next for better compatibility with newer Android versions."),
            badge: t("Recommended"),
        },
        {
            value: "gpu",
            label: t("Compatibility"),
            description: t("Uses the legacy gpu renderer. Try this only if Modern has rendering issues."),
            badge: "",
        },
    ]

    return (
        <View className="gap-3">
            <View className={PANEL_CARD_CLASS}>
                {options.map((option, index) => {
                    const active = option.value === current
                    return (
                        <PanelSelectableRow
                            key={option.value}
                            active={active}
                            borderTop={index > 0}
                            onPress={() => onSelect(option.value)}
                        >
                            <View className="mr-3 min-w-0 flex-1 gap-1">
                                <View className="flex-row items-center gap-2">
                                    <Text className={cn("text-sm text-white", active && "font-semibold")}>
                                        {option.label}
                                    </Text>
                                    <Text className="text-[10px] font-semibold uppercase tracking-wide text-white/30">
                                        {option.badge}
                                    </Text>
                                </View>
                                <Text className="text-xs leading-4 text-white/35">
                                    {option.description}
                                </Text>
                            </View>
                            {active && <Check size={14} color={BRAND_ACCENT} />}
                        </PanelSelectableRow>
                    )
                })}
            </View>
        </View>
    )
}

function DelayContent({ label, current, step, onChange, onReset }: {
    label: string; current: number; step: number
    onChange: (d: number) => void; onReset: () => void
}) {
    const accentClassName = label === "Subtitle" ? "text-amber-400" : "text-violet-400"
    return (
        <View className="items-center gap-7 pt-6">
            <View className="items-center gap-1">
                <Text className={cn("text-4xl font-bold text-white/40", current !== 0 && accentClassName)} style={{ fontVariant: ["tabular-nums"] }}>
                    {current > 0 ? "+" : ""}{formatDecimal(current, 1)}s
                </Text>
                <Text className="text-xs text-white/30">
                    {current === 0 ? t("No delay") : current > 0 ? t("Delayed") : t("Earlier")}
                </Text>
            </View>
            <View className="flex-row items-center gap-3.5">
                <StepperButton onPress={() => onChange(-step)} icon={<Minus size={18} color="#fff" />} />
                <Pressable onPress={onReset}>
                    {({ pressed }) => (
                        <View
                            className={cn(
                                "rounded-xl border px-5 py-2.5",
                                current !== 0 ? "border-red-500/20 bg-red-500/10" : "border-white/10 bg-white/5",
                                pressed && "opacity-70",
                            )}
                        >
                            <Text className={cn("text-sm font-semibold", current !== 0 ? "text-red-400" : "text-white/25")}>
                                {t("Reset")}
                            </Text>
                        </View>
                    )}
                </Pressable>
                <StepperButton onPress={() => onChange(step)} icon={<Plus size={18} color="#fff" />} />
            </View>
            <Text className="max-w-56 text-center text-xs leading-4 text-white/20">
                {label === "Subtitle"
                    ? t("Positive values delay the subtitle track.\nNegative values make it play earlier.")
                    : t("Positive values delay the audio track.\nNegative values make it play earlier.")}
            </Text>
        </View>
    )
}

function SubSizeContent({ current, onSelect }: { current: number; onSelect: (s: number) => void }) {
    return (
        <View className={PANEL_CARD_CLASS}>
            {SUBTITLE_FONT_SIZE_OPTIONS.map((s, idx) => {
                const active = current === s
                return (
                    <PanelSelectableRow key={s} active={active} borderTop={idx > 0} onPress={() => onSelect(s)} className="justify-between">
                        <View className="flex-row items-center gap-2">
                            <Text className={cn("text-sm text-white", active && "font-semibold text-player-text")}>
                                {s}
                            </Text>
                            {s === 48 && <Text className="text-xs text-white/30">{t("Default")}</Text>}
                        </View>
                        {active && <Check size={14} color={BRAND_ACCENT} />}
                    </PanelSelectableRow>
                )
            })}
        </View>
    )
}

function TrackContent({
    tracks,
    allowNone = false,
    onSelect,
}: {
    tracks: PlayerTrack[]
    allowNone?: boolean
    onSelect: (id: number) => void
}) {
    if (tracks.length === 0 && !allowNone) {
        return (
            <View className="items-center gap-2 pt-9">
                <Captions size={28} color="rgba(255,255,255,0.15)" />
                <Text className="text-sm text-white/30">{t("No tracks available")}</Text>
            </View>
        )
    }

    const isNoneSelected = tracks.every(t => !t.selected)

    return (
        <View className={PANEL_CARD_CLASS}>
            {allowNone && (
                <PanelSelectableRow
                    active={isNoneSelected}
                    onPress={() => onSelect(-1)}
                >
                    <View className="mr-2 flex-1">
                        <Text className={cn("text-sm text-white", isNoneSelected && "font-semibold text-player-text")} numberOfLines={1}>
                            {tc("track", "None")}
                        </Text>
                    </View>
                    {isNoneSelected && <Check size={14} color={BRAND_ACCENT} />}
                </PanelSelectableRow>
            )}
            {tracks.map((track, idx) => {
                const borderTop = allowNone ? true : idx > 0
                return (
                    <PanelSelectableRow key={track.id} active={track.selected} borderTop={borderTop} onPress={() => onSelect(track.id)}>
                        <View className="mr-2 flex-1">
                            <Text className={cn("text-sm text-white", track.selected && "font-semibold text-player-text")} numberOfLines={1}>
                                {track.title || track.language || t("Track {{id}}", { id: track.id })}
                            </Text>
                            {(track.language || track.codec) && (
                                <Text className="mt-0.5 text-xs text-white/35" numberOfLines={1}>
                                    {[track.language, track.codec].filter(Boolean).join(" \u00b7 ")}
                                </Text>
                            )}
                        </View>
                        {track.selected && <Check size={14} color={BRAND_ACCENT} />}
                    </PanelSelectableRow>
                )
            })}
        </View>
    )
}

///////////////////////////////////////////////////////////////////////////////
// External subtitle search panel
///////////////////////////////////////////////////////////////////////////////

function ExternalSubtitleSearchContent({
    anilistId,
    preferredSubtitleLanguages,
    wyzieApiKey,
    onSaveWyzieApiKey,
    onAddSubtitle,
}: {
    anilistId?: number
    preferredSubtitleLanguages: string
    wyzieApiKey: string
    onSaveWyzieApiKey: (value: string) => void
    onAddSubtitle: (url: string) => Promise<void>
}) {
    const [results, setResults] = React.useState<WyzieSubtitleResult[]>([])
    const [isSearching, setIsSearching] = React.useState(false)
    const [hasSearched, setHasSearched] = React.useState(false)
    const [addedUrls, setAddedUrls] = React.useState<Set<string>>(new Set())
    const [addingUrl, setAddingUrl] = React.useState<string | null>(null)
    const [searchError, setSearchError] = React.useState<string | null>(null)

    const [showApiKeyInput, setShowApiKeyInput] = React.useState(!wyzieApiKey.trim())

    const initialLanguage = React.useMemo(() => {
        const firstPreference = preferredSubtitleLanguages
            .split(",")
            .map(value => value.trim().toLowerCase())
            .find(Boolean)
        return SUBTITLE_LANGUAGE_OPTIONS.some(option => option.value === firstPreference)
            ? firstPreference ?? "all"
            : "all"
    }, [preferredSubtitleLanguages])

    const [apiKeyDraft, setApiKeyDraft] = React.useState(wyzieApiKey)

    // filters
    const [source, setSource] = React.useState<WyzieSource>("opensubtitles")
    const [language, setLanguage] = React.useState(initialLanguage)
    const [format, setFormat] = React.useState("all")

    // mapping state
    const [mappingId, setMappingId] = React.useState<string | null>(null)
    const [mappingError, setMappingError] = React.useState(false)

    // resolve anilist → TMDB/IMDB on mount
    React.useEffect(() => {
        if (!anilistId) return
        let cancelled = false
        fetchAniZipMapping(anilistId).then(mapping => {
            if (cancelled) return
            const id = mapping?.imdb_id || mapping?.themoviedb_id
            if (id) setMappingId(id)
            else setMappingError(true)
        })
        return () => { cancelled = true }
    }, [anilistId])

    React.useEffect(() => {
        setApiKeyDraft(wyzieApiKey)
    }, [wyzieApiKey])

    const doSearch = React.useCallback(async () => {
        if (!mappingId || !wyzieApiKey.trim()) return
        setIsSearching(true)
        setHasSearched(true)
        setSearchError(null)
        try {
            const raw = await searchSubtitles({
                id: mappingId,
                source,
                key: wyzieApiKey,
                language,
                format,
            })
            setResults(raw)
        }
        catch (e) {
            if (__DEV__) {
                console.error("Subtitle search failed", e)
            }
            setResults([])
            setSearchError(e instanceof Error ? e.message : t("Subtitle search failed"))
        }
        finally {
            setIsSearching(false)
        }
    }, [format, language, mappingId, source, wyzieApiKey])

    // auto-search when mapping, filters, or api key change
    React.useEffect(() => {
        if (mappingId && wyzieApiKey.trim()) doSearch()
    }, [doSearch, mappingId, wyzieApiKey])

    const filtered = filterSubtitles(results, { language, format })

    const handleAdd = React.useCallback(async (sub: WyzieSubtitleResult) => {
        setAddingUrl(sub.url)
        try {
            await onAddSubtitle(sub.url)
            setAddedUrls(prev => new Set(prev).add(sub.url))
        }
        catch {
            setSearchError(t("Failed to add subtitle track"))
        }
        finally {
            setAddingUrl(null)
        }
    }, [onAddSubtitle])

    if (!anilistId) {
        return (
            <View className="items-center gap-2 pt-9">
                <Globe size={28} color="rgba(255,255,255,0.15)" />
                <Text className="text-sm text-white/30">
                    {t("Media info not available")}
                </Text>
            </View>
        )
    }

    if (mappingError) {
        return (
            <View className="items-center gap-2 pt-9">
                <Globe size={28} color="rgba(255,255,255,0.15)" />
                <Text className="text-center text-sm leading-5 text-white/30">
                    {t("Could not resolve media ID.\nSubtitle search is unavailable.")}
                </Text>
            </View>
        )
    }

    return (
        <View className="gap-3">
            <View className="gap-2">
                {showApiKeyInput ? (
                    <View className="gap-2">
                        <FilterRow label={t("Wyzie API Key")}>
                            <TextInput
                                value={apiKeyDraft}
                                onChangeText={setApiKeyDraft}
                                placeholder={t("Enter your Wyzie key")}
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                autoCapitalize="none"
                                autoCorrect={false}
                                secureTextEntry
                                className={PANEL_INPUT_CLASS}
                            />
                        </FilterRow>
                        <View className="flex-row items-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onPress={() => {
                                    onSaveWyzieApiKey(apiKeyDraft.trim())
                                    setShowApiKeyInput(false)
                                }}
                            >
                                <Text className="text-foreground">{t("Save Key")}</Text>
                            </Button>
                        </View>
                    </View>
                ) : (
                    <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => setShowApiKeyInput(true)}
                    >
                        <Text className="text-foreground">{t("Change Key")}</Text>
                    </Button>
                )}
                {!wyzieApiKey.trim() && (
                    <View className="rounded-lg border border-amber-500/15 bg-amber-500/10 p-3">
                        <Text className="text-xs leading-5 text-white/70">
                            {t("Save a Wyzie API key before searching.")}
                        </Text>
                    </View>
                )}
                {searchError && (
                    <View className="rounded-lg border border-red-500/15 bg-red-500/10 p-3">
                        <Text className="text-xs leading-5 text-white/70">
                            {searchError}
                        </Text>
                    </View>
                )}
            </View>


            <View className="gap-2">
                <FilterRow label={t("Source")}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {WYZIE_SOURCES.map(s => (
                            <FilterChip
                                key={s.value}
                                label={s.label}
                                active={source === s.value}
                                onPress={() => setSource(s.value)}
                            />
                        ))}
                    </ScrollView>
                </FilterRow>
                <FilterRow label={t("Language")}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {SUBTITLE_LANGUAGE_OPTIONS.map(l => (
                            <FilterChip
                                key={l.value}
                                label={l.label}
                                active={language === l.value}
                                onPress={() => setLanguage(l.value)}
                            />
                        ))}
                    </ScrollView>
                </FilterRow>
                <FilterRow label={t("Format")}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {SUBTITLE_FORMAT_OPTIONS.map(f => (
                            <FilterChip
                                key={f.value}
                                label={f.label}
                                active={format === f.value}
                                onPress={() => setFormat(f.value)}
                            />
                        ))}
                    </ScrollView>
                </FilterRow>
            </View>


            {isSearching && (
                <View className="items-center gap-2 py-6">
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                    <Text className="text-xs text-white/35">{t("Searching...")}</Text>
                </View>
            )}

            {!isSearching && wyzieApiKey.trim() && hasSearched && filtered.length === 0 && (
                <View className="items-center gap-2 py-6">
                    <Search size={22} color="rgba(255,255,255,0.15)" />
                    <Text className="text-xs text-white/30">
                        {t("No subtitles found")}
                    </Text>
                    {results.length > 0 && (
                        <Text className="text-center text-xs text-white/20">
                            {tn("{{count}} result before filtering", "{{count}} results before filtering", results.length)}
                        </Text>
                    )}
                </View>
            )}


            {!isSearching && wyzieApiKey.trim() && filtered.length > 0 && (
                <View className="gap-0.5">
                    <Text className="mb-1 px-0.5 text-xs font-semibold uppercase tracking-wider text-white/25">
                        {tn("{{count}} result", "{{count}} results", filtered.length)}
                    </Text>
                    <View className={PANEL_CARD_CLASS}>
                        {filtered.map((sub, idx) => {
                            const isAdded = addedUrls.has(sub.url)
                            const isAdding = addingUrl === sub.url
                            return (
                                <PanelSelectableRow
                                    key={`${sub.url}-${idx}`}
                                    active={isAdded}
                                    borderTop={idx > 0}
                                    onPress={() => { if (!isAdded && !isAdding) handleAdd(sub) }}
                                    disabled={isAdded || isAdding}
                                >
                                    <View className="mr-2 flex-1 gap-0.5">
                                        {sub.releaseName && (
                                            <Text className="text-xs font-medium text-white/75" numberOfLines={1}>
                                                {sub.releaseName}
                                            </Text>
                                        )}
                                        <View className="flex-row flex-wrap items-center gap-1.5">
                                            <Text className={cn("text-xs font-semibold text-white", isAdded && "text-player-text")}>
                                                {sub.display}
                                            </Text>
                                            <View className="rounded bg-white/10 px-1.5 py-0.5">
                                                <Text className="text-xs font-semibold text-white/50">
                                                    {sub.format.toUpperCase()}
                                                </Text>
                                            </View>
                                            {sub.isHearingImpaired && (
                                                <View className="rounded bg-blue-500/15 px-1.5 py-0.5">
                                                    <Text className="text-xs font-semibold text-blue-200/80">CC</Text>
                                                </View>
                                            )}
                                            <Text className="text-xs text-white/20">
                                                {sub.source}
                                            </Text>
                                        </View>
                                    </View>
                                    {isAdding ? (
                                        <ActivityIndicator size="small" color={BRAND_ACCENT} />
                                    ) : isAdded ? (
                                        <Check size={14} color={BRAND_ACCENT} />
                                    ) : (
                                        <Download size={14} color="rgba(255,255,255,0.4)" />
                                    )}
                                </PanelSelectableRow>
                            )
                        })}
                    </View>
                </View>
            )}


            {/* <Text style={{ color: "rgba(255,255,255,0.15)", fontSize: 10, textAlign: "center", marginTop: 4 }}>
             Powered by Wyzie Subs
             </Text> */}
        </View>
    )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View className="gap-1">
            <Text className="px-0.5 text-xs font-bold uppercase tracking-wider text-white/25">
                {label}
            </Text>
            {children}
        </View>
    )
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const [focused, setFocused] = React.useState(false)

    return (
        <Pressable
            onPress={onPress}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        >
            {({ pressed }) => (
                <View
                    className={cn(
                        "rounded-lg border px-2.5 py-1.5",
                        active
                            ? "border-player-tint/25 bg-player-tint/15"
                            : pressed || focused ? "border-white/30 bg-white/10" : "border-white/5 bg-white/5",
                    )}
                >
                    <Text className={cn("text-xs text-white/50", active && "font-semibold text-player-text")}>
                        {label}
                    </Text>
                </View>
            )}
        </Pressable>
    )
}

function LanguagePrefContent({ label, current, onSave }: {
    label: string; current: string; onSave: (v: string) => void
}) {
    const [value, setValue] = React.useState(current)
    return (
        <View className="gap-4">
            <Text className="text-sm leading-5 text-white/50">
                {t("Enter comma-separated language codes in priority order. The first matching track will be auto-selected when a file loads.")}
            </Text>
            <View className="gap-1.5">
                <SectionLabel>{t("Preferred {{label}} Languages", { label })}</SectionLabel>
                <TextInput
                    value={value}
                    onChangeText={setValue}
                    placeholder={t("e.g. jpn, jp, ja, japanese")}
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className={PANEL_INPUT_CLASS}
                />
            </View>
            <Pressable onPress={() => onSave(value)}>
                {({ pressed }) => (
                    <View className={cn("items-center rounded-xl border border-player-tint/25 bg-player-tint/15 py-3", pressed && "opacity-70")}>
                        <Text className="text-sm font-semibold text-player-text">{t("Save")}</Text>
                    </View>
                )}
            </Pressable>
            <View className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <Text className="text-xs leading-4 text-white/30">
                    {t("Examples:\n\u2022 Japanese audio: jpn, jp, ja, japanese\n\u2022 English subs: eng, en, english\n\u2022 Multi: jpn, eng, kor")}
                </Text>
            </View>
        </View>
    )
}

function SubtitleLanguagePrefContent({
    preferred,
    ignored,
    onSave,
}: {
    preferred: string
    ignored: string
    onSave: (pref: string, ignored: string) => void
}) {
    const [prefVal, setPrefVal] = React.useState(preferred)
    const [ignoredVal, setIgnoredVal] = React.useState(ignored)

    return (
        <View className="gap-4">
            <Text className="text-sm leading-5 text-white/50">
                {t("Configure subtitle track defaults and filters. The first matching track that does not contain any of the ignored labels will be selected.")}
            </Text>
            <View className="gap-1.5">
                <SectionLabel>{t("Preferred Subtitle Languages")}</SectionLabel>
                <TextInput
                    value={prefVal}
                    onChangeText={setPrefVal}
                    placeholder={t("e.g. eng, en, english")}
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className={PANEL_INPUT_CLASS}
                />
            </View>
            <View className="gap-1.5">
                <SectionLabel>{t("Ignored Labels")}</SectionLabel>
                <TextInput
                    value={ignoredVal}
                    onChangeText={setIgnoredVal}
                    placeholder={t("e.g. signs & songs, signs, songs")}
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className={PANEL_INPUT_CLASS}
                />
                <Text className="text-xs text-white/30 px-0.5">
                    {t("Avoid tracks containing these labels (comma-separated).")}
                </Text>
            </View>
            <Pressable onPress={() => onSave(prefVal, ignoredVal)}>
                {({ pressed }) => (
                    <View className={cn("items-center rounded-xl border border-player-tint/25 bg-player-tint/15 py-3", pressed && "opacity-70")}>
                        <Text className="text-sm font-semibold text-player-text">{t("Save")}</Text>
                    </View>
                )}
            </Pressable>
            <View className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <Text className="text-xs leading-4 text-white/30">
                    {t("Examples:\n\u2022 Preferred: eng, en, english\n\u2022 Ignored: signs & songs, signs, songs, sign, song")}
                </Text>
            </View>
        </View>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Shared helpers
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// Episodes list panel
///////////////////////////////////////////////////////////////////////////////

function EpisodesListContent({
    episodes,
    currentEpisodeNumber,
    onSelect,
}: {
    episodes: Anime_Episode[]
    currentEpisodeNumber?: number
    onSelect: (ep: Anime_Episode) => void
}) {
    if (episodes.length === 0) {
        return (
            <Text className="py-6 text-center text-sm text-white/40">
                {t("No episodes available")}
            </Text>
        )
    }

    return (
        <View className="gap-px">
            {episodes.map((ep) => {
                const isCurrent = ep.episodeNumber === currentEpisodeNumber
                return (
                    <PanelSelectableRow
                        key={ep.episodeNumber}
                        onPress={() => onSelect(ep)}
                        disabled={isCurrent}
                        active={isCurrent}
                        className="rounded-lg px-2 py-2.5"
                    >
                                <Text className={cn("w-8 text-center text-sm font-bold", isCurrent ? "text-player-text" : "text-white/35")}>
                                    {ep.episodeNumber}
                                </Text>
                                <View className={cn("h-5 w-px", isCurrent ? "bg-player-text/25" : "bg-white/10")} />
                                <View className="min-w-0 flex-1">
                                    <Text className={cn("text-sm text-white/75", isCurrent && "font-semibold text-white")} numberOfLines={1}>
                                        {ep.displayTitle}
                                    </Text>
                                    {ep.episodeTitle ? (
                                        <Text className={cn("mt-0.5 text-xs text-white/30", isCurrent && "text-white/50")} numberOfLines={1}>
                                            {ep.episodeTitle}
                                        </Text>
                                    ) : null}
                                </View>
                                <View className="flex-row items-center gap-1">
                                    {isCurrent && <Play size={11} color={BRAND_ACCENT} fill={BRAND_ACCENT} />}
                                </View>
                    </PanelSelectableRow>
                )
            })}
        </View>
    )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <Text className="mb-1.5 px-0.5 text-xs font-bold uppercase tracking-wider text-white/35">
            {children as string}
        </Text>
    )
}

function SettingsCard({
    rows, onNavigate, onStartPiP, onToggleAutoNext,
    onToggleCenterTapPlayPause, onToggleSideSwipeControls, onToggleAutoSkipOpEd, onToggleStats, onLockScreen,
}: {
    rows: Array<{
        label: string; value: string; panel: PlayerPanel; icon: React.ReactNode
        accent?: string; action?: "pip" | "lock" | "toggle-auto-next" | "toggle-center-tap" | "toggle-side-swipe" | "toggle-auto-skip-op-ed" | "toggle-stats"
    }>
    onNavigate: (p: PlayerPanel) => void
    onStartPiP?: () => void; onToggleAutoNext?: () => void
    onToggleCenterTapPlayPause?: () => void; onToggleSideSwipeControls?: () => void
    onToggleAutoSkipOpEd?: () => void
    onToggleStats?: () => void
    onLockScreen?: () => void
}) {
    return (
        <View className={PANEL_CARD_CLASS}>
            {rows.map((row, idx) => (
                <PanelSelectableRow
                    key={`${row.panel}-${row.label}`}
                    borderTop={idx > 0}
                    onPress={() => {
                        if (row.action === "pip" && onStartPiP) onStartPiP()
                        else if (row.action === "toggle-auto-next" && onToggleAutoNext) onToggleAutoNext()
                        else if (row.action === "toggle-center-tap" && onToggleCenterTapPlayPause) onToggleCenterTapPlayPause()
                        else if (row.action === "toggle-side-swipe" && onToggleSideSwipeControls) onToggleSideSwipeControls()
                        else if (row.action === "toggle-auto-skip-op-ed" && onToggleAutoSkipOpEd) onToggleAutoSkipOpEd()
                        else if (row.action === "toggle-stats" && onToggleStats) onToggleStats()
                        else if (row.action === "lock" && onLockScreen) onLockScreen()
                        else onNavigate(row.panel)
                    }}
                >
                    <View className="mr-3 items-center justify-center" style={{ width: 20, height: 20 }}>
                        {row.icon}
                    </View>
                    <Text className="flex-1 text-sm text-white/90">
                        {row.label}
                    </Text>
                    <Text className={cn("mr-1.5 max-w-28 text-xs", getAccentTextClass(row.accent))} numberOfLines={1}>
                        {row.value}
                    </Text>
                    {!row.action && <ChevronRight size={13} color="rgba(255,255,255,0.22)" />}
                </PanelSelectableRow>
            ))}
        </View>
    )
}

function StepperButton({ onPress, icon }: { onPress: () => void; icon: React.ReactNode }) {
    return (
        <Pressable onPress={onPress}>
            {({ pressed }) => (
                <View
                    className={cn("size-12 items-center justify-center rounded-full border border-white/10",
                        pressed ? "bg-white/12" : "bg-white/5")}
                >
                    {icon}
                </View>
            )}
        </Pressable>
    )
}
