import React from "react";
import { View } from "react-native";
import { Text } from "@/components/text";
import { SafeAreaView } from "react-native-safe-area-context";

type SnackBarSpec = {
  message: string;
  type: "success" | "error";
};

type SnackBarContextState = {
  show: (message: string, type: "success" | "error") => void;
};

const SnackBar = (props: { snack: SnackBarSpec }) => {
  const { snack } = props;

  const backgroundColor = React.useMemo(() => {
    switch (snack.type) {
      case "success":
        return "hsl(120, 100%, 90%)";
      case "error":
        return "hsl(0, 100%, 90%)";
      default:
        throw new Error("Invalid snack type");
    }
  }, [snack]);

  const color = React.useMemo(() => {
    switch (snack.type) {
      case "success":
        return "hsl(120, 100%, 15%)";
      case "error":
        return "hsl(0, 100%, 15%)";
      default:
        throw new Error("Invalid snack type");
    }
  }, [snack]);

  return (
    <SafeAreaView
      style={{ flex: 1, position: "absolute", bottom: 0, left: 0, right: 0 }}
    >
      <View
        style={{
          backgroundColor,
          margin: 8,
          marginTop: 16,
          padding: 12,
          borderRadius: 4,
          elevation: 3,
        }}
      >
        <Text style={{ color }}>{snack.message}</Text>
      </View>
    </SafeAreaView>
  );
};

const SnackBarContext = React.createContext<SnackBarContextState | null>(null);

const SnackBarProvider = (props: { children: React.ReactNode }) => {
  const { children } = props;

  const [snack, setSnack] = React.useState<SnackBarSpec | null>(null);

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const show = React.useCallback(
    (message: string, type: "success" | "error") => {
      setSnack({ message, type });

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => setSnack(null), 3000);
    },
    [],
  );

  const value = React.useMemo(() => ({ show }), [show]);

  return (
    <SnackBarContext.Provider value={value}>
      {children}

      {snack && <SnackBar snack={snack} />}
    </SnackBarContext.Provider>
  );
};

const useSnackBar = () => {
  const context = React.useContext(SnackBarContext);

  if (!context) {
    throw new Error("useSnackBar must be used within a SnackBarProvider");
  }

  return context;
};

export { SnackBarProvider, useSnackBar };
