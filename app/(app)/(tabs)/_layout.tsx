import { useCurrentUser } from "@/atoms/server.atoms"
import { AppTabConfig, TabBar } from "@/components/layout/tabs"
import { TVNavBar } from "@/components/tv/tv-nav-bar"
import { t } from "@/lib/i18n"
import { Tabs } from "expo-router/js-tabs"
import * as React from "react"
import { Platform, View } from "react-native"

export const unstable_settings = {
    initialRouteName: "(library)",
}

export default function TabLayout() {

    const user = useCurrentUser()

    const tabs: AppTabConfig[] = [
        {
            show: true,
            name: "(library)",
            displayName: t("Anime"),
            icon: "tv",
        },
        {
            show: true,
            name: "(manga)",
            displayName: t("Manga"),
            icon: "book",
        },
        {
            show: true,
            name: "schedule",
            displayName: t("Schedule"),
            icon: "calendar",
        },
        {
            show: true,
            name: "discover",
            displayName: t("Discover"),
            icon: "compass",
        },
        {
            show: true,
            name: "(profile)",
            displayName: t("Profile"),
            icon: "cog-outline",
        },
        {
            show: false,
            name: "my-lists",
            displayName: t("My Lists"),
            icon: "albums",
        },
    ]

    if (Platform.isTV) {
        return (
            <View className="flex-1 bg-background">
                <View className="flex-1">
                    <Tabs
                        detachInactiveScreens
                        screenOptions={{
                            headerShown: false,
                            animation: "none",
                            tabBarStyle: { display: "none" },
                        }}
                    >
                        {tabs.map(tab => (
                            <Tabs.Screen
                                key={tab.name}
                                name={tab.name}
                                options={{
                                    ...tab.options,
                                    headerTitle: tab.displayName,
                                }}
                            />
                        ))}
                    </Tabs>
                </View>
                <TVNavBar />
            </View>
        )
    }

    return (
        <Tabs
            screenOptions={{ headerShown: false }}
            tabBar={props => <TabBar user={user} tabs={tabs} {...props} />}
        >
            {tabs.map(tab => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        ...tab.options,
                        headerTitle: tab.displayName,
                    }}
                />
            ))}
        </Tabs>
    )
}
