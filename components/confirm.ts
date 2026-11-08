import { i18n } from "@/lib/i18n";
import { Alert } from "react-native";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText: string;
  destructive?: boolean;
};

// Asks the user to confirm an action. Resolves to true only when the confirm
// button is pressed.
const confirm = ({ title, message, confirmText, destructive = false }: ConfirmOptions): Promise<boolean> =>
  new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: i18n.t("common.cancel"), style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

export { confirm, type ConfirmOptions };
