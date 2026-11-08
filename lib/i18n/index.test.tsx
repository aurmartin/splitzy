import { TopBarSaveAction } from "@/components/top-bar-action";
import { render, screen } from "@testing-library/react-native";
import * as React from "react";
import { Trans } from "react-i18next";
import { Text } from "react-native";
import { i18n } from "./index";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

const keysOf = (object: object, prefix = ""): string[] =>
  Object.entries(object).flatMap(([key, value]) =>
    typeof value === "string" ? [prefix + key] : keysOf(value, `${prefix}${key}.`),
  );

describe("i18n", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("should have the same keys in every language", () => {
    expect(keysOf(fr).sort()).toEqual(keysOf(en).sort());
  });

  it("should interpolate values", async () => {
    await i18n.changeLanguage("fr");

    expect(i18n.t("validation.duplicateMember", { member: "Alice" })).toBe("Alice fait déjà partie du groupe");
  });

  it("should render components in French", async () => {
    await i18n.changeLanguage("fr");

    await render(
      <>
        <TopBarSaveAction />
        <Text>
          <Trans
            i18nKey="balance.owes"
            values={{ from: "Alice", to: "Bob" }}
            components={{ muted: <Text style={{ color: "gray" }} /> }}
          />
        </Text>
      </>,
    );

    screen.getByLabelText("Enregistrer");
    screen.getByText("Alice doit à Bob");
  });
});
