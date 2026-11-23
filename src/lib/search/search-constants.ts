import { AL_MediaFormat } from "@/api/generated/types"
import { t } from "@/lib/i18n"

export const SEARCH_MEDIA_GENRES = [
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Ecchi",
    "Fantasy",
    "Horror",
    "Mahou Shoujo",
    "Mecha",
    "Music",
    "Mystery",
    "Psychological",
    "Romance",
    "Sci-Fi",
    "Slice of Life",
    "Sports",
    "Supernatural",
    "Thriller",
]

export const SEARCH_SEASONS = [
    { value: "WINTER", label: t("Winter") },
    { value: "SPRING", label: t("Spring") },
    { value: "SUMMER", label: t("Summer") },
    { value: "FALL", label: t("Fall") },
] as const

export const SEARCH_FORMATS_ANIME: { value: AL_MediaFormat; label: string }[] = [
    { value: "TV", label: t("TV") },
    { value: "MOVIE", label: t("Movie") },
    { value: "ONA", label: t("ONA") },
    { value: "OVA", label: t("OVA") },
    { value: "TV_SHORT", label: t("TV Short") },
    { value: "SPECIAL", label: t("Special") },
]

export const SEARCH_FORMATS_MANGA: { value: AL_MediaFormat; label: string }[] = [
    { value: "MANGA", label: t("Manga") },
    { value: "ONE_SHOT", label: t("One Shot") },
]

export const SEARCH_COUNTRIES_MANGA = [
    { value: "JP", label: t("Japan") },
    { value: "KR", label: t("South Korea") },
    { value: "CN", label: t("China") },
    { value: "TW", label: t("Taiwan") },
]

export const SEARCH_STATUS = [
    { value: "FINISHED", label: t("Finished") },
    { value: "RELEASING", label: t("Releasing") },
    { value: "NOT_YET_RELEASED", label: t("Upcoming") },
    { value: "HIATUS", label: t("Hiatus") },
    { value: "CANCELLED", label: t("Cancelled") },
]

export const SEARCH_SORTING_ANIME = [
    { value: "TRENDING_DESC", label: t("Trending") },
    { value: "START_DATE_DESC", label: t("Release date") },
    { value: "SCORE_DESC", label: t("Highest score") },
    { value: "POPULARITY_DESC", label: t("Most popular") },
    { value: "EPISODES_DESC", label: t("Most episodes") },
]

export const SEARCH_SORTING_MANGA = [
    { value: "TRENDING_DESC", label: t("Trending") },
    { value: "START_DATE_DESC", label: t("Release date") },
    { value: "SCORE_DESC", label: t("Highest score") },
    { value: "POPULARITY_DESC", label: t("Most popular") },
    { value: "CHAPTERS_DESC", label: t("Most chapters") },
]

export const CURRENT_YEAR = new Date().getFullYear()
export const SEARCH_YEARS = Array.from({ length: CURRENT_YEAR - 1990 + 2 }, (_, i) =>
    String(CURRENT_YEAR + 1 - i),
)

export const SEARCH_MIN_SCORES = Array.from({ length: 9 }, (_, index) => ({
    value: String(index + 1),
    label: `${index + 1}+`,
}))
