import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Screen } from "@/components/screen";
import { Colors } from "@/lib/constants";
import { Text } from "@/components/text";

export default function LoadingScreen(props: { message: string }) {
  return (
    <Screen>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text>{props.message}</Text>
      </View>
    </Screen>
  );
}
