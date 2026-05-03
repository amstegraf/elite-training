import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";

export function SplashScreen() {
  return (
    <ImageBackground
      source={require("../../../assets/splash-screen.png")}
      resizeMode="cover"
      style={styles.wrap}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#0F172A",
  }
});
