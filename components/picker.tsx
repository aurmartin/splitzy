import { Picker as RNPicker } from "@react-native-picker/picker";
import { View } from "react-native";
import Label from "./label";
import { Colors } from "@/lib/constants";
interface PickerProps<T> {
  selectedValue: T;
  onValueChange: (value: T) => void;
  children: React.ReactNode;
  label?: string;
}

export default function Picker<T>(props: PickerProps<T>) {
  const { selectedValue, onValueChange, children, label } = props;

  return (
    <View>
      {label && <Label>{label}</Label>}
      <View
        style={{
          borderWidth: 1,
          borderColor: Colors.secondary,
          borderStyle: "solid",
          borderRadius: 4,
          backgroundColor: "white",
        }}
      >
        <RNPicker
          testID="picker"
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={{
            padding: 0,
            marginTop: -5,
            marginBottom: -5,
          }}
        >
          {children}
        </RNPicker>
      </View>
    </View>
  );
}
