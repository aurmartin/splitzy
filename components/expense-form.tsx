import Button from "@/components/button";
import DineroInput from "@/components/dinero-input";
import Label from "@/components/label";
import Picker from "@/components/picker";
import {
  Split,
  SplitInput,
  changeTotal,
  changeType,
  createReceiptSplit,
  createSplit,
} from "@/components/split-input";
import { Text } from "@/components/text";
import TextInput from "@/components/text-input";
import { useSystem } from "@/components/system-provider";
import { type Expense, type Receipt } from "@/lib/expenses";
import { Group, useMe } from "@/lib/groups";
import { Picker as RNPicker } from "@react-native-picker/picker";
import dinero, { type Dinero } from "dinero.js";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSnackBar } from "./snack-bar";

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
  validationErrors: Record<string, string>;
}) => {
  const { group, expense, onSubmit, validationErrors } = props;

  const system = useSystem();
  const me = useMe(group.id);
  const snackBar = useSnackBar();

  const [title, setTitle] = React.useState("Dépense");

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
    <ScrollView>
      <View style={{ flex: 1, gap: 16 }}>
        <Button onPress={handleReceipt}>Télécharger un reçu</Button>

        <View>
          <TextInput
            label="Titre"
            placeholder="Titre"
            value={title}
            onChangeText={setTitle}
          />
          {validationErrors.title && (
            <Text style={{ color: "hsl(0, 100%, 30%)" }}>
              {validationErrors.title}
            </Text>
          )}
        </View>

        <View>
          <Label>Montant (€)</Label>
          <DineroInput value={total} onChange={handleTotalChange} />
        </View>

        <View>
          <Picker
            label="Payé par"
            selectedValue={payerName}
            onValueChange={setPayerName}
          >
            {group.members.map((member) => (
              <RNPicker.Item key={member} label={member} value={member} />
            ))}
          </Picker>
          {validationErrors.payerName && (
            <Text style={{ color: "hsl(0, 100%, 30%)" }}>
              {validationErrors.payerName}
            </Text>
          )}
        </View>

        <SplitInput
          value={split}
          onChange={setSplit}
          onTypeChange={handleTypeChange}
        />

        <Button onPress={handleSubmit}>
          {expense ? "Modifier la dépense" : "Créer la dépense"}
        </Button>
      </View>
    </ScrollView>
  );
};

export { ExpenseForm, type ExpenseFormFields };
