import { StackScreen_MainStyle } from "@/components/shared/styles"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Stack } from "expo-router"
import { View } from "react-native"

export default function MangaLayout() {
    return (
        <View className={cn("bg-background flex-1")}>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen
                    name="index"
                    options={{
                        title: t("Manga"),
                        ...StackScreen_MainStyle,
                    }}
                />
            </Stack>
        </View>
    )
}
