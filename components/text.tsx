import {
  Text as BaseText,
  StyleSheet,
  type TextProps as BaseTextProps,
} from "react-native";

export type TextProps = BaseTextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "body"
    | "bodyMedium"
    | "bodySmall"
    | "display"
    | "displayLarge"
    | "headline"
    | "headlineMedium"
    | "headlineSmall"
    | "title"
    | "titleMedium"
    | "titleSmall"
    | "subtitle"
    | "link";
};

export function Text({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: TextProps) {
  return (
    <BaseText
      style={[
        type === "body" ? styles.body : undefined,
        type === "bodyMedium" ? styles.bodyMedium : undefined,
        type === "bodySmall" ? styles.bodySmall : undefined,
        type === "display" ? styles.display : undefined,
        type === "displayLarge" ? styles.displayLarge : undefined,
        type === "headline" ? styles.headline : undefined,
        type === "headlineMedium" ? styles.headlineMedium : undefined,
        type === "headlineSmall" ? styles.headlineSmall : undefined,
        type === "title" ? styles.title : undefined,
        type === "titleMedium" ? styles.titleMedium : undefined,
        type === "titleSmall" ? styles.titleSmall : undefined,
        type === "subtitle" ? styles.subtitle : undefined,
        type === "link" ? styles.link : undefined,
        style,
      ].filter(Boolean)}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  displayLarge: {
    fontSize: 56,
    fontWeight: "300",
    lineHeight: 64,
  },
  display: {
    fontSize: 32,
    fontWeight: "400",
    lineHeight: 38,
  },
  headline: {
    fontSize: 32,
    fontWeight: "400",
    lineHeight: 40,
  },
  headlineMedium: {
    fontSize: 28,
    fontWeight: "400",
    lineHeight: 36,
  },
  headlineSmall: {
    fontSize: 24,
    fontWeight: "400",
    lineHeight: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "400",
    lineHeight: 28,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
  },
  titleSmall: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: "#0a7ea4",
  },
});
