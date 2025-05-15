import Button from "@/components/button";
import { DineroInput } from "@/components/dinero-input";
import {
  SplitInput,
  changeTotal,
  changeType,
  createReceiptSplit,
  createSplit,
} from "@/components/split-input";
import { useSystem } from "@/components/system-provider";
import { Text } from "@/components/text";
import { TextInput } from "@/components/text-input";
import type { Expense, Receipt, Split } from "@/lib/expenses";
import { Group, useMe } from "@/lib/groups";
import dinero, { type Dinero } from "dinero.js";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  View,
  type TextInput as RNTextInput,
} from "react-native";
import { ChipList } from "./chip-list";
import { useSnackBar } from "./snack-bar";
import { TopBar } from "./top-bar";
import Label from "./label";
import { TopBarDeleteAction, TopBarSaveAction } from "./top-bar-action";

const ReceiptLoader = () => {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100%",
        padding: 16,
      }}
    >
      <View>
        <ActivityIndicator
          size="large"
          color="hsl(220, 10%, 50%)"
          style={{ marginBottom: 16 }}
        />
        <Text>Traitement du reçu en cours...</Text>
      </View>
    </View>
  );
};

type ExpenseFormFields = {
  title: Expense["title"];
  payerName: Expense["payerName"];
  splitExpense: Expense["splitExpense"];
  receipt: Expense["receipt"];
};

const ExpenseForm = (props: {
  group: Group;
  expense?: Expense;
  onSubmit: (fields: ExpenseFormFields) => void;
  onDelete?: () => void;
}) => {
  const { group, expense, onSubmit, onDelete } = props;

  const system = useSystem();
  const me = useMe(group.id);
  const snackBar = useSnackBar();

  const titleInputRef = React.useRef<RNTextInput>(null);

  const [title, setTitle] = React.useState("");

  const [payerName, setPayerName] = React.useState(me);

  const [total, setTotal] = React.useState(
    dinero({ amount: 0, currency: group.currency }),
  );
  const [split, setSplit] = React.useState<Split>(
    createSplit("equal", total, group.members),
  );

  const [receipt, setReceipt] = React.useState<Receipt | null>(null);
  const [receiptLoading, setReceiptLoading] = React.useState(false);

  React.useEffect(() => {
    if (!expense) return;

    setTitle(expense.title);
    setPayerName(expense.payerName);
    setTotal(expense.splitExpense.total);
    setSplit(expense.splitExpense);
    setReceipt(expense.receipt);
  }, [group, expense]);

  React.useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);

  const handleTypeChange = (type: Split["type"]) => {
    setSplit((split) => changeType(split, type));
  };

  const handleTotalChange = (total: Dinero) => {
    setTotal(total);
    setSplit((split) => changeTotal(split, total));
  };

  const handleSubmit = () => {
    const fields = {
      title,
      payerName,
      splitExpense: split,
      receipt,
    };

    onSubmit(fields);
  };

  const handleReceipt = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: "image/*",
    });
    const uri = result.assets?.[0]?.uri;

    if (!uri) return;

    try {
      setReceiptLoading(true);

      const file = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const receipt = await system.serverConnector.parseReceipt(file);

      setReceiptLoading(false);
      setReceipt(receipt);
      setTitle(receipt.title);
      setSplit(createReceiptSplit(receipt, group.members));
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.stack);
      } else {
        console.error(error);
      }

      snackBar.show(
        "Une erreur est survenue lors du téléchargement du reçu",
        "error",
      );

      setReceiptLoading(false);
    }
  };

  if (receiptLoading) {
    return <ReceiptLoader />;
  }

  return (
    <>
      <TopBar
        title={expense ? "Modifier la dépense" : "Créer une dépense"}
        rightActions={
          <>
            {expense ? <TopBarDeleteAction onPress={onDelete} /> : null}
            <TopBarSaveAction onPress={handleSubmit} />
          </>
        }
      />

      <ScrollView>
        <View style={{ flex: 1, gap: 16 }}>
          <Button type="secondary" onPress={handleReceipt}>
            Télécharger un reçu
          </Button>

          <View style={{ gap: 1 }}>
            <TextInput
              ref={titleInputRef}
              label="Titre"
              value={title}
              onChangeText={setTitle}
              style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
            />

            <DineroInput
              label="Montant"
              value={total}
              onChange={handleTotalChange}
              style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              right={<Text>{total.getCurrency()}</Text>}
            />
          </View>

          <View>
            <Label>Payé par</Label>
            <ChipList
              style={{ justifyContent: "center" }}
              value={payerName}
              onChange={setPayerName}
              items={group.members.map((member) => ({
                label: member,
                value: member,
              }))}
            />
          </View>

          <View>
            <SplitInput
              value={split}
              onChange={setSplit}
              onTypeChange={handleTypeChange}
            />
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export { ExpenseForm, type ExpenseFormFields };
