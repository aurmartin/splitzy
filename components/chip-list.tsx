import { primaryHue } from "@/lib/constants";
import React from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import { Text } from "./text";

interface ChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

function Chip(props: ChipProps) {
  const { label, isSelected, onPress } = props;

  const backgroundColor = React.useMemo(() => {
    if (isSelected) {
      return `hsl(${primaryHue}, 50%, 80%)`;
    }

    return "hsl(0, 0%, 90%)";
  }, [isSelected]);

  const style = {
    padding: 8,
    backgroundColor,
    borderRadius: 16,
  };

  return (
    <Pressable
      onPress={onPress}
      style={style}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Text type="bodyMedium">{label}</Text>
    </Pressable>
  );
}

interface ChipListItem {
  label: string;
  value: string;
}

interface ChipListProps {
  onChange: (value: string) => void;
  value: string | string[];
  items: ChipListItem[];
  style?: StyleProp<ViewStyle>;
}

function ChipList(props: ChipListProps) {
  const { onChange, value, items, style } = props;

  const isSelected = (item: ChipListItem) => {
    if (Array.isArray(value)) {
      return value.includes(item.value);
    }
    return item.value === value;
  };

  return (
    <View style={[{ flexDirection: "row", gap: 8 }, style]}>
      {items.map((item) => (
        <Chip
          key={item.value}
          label={item.label}
          isSelected={isSelected(item)}
          onPress={() => onChange(item.value)}
        />
      ))}
    </View>
  );
}

export { ChipList, type ChipListProps };
