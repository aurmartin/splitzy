import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import React from "react";

interface TopBarActionProps {
  onPress?: () => void;
  iconName: keyof typeof Ionicons.glyphMap;
  label?: string;
  type?: "normal" | "destructive";
}

const TopBarAction = (props: TopBarActionProps) => {
  const { onPress, iconName, label, type = "normal" } = props;

  const backgroundColor = React.useMemo(() => {
    if (type === "destructive") {
      return "hsl(348, 45%, 85%)";
    }
    return "white";
  }, [type]);

  const rippleColor = React.useMemo(() => {
    if (type === "destructive") {
      return "hsl(348, 40%, 80%)";
    }
    return "hsl(0 0% 90%)";
  }, [type]);

  const iconColor = React.useMemo(() => {
    if (type === "destructive") {
      return "hsl(348, 40%, 50%)";
    }
    return "black";
  }, [type]);

  const style = React.useMemo(() => {
    return {
      backgroundColor,
      padding: 8,
      borderRadius: 24,
    };
  }, [backgroundColor]);

  return (
    <Pressable
      onPress={onPress}
      style={style}
      android_ripple={{ color: rippleColor }}
    >
      <Ionicons
        accessibilityLabel={label}
        name={iconName}
        size={24}
        color={iconColor}
      />
    </Pressable>
  );
};

type TopBarSpecificActionProps = Omit<TopBarActionProps, "iconName"> & {
  iconName?: keyof typeof Ionicons.glyphMap;
};

const TopBarDeleteAction = (props: TopBarSpecificActionProps) => {
  return (
    <TopBarAction
      iconName="trash"
      type="destructive"
      label="Supprimer"
      {...props}
    />
  );
};

const TopBarSaveAction = (props: TopBarSpecificActionProps) => {
  return <TopBarAction iconName="checkmark" label="Enregistrer" {...props} />;
};

export { TopBarAction, TopBarDeleteAction, TopBarSaveAction };
