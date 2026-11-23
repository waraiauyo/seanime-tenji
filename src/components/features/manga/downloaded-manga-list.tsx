import { DownloadedMediaShelf } from "@/components/features/media/downloaded-media-shelf"
import { LuffyError } from "@/components/shared/luffy-error"
import { useAllDownloadedManga } from "@/lib/downloads"
import { t } from "@/lib/i18n"
import { useIsServerConnected } from "@/lib/offline"

export function DownloadedMangaList() {
    const downloadedManga = useAllDownloadedManga()
    const isConnected = useIsServerConnected()

    if (!downloadedManga?.length && !isConnected) return <LuffyError title={t("No downloaded manga")} />

    return <DownloadedMediaShelf type="manga" items={downloadedManga} />
}
