import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ImageBackground,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";
import { errorMessage } from "@/src/libs/errorMessage";
import { Redirect } from "expo-router";
import { isAxiosError } from "axios";
import { images } from "@/constants/image";
import { styles } from "$/style/login";

const Login = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [authId, setAuthId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardVisible(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  const submit = async (id: string, pass: string) => {
    setError(null);
    if (!id.trim() || !pass) {
      setError("Enter both School ID and password");
      return;
    }
    setSubmitting(true);
    try {
      await login(id.trim(), pass);
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          // The backend answers 401 for both a wrong authId and a wrong
          // password, and deliberately does not say which. Kept that way here
          // — telling a caller which half was wrong turns the form into a way
          // to enumerate valid School IDs.
          setError("Invalid ID or password.");
        } else if (status === 429) {
          setError("Too many attempts. Wait a moment and try again.");
        } else if (status === undefined) {
          setError("Couldn't reach the server. Check your connection.");
        } else {
          setError(errorMessage(err, "Couldn't sign in. Try again."));
        }
      } else {
        // A Zod parse failure means the server answered with a shape this
        // build does not understand. Saying "try again" would be misleading.
        setError("Sign-in response was unexpected. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = () => submit(authId, password);

  return (
      <ImageBackground
        source={images.homePageBg}
        style={styles.bg}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            "rgba(15,23,42,0.25)",
            "rgba(15,23,42,0.15)",
            "rgba(15,23,42,0.75)",
          ]}
          locations={[0, 0.4, 1]}
          style={styles.overlay}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
          style={styles.flex}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            scrollEnabled={keyboardVisible}
          >
            <View style={styles.topSection}>
              <View style={styles.logoBox}>
                <Ionicons name="school" size={36} color="#fff" />
              </View>
              <Text style={styles.title}>NNPU academy</Text>
              <Text style={styles.subtitle}>
                Sign in to manage your school activities
              </Text>
            </View>

            <View style={styles.middleSection}>
              <View style={styles.card}>
                <Text style={styles.label}>School ID</Text>
                <View style={styles.inputRow}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={authId}
                    onChangeText={setAuthId}
                    placeholder="Enter your ID"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>

                <View style={styles.passwordHeader}>
                  <Text style={styles.label}>Password</Text>
                </View>
                <View style={styles.inputRow}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#9CA3AF"
                    />
                  </Pressable>
                </View>

                {error ? (
                  <Text
                    style={styles.errorText}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    {error}
                  </Text>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.loginButton,
                    submitting && styles.buttonDisabled,
                    // `activeOpacity` is a TouchableOpacity prop. Pressable
                    // ignores it, so the button had no press feedback at all
                    // even though it read as if it did. `pressed` is the
                    // supported equivalent.
                    pressed && !submitting && { opacity: 0.85 },
                  ]}
                  onPress={onSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Log In</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            <Text style={styles.footerText}>
              © 2026 NNPU School Management System
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
  );
};

export default Login;
