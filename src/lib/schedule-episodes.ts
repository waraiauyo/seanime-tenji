import type { Anime_Episode, Anime_UpcomingEpisode } from "@/api/generated/types"
import { getDateLocale, t } from "@/lib/i18n"
import { format, isValid, parseISO } from "date-fns"

export type ShelfEpisode = Anime_Episode | Anime_UpcomingEpisode

export function getShelfTitle(episode: ShelfEpisode, hideTitle: boolean) {
    const fallback = t("Episode {{number}}", { number: episode.episodeNumber })

    if (!("airingAt" in episode) && episode.isMissingGroup) {
        return episode.displayTitle || fallback
    }

    if (hideTitle) return fallback

    return episode.episodeMetadata?.title || fallback
}

export function getShelfBadge(episode: ShelfEpisode) {
    if ("airingAt" in episode) {
        return format(new Date(episode.airingAt * 1000), t("EEE, MMM d · HH:mm"), { locale: getDateLocale() })
    }

    const value = episode.episodeMetadata?.airDate
    if (!value) return null

    const date = parseISO(value)
    return isValid(date) ? format(date, t("MMM d, yyyy"), { locale: getDateLocale() }) : value
}
