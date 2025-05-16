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
import * as ImagePicker from "expo-image-picker";
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
import { useActionSheet } from "@expo/react-native-action-sheet";

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
  const { showActionSheetWithOptions } = useActionSheet();

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

  const showReceiptActionSheet = async () => {
    showActionSheetWithOptions(
      {
        options: ["Prendre une photo", "Choisir une photo", "Annuler"],
        cancelButtonIndex: 2,
      },
      async (index) => {
        console.log("showReceiptActionSheet", index);
        let result: ImagePicker.ImagePickerResult | null = null;

        if (index === 0) {
          console.log("openCameraAndProcessReceipt");
          result = await openCamera();
        } else if (index === 1) {
          console.log("openMediaLibrary");
          result = await openMediaLibrary();
        }

        if (result) {
          await processReceiptImage(result);
        }
      },
    );
  };

  const openCamera =
    async (): Promise<ImagePicker.ImagePickerResult | null> => {
      const permission = await ImagePicker.getCameraPermissionsAsync();

      if (!permission.granted) {
        const request = await ImagePicker.requestCameraPermissionsAsync();

        if (!request.granted) {
          snackBar.show("Veuillez autoriser l'accès à la caméra", "error");
          return null;
        }
      }

      return await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        base64: true,
      });
    };

  const openMediaLibrary =
    async (): Promise<ImagePicker.ImagePickerResult | null> => {
      const permission = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        const request = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!request.granted) {
          snackBar.show(
            "Veuillez autoriser l'accès à la bibliothèque de photos",
            "error",
          );
        }

        return null;
      }

      return await ImagePicker.launchImageLibraryAsync({
        base64: true,
      });
    };

  const processReceiptImage = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;

    const imageBase64 = result.assets?.[0]?.base64;

    if (!imageBase64) return;

    try {
      setReceiptLoading(true);

      const receipt = await system.serverConnector.parseReceipt(imageBase64);

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        <View style={{ flex: 1, gap: 16 }}>
          <Button type="secondary" onPress={showReceiptActionSheet}>
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
