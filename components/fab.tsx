import React, { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { Pressable } from "@/components/pressable";
import { Colors } from "../lib/constants";

type Props = PropsWithChildren<{
  onPress: () => void;
}>;

export default function FAB(props: Props) {
  const { children, onPress } = props;

  return (
    <View style={styles.wrapper}>
      <Pressable
        testID="fab-button"
        style={styles.fab}
        onPress={onPress}
        android_ripple={{ color: Colors.primaryLight }}
      >
        {children}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 30,
    right: 16,
    zIndex: 100,
  },
  fab: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "black",
  },
});
