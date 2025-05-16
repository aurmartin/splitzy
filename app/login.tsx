import Button from "@/components/button";
import LoadingScreen from "@/components/loading-screen";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TextInput } from "@/components/text-input";
import { useSystem } from "@/components/system-provider";
import { Colors } from "@/lib/constants";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

type PromiseState = {
  loading: boolean;
  error?: string;
  success?: string;
};

type Action =
  | { type: "start" }
  | { type: "error"; payload: string }
  | { type: "success"; payload: string };

function promiseStateReducer(_state: PromiseState, action: Action) {
  switch (action.type) {
    case "start":
      return { loading: true };
    case "error":
      return { loading: false, error: action.payload };
    case "success":
      return { loading: false, success: action.payload };
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const system = useSystem();

  const [email, setEmail] = React.useState("");
  const [state, dispatch] = React.useReducer(promiseStateReducer, {
    loading: false,
  });

  React.useEffect(() => {
    system.supabaseConnector.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/protected");
      }
    });
  }, [router, system.supabaseConnector]);

  const signInWithEmail = React.useCallback(async () => {
    try {
      dispatch({ type: "start" });

      const { error } = await system.supabaseConnector.signInWithOtp(email);

      if (error) {
        throw error;
      }

      dispatch({
        type: "success",
        payload: "Vérifiez votre e-mail pour un lien magique de connexion.",
      });
    } catch (error: any) {
      console.error("Error in signInWithEmail", error);

      dispatch({
        type: "error",
        payload: error?.message || "Une erreur est survenue",
      });
    }
  }, [dispatch, system.supabaseConnector, email]);

  if (state.loading) {
    return <LoadingScreen message="Connexion en cours..." />;
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text
          type="displayLarge"
          style={{ textAlign: "center", marginBottom: 32, marginTop: 32 }}
        >
          Bienvenue !
        </Text>

        <Text type="headlineMedium">Connectez-vous ou créez un compte</Text>

        {state.error && (
          <Text style={{ color: Colors.red }}>{state.error}</Text>
        )}

        {state.success && (
          <Text style={{ color: Colors.green }}>{state.success}</Text>
        )}

        <Text>
          Saisissez votre adresse e-mail ci-dessous. Si vous n&apos;avez pas
          encore de compte, nous en créerons automatiquement un pour vous lors
          de votre première connexion !
        </Text>

        <TextInput
          autoComplete="email"
          keyboardType="email-address"
          autoCorrect={false}
          autoCapitalize="none"
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
        />

        <Button onPress={signInWithEmail} accessibilityLabel="Connexion">
          Se connecter ou créer un compte
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
    gap: 20,
  },
});
