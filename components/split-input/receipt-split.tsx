import { convertSplit } from "@/components/split-input/convert";
import { Text } from "@/components/text";
import { type Receipt, type ReceiptSplit } from "@/lib/expenses";
import { getLocale } from "@/lib/locale";
import { produce } from "immer";
import React from "react";
import { View } from "react-native";
import { ChipList } from "../chip-list";

const ReceiptSplitInput = (props: {
  value: ReceiptSplit;
  onChange: (value: ReceiptSplit) => void;
}) => {
  const { value, onChange } = props;

  const toggleSelect = (itemIndex: number, member: string) => {
    onChange(
      produce(value, (draft) => {
        const item = draft.receipt.items[itemIndex];

        if (item.paid_for.includes(member)) {
          item.paid_for = item.paid_for.filter((m) => m !== member);
        } else {
          item.paid_for.push(member);
        }
      }),
    );
  };

  const amountSplit = convertSplit(value);

  return (
    <View style={{ gap: 1 }}>
      <View
        style={{
          gap: 16,
          padding: 16,
          backgroundColor: "white",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
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

      <View
        style={{
          padding: 16,
          gap: 8,
          backgroundColor: "white",
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
        }}
      >
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
              <View style={{ flexShrink: 1 }}>
                <Text numberOfLines={1} ellipsizeMode="middle">
                  {item.humanReadableDescription}
                </Text>

                <Text
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  type="bodyMedium"
                  style={{ color: "hsl(0, 0%, 40%)" }}
                >
                  {item.description}
                </Text>
              </View>

              <Text style={{ marginLeft: 8 }}>
                {item.price.setLocale(getLocale()).toFormat()}
              </Text>
            </View>

            <ChipList
              value={item.paid_for}
              onChange={(paid_for) => toggleSelect(index, paid_for)}
              items={value.members.map((member) => ({
                label: member,
                value: member,
              }))}
            />
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

export { createReceiptSplit, ReceiptSplitInput };
