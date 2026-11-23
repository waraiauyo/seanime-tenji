import { HibikeManga_ChapterDetails, Manga_Entry } from "@/api/generated/types"
import { getDownloadNetworkBlockReason } from "@/atoms/download-settings.atoms"
import { useServerUrl } from "@/atoms/server.atoms"
import { formatBytes } from "@/lib/downloads/download-manager"
import {
    cancelMangaChapterDownload,
    clearAllMangaDownloads,
    deleteAllMangaDownloadsForMedia,
    deleteMangaChapterDownload,
    enqueueMangaChapterDownloads,
    getLocalChapterPages,
    getMangaDownloadDiskUsage,
    getMangaDownloadQueueLength,
    isMangaChapterDownloading,
    resumeMangaChapterDownload,
    resumeStalledMangaDownloads,
    retryFailedMangaDownloads,
    retryMangaChapterDownload,
} from "@/lib/downloads/manga-download-manager"
import {
    batchMangaDownloadStoreWrites,
    type DownloadedMangaChapter,
    type DownloadedMangaInfo,
    getActiveMangaDownloads,
    getAllDownloadedChaptersForMediaAllProviders,
    getAllDownloadedManga,
    getCompletedChaptersForMedia,
    getDownloadedChaptersForMedia,
    getDownloadedMangaChapter,
    getFailedMangaDownloads,
    getMangaChapterDownloadStatus,
    getMangaDownloadRevision,
    isMangaChapterDownloaded,
    type MangaDownloadStatus,
    subscribeToMangaDownloadChanges,
} from "@/lib/downloads/manga-download-store"
import { t, tn } from "@/lib/i18n"
import { toast } from "@/lib/utils/toast"
import { useCallback, useMemo, useSyncExternalStore } from "react"

function useMangaDownloadRevision(): number {
    return useSyncExternalStore(subscribeToMangaDownloadChanges, getMangaDownloadRevision)
}

////////////////////////// Chapter-level hooks

/**
 * Check if a specific chapter is downloaded locally.
 */
export function useIsMangaChapterDownloaded(
    mediaId: number | undefined,
    provider: string | undefined | null,
    chapterId: string | undefined,
): boolean {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        if (!mediaId || !provider || !chapterId) return false
        return isMangaChapterDownloaded(mediaId, provider, chapterId)
    }, [mediaId, provider, chapterId, rev])
}

/**
 * Get the download record for a chapter (status, progress, etc).
 */
export function useMangaChapterDownloadInfo(
    mediaId: number | undefined,
    provider: string | undefined | null,
    chapterId: string | undefined,
): DownloadedMangaChapter | undefined {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        if (!mediaId || !provider || !chapterId) return undefined
        return getDownloadedMangaChapter(mediaId, provider, chapterId)
    }, [mediaId, provider, chapterId, rev])
}

/**
 * Get the current download status for a chapter.
 */
export function useMangaChapterDownloadStatus(
    mediaId: number | undefined,
    provider: string | undefined | null,
    chapterId: string | undefined,
): MangaDownloadStatus | null {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        if (!mediaId || !provider || !chapterId) return null
        return getMangaChapterDownloadStatus(mediaId, provider, chapterId)
    }, [mediaId, provider, chapterId, rev])
}

/**
 * Check if a chapter is actively downloading right now.
 */
export function useIsMangaChapterDownloading(
    mediaId: number | undefined,
    provider: string | undefined | null,
    chapterId: string | undefined,
): boolean {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        if (!mediaId || !provider || !chapterId) return false
        return isMangaChapterDownloading(mediaId, provider, chapterId)
    }, [mediaId, provider, chapterId, rev])
}

////////////////////////// Media-level hooks

/**
 * Get all downloaded chapters for a media+provider.
 */
export function useDownloadedMangaChapters(
    mediaId: number | undefined,
    provider: string | undefined | null,
): DownloadedMangaChapter[] {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        if (!mediaId || !provider) return []
        return getDownloadedChaptersForMedia(mediaId, provider)
    }, [mediaId, provider, rev])
}

/**
 * Get only completed chapters for a media+provider.
 */
export function useCompletedMangaChapters(
    mediaId: number | undefined,
    provider: string | undefined | null,
): DownloadedMangaChapter[] {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        if (!mediaId || !provider) return []
        return getCompletedChaptersForMedia(mediaId, provider)
    }, [mediaId, provider, rev])
}

/**
 * Get all downloaded chapters across all providers for a media.
 */
export function useAllDownloadedMangaChapters(
    mediaId: number | undefined,
): DownloadedMangaChapter[] {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        if (!mediaId) return []
        return getAllDownloadedChaptersForMediaAllProviders(mediaId)
    }, [mediaId, rev])
}

////////////////////////// Library-level hooks

/**
 * Get all manga that have downloaded chapters.
 */
export function useAllDownloadedManga(): DownloadedMangaInfo[] {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        return getAllDownloadedManga()
    }, [rev])
}

/**
 * Get current download queue length.
 */
export function useMangaDownloadQueueLength(): number {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        return getMangaDownloadQueueLength()
    }, [rev])
}

/**
 * Disk usage of manga downloads directory.
 */
export function useMangaDownloadDiskUsage(): { bytes: number; formatted: string } {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        const bytes = getMangaDownloadDiskUsage()
        return { bytes, formatted: formatBytes(bytes) }
    }, [rev])
}

////////////////////////// Action hooks

/**
 * Returns a function to queue chapters for local download.
 */
export function useStartMangaChapterDownload(
    entry: Manga_Entry | undefined,
    provider: string | undefined | null,
) {
    const serverUrl = useServerUrl()

    return useCallback(
        (chapters: Array<Pick<HibikeManga_ChapterDetails, "id" | "chapter" | "title" | "scanlator">>) => {
            void (async () => {
                if (!serverUrl || !entry || !provider) {
                    toast.error(t("Server not connected"))
                    return
                }

                const networkBlockReason = await getDownloadNetworkBlockReason()
                if (networkBlockReason) {
                    toast.error(networkBlockReason)
                    return
                }

                const mapped = chapters.map(ch => ({
                    chapterId: ch.id,
                    chapterNumber: ch.chapter,
                    title: ch.title || `Chapter ${ch.chapter}`,
                    scanlator: ch.scanlator,
                }))

                toast.info(tn("Downloading {{count}} chapter...", "Downloading {{count}} chapters...", mapped.length))
                enqueueMangaChapterDownloads(
                    serverUrl,
                    entry,
                    provider,
                    mapped,
                )
            })()
        },
        [serverUrl, entry, provider],
    )
}

/**
 * Returns a function to cancel a single chapter download.
 */
export function useCancelMangaChapterDownload() {
    return useCallback(
        (mediaId: number, provider: string, chapterId: string) => {
            cancelMangaChapterDownload(mediaId, provider, chapterId)
        },
        [],
    )
}

/**
 * Returns a function to delete a single downloaded chapter.
 */
export function useDeleteMangaChapterDownload() {
    return useCallback(
        (mediaId: number, provider: string, chapterId: string) => {
            deleteMangaChapterDownload(mediaId, provider, chapterId)
            toast.info(t("Chapter deleted"))
        },
        [],
    )
}

export function useDeleteMangaQueueItems() {
    return useCallback(
        (chapters: DownloadedMangaChapter[]) => {
            if (chapters.length === 0) return

            batchMangaDownloadStoreWrites(() => {
                for (const chapter of chapters) {
                    deleteMangaChapterDownload(chapter.mediaId, chapter.provider, chapter.chapterId)
                }
            })

            toast.info(tn("Removed {{count}} queued chapter", "Removed {{count}} queued chapters", chapters.length))
        },
        [],
    )
}

/**
 * Returns a function to delete all downloaded chapters for a manga.
 */
export function useDeleteAllMangaDownloadsForMedia() {
    return useCallback(
        (mediaId: number) => {
            void (async () => {
                await deleteAllMangaDownloadsForMedia(mediaId)
                toast.info(t("All chapters deleted"))
            })()
        },
        [],
    )
}

/**
 * Returns a function to clear all manga downloads.
 */
export function useClearAllMangaDownloads() {
    return useCallback(() => {
        void (async () => {
            await clearAllMangaDownloads()
            toast.info(t("All manga downloads cleared"))
        })()
    }, [])
}

/**
 * Get local file paths for a downloaded chapter's pages.
 */
export function useLocalMangaChapterPages(
    mediaId: number | undefined,
    provider: string | undefined | null,
    chapterId: string | undefined,
): string[] {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        if (!mediaId || !provider || !chapterId) return []
        return getLocalChapterPages(mediaId, provider, chapterId)
    }, [mediaId, provider, chapterId, rev])
}

/**
 * Get active (pending/downloading) manga chapter downloads.
 */
export function useActiveMangaDownloads(): DownloadedMangaChapter[] {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        return getActiveMangaDownloads()
    }, [rev])
}

export function useFailedMangaDownloads(): DownloadedMangaChapter[] {
    "use no memo"

    const rev = useMangaDownloadRevision()
    return useMemo(() => {
        void rev
        return getFailedMangaDownloads()
    }, [rev])
}

export function useRetryMangaChapterDownload() {
    const serverUrl = useServerUrl()

    return useCallback(
        (chapter: DownloadedMangaChapter) => {
            void (async () => {
                if (!serverUrl) {
                    toast.error(t("Server not connected"))
                    return
                }

                const networkBlockReason = await getDownloadNetworkBlockReason()
                if (networkBlockReason) {
                    toast.error(networkBlockReason)
                    return
                }

                toast.info(t("Retrying Chapter {{number}}...", { number: chapter.chapterNumber }))
                retryMangaChapterDownload(serverUrl, chapter)
            })()
        },
        [serverUrl],
    )
}

export function useRetryAllFailedMangaDownloads() {
    const serverUrl = useServerUrl()

    return useCallback(
        (chapters: DownloadedMangaChapter[]) => {
            void (async () => {
                if (chapters.length === 0) return
                if (!serverUrl) {
                    toast.error(t("Server not connected"))
                    return
                }

                const networkBlockReason = await getDownloadNetworkBlockReason()
                if (networkBlockReason) {
                    toast.error(networkBlockReason)
                    return
                }

                toast.info(tn("Retrying {{count}} failed chapter...", "Retrying {{count}} failed chapters...", chapters.length))
                retryFailedMangaDownloads(serverUrl, chapters)
            })()
        },
        [serverUrl],
    )
}

export function useResumeMangaChapterDownload() {
    const serverUrl = useServerUrl()

    return useCallback(
        (chapter: DownloadedMangaChapter) => {
            void (async () => {
                if (!serverUrl) {
                    toast.error(t("Server not connected"))
                    return
                }

                const networkBlockReason = await getDownloadNetworkBlockReason()
                if (networkBlockReason) {
                    toast.error(networkBlockReason)
                    return
                }

                toast.info(t("Resuming Chapter {{number}}...", { number: chapter.chapterNumber }))
                resumeMangaChapterDownload(serverUrl, chapter)
            })()
        },
        [serverUrl],
    )
}

export function useResumeAllMangaDownloads() {
    const serverUrl = useServerUrl()

    return useCallback(
        (chapters: DownloadedMangaChapter[]) => {
            void (async () => {
                if (chapters.length === 0) return
                if (!serverUrl) {
                    toast.error(t("Server not connected"))
                    return
                }

                const networkBlockReason = await getDownloadNetworkBlockReason()
                if (networkBlockReason) {
                    toast.error(networkBlockReason)
                    return
                }

                toast.info(tn("Resuming {{count}} queued chapter...", "Resuming {{count}} queued chapters...", chapters.length))
                resumeStalledMangaDownloads(serverUrl, chapters)
            })()
        },
        [serverUrl],
    )
}
