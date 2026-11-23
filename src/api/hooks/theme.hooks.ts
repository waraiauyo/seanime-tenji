import { useServerMutation, useServerQuery } from "@/api/client/requests"
import { UpdateTheme_Variables } from "@/api/generated/endpoint.types"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { Models_Theme } from "@/api/generated/types"
import { t } from "@/lib/i18n"
import { toast } from "@/lib/utils/toast"
import { useQueryClient } from "@tanstack/react-query"

export function useGetTheme() {
    return useServerQuery<Models_Theme>({
        endpoint: API_ENDPOINTS.THEME.GetTheme.endpoint,
        method: API_ENDPOINTS.THEME.GetTheme.methods[0],
        queryKey: [API_ENDPOINTS.THEME.GetTheme.key],
        enabled: true,
    })
}

export function useUpdateTheme() {
    const queryClient = useQueryClient()

    return useServerMutation<Models_Theme, UpdateTheme_Variables>({
        endpoint: API_ENDPOINTS.THEME.UpdateTheme.endpoint,
        method: API_ENDPOINTS.THEME.UpdateTheme.methods[0],
        mutationKey: [API_ENDPOINTS.THEME.UpdateTheme.key],
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.STATUS.GetStatus.key] })
            toast.success(t("UI settings saved"))
        },
    })
}

