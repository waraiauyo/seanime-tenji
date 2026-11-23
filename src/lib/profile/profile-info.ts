import { t, tc } from "@/lib/i18n"
import type { ActiveStreamSession } from "@/lib/player"
import { getPlatformExternalPlayers } from "@/lib/player/external-players"

export function playerLabel(template: string | null): string {
    if (!template) return t("Built-in player")
    const match = getPlatformExternalPlayers().find(player => player.urlTemplate === template)
    return match?.name ?? tc("player", "Custom")
}

export function downloadLabel({
    active,
    failed,
    downloaded,
    size,
    media,
}: {
    active: number
    failed: number
    downloaded: number
    size: string
    media: string
}) {
    const parts: string[] = []
    if (active > 0) parts.push(t("{{count}} in queue", { count: active }))
    if (failed > 0) parts.push(t("{{count}} failed", { count: failed }))
    if (parts.length > 0) return parts.join(" · ")
    if (downloaded > 0) return `${downloaded} ${media} · ${size}`
    return t("No downloads")
}

export function streamLabel(stream: ActiveStreamSession) {
    const mode = stream.streamMode === "debrid" ? t("Debrid streaming") : t("Torrent streaming")
    return stream.subtitle ? `${mode} (${stream.subtitle})` : mode
}
