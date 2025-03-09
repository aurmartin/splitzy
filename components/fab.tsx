import React, { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { Pressable } from "@/components/pressable";
import { Colors } from "../lib/constants";
import { useOptionalSnackBar } from "./snack-bar";

type Props = PropsWithChildren<{
  onPress: () => void;
}>;

export default function FAB(props: Props) {
  const { children, onPress } = props;
  const snackBar = useOptionalSnackBar();

  const bottom = snackBar?.snack ? 20 + 40 : 20;

  return (
    <View style={[styles.wrapper, { bottom }]}>
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
    bottom: 20,
    right: 8,
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
