import { useColorScheme } from "@/lib/useColorScheme"
import { cn } from "@/lib/utils"
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect"
import * as React from "react"
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { withUniwind } from "uniwind"

// iOS 26+: floating bars use the system Liquid Glass material instead of a solid background
export const USE_LIQUID_GLASS = Platform.OS === "ios" && !Platform.isTV && isLiquidGlassAvailable()

// unselected items: the default gray is too dark to read on the dark glass
export const BAR_ITEM_INACTIVE = USE_LIQUID_GLASS ? "text-white/70" : "text-gray"

const StyledGlassView = withUniwind(GlassView)

type GlassBarProps = {
    /** applied in both modes */
    className?: string
    style?: StyleProp<ViewStyle>
    /** applied only to the solid fallback (background, clipping, shadow…) */
    solidClassName?: string
    solidStyle?: StyleProp<ViewStyle>
    children?: React.ReactNode
}

/**
 * Background surface for the floating bars (main tab bar, entry view switchers).
 * Renders interactive Liquid Glass when available, the solid bar otherwise.
 */
export function GlassBar({ className, style, solidClassName, solidStyle, children }: GlassBarProps) {
    const { isDarkColorScheme } = useColorScheme()

    if (USE_LIQUID_GLASS) {
        return (
            <StyledGlassView
                isInteractive
                colorScheme={isDarkColorScheme ? "dark" : "light"}
                className={className}
                // no clipping, so the interactive glass can stretch when touched
                style={[styles.glass, style]}
            >
                {children}
            </StyledGlassView>
        )
    }

    return (
        <View className={cn(className, solidClassName)} style={[style, solidStyle]}>
            {children}
        </View>
    )
}

const styles = StyleSheet.create({
    glass: {
        borderRadius: 36,
        borderCurve: "continuous",
    },
})
