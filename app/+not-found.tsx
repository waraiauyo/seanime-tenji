import { Text } from "@/components/ui/text"
import { t } from "@/lib/i18n"
import { Link, Stack } from "expo-router"
import { View } from "react-native"

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: t("Oops!") }} />
            <View>
                <Text>{t("This screen doesn't exist.")}</Text>

                <Link href="/(app)/(tabs)/(library)">
                    <Text>{t("Go to home screen!")}</Text>
                </Link>
            </View>
        </>
    )
}
