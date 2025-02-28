import { Text } from "@/components/text";
import { primaryHue } from "@/lib/constants";
import { type Receipt, type ReceiptSplit } from "@/lib/expenses";
import { convertSplit } from "@/components/split-input/convert";
import { getLocale } from "@/lib/locale";
import React from "react";
import { TouchableOpacity, View } from "react-native";

const ReceiptSplitInput = (props: {
  value: ReceiptSplit;
  onChange: (value: ReceiptSplit) => void;
}) => {
  const { value, onChange } = props;

  const isSelected = (item: Receipt["items"][number], member: string) => {
    return item.paid_for.includes(member);
  };

  const toggleSelect = (itemIndex: number, member: string) => {
    onChange({
      ...value,
      receipt: {
        ...value.receipt,
        items: value.receipt.items.map((item, index) => {
          if (index === itemIndex) {
            if (item.paid_for.includes(member)) {
              return {
                ...item,
                paid_for: item.paid_for.filter((m) => m !== member),
              };
            }

            return {
              ...item,
              paid_for: [...item.paid_for, member],
            };
          }
          return item;
        }),
      },
    });
  };

  const backgroundColor = (item: Receipt["items"][number], member: string) => {
    return isSelected(item, member)
      ? `hsl(${primaryHue}, 100%, 90%)`
      : `hsl(0, 0%, 90%)`;
  };

  const amountSplit = convertSplit(value);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        borderRadius: 4,
      }}
    >
      <View
        style={{
          gap: 8,
          padding: 12,
          borderBottomWidth: 1,
          borderColor: "hsl(0, 0%, 80%)",
        }}
      >
        {Object.entries(amountSplit.amounts).map(([member, amount]) => (
          <View
            key={member}
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text numberOfLines={1}>{member}</Text>
            <Text>{amount.setLocale(getLocale()).toFormat()}</Text>
          </View>
        ))}
      </View>

      <View style={{ padding: 12, gap: 8 }}>
        {value.receipt.items.map((item, index) => (
          <View key={index} style={{ gap: 8 }}>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text>{item.humanReadableDescription}</Text>
                <Text type="bodyMedium" style={{ color: "hsl(0, 0%, 40%)" }}>
                  {item.description}
                </Text>
              </View>
              <Text>{item.price.setLocale(getLocale()).toFormat()}</Text>
            </View>

            <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
              {value.members.map((member) => (
                <TouchableOpacity
                  key={member}
                  style={{
                    backgroundColor: backgroundColor(item, member),
                    padding: 8,
                    borderRadius: 8,
                  }}
                  onPress={() => toggleSelect(index, member)}
                >
                  <Text>{member}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

function createReceiptSplit(receipt: Receipt, members: string[]): ReceiptSplit {
  return {
    type: "receipt",
    total: receipt.total,
    members,
    receipt,
  };
}

export { ReceiptSplitInput, createReceiptSplit };
