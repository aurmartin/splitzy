import { Text } from "@/components/text";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

interface TopBarProps {
  title?: string;
  rightActions?: React.ReactNode[];
}

export const TopBar = ({ title, rightActions }: TopBarProps) => {
  const router = useRouter();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      <Pressable
        style={{ backgroundColor: "white", padding: 8, borderRadius: 24 }}
        onPress={() => router.back()}
        android_ripple={{ color: "hsl(0 0% 90%)" }}
        testID="topbar-back-button"
      >
        <Ionicons name="arrow-back-outline" size={24} color="hsl(0 0% 40%)" />
      </Pressable>

      {title && (
        <Text type="display" style={{ marginLeft: 16 }}>
          {title}
        </Text>
      )}

      {rightActions && (
        <View style={{ marginLeft: "auto", flexDirection: "row", gap: 8 }}>
          {rightActions}
        </View>
      )}
    </View>
  );
};
