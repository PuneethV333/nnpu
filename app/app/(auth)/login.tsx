import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { Redirect } from "expo-router";
import { isAxiosError } from "axios";
import imageConstants from "@/constants/image";
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
      if (isAxiosError(err) && err.response?.status === 401) {
        setError("Invalid ID or password.");
      } else {
        setError("Couldn't reach the server. Try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = () => submit(authId, password);

  return (
      <ImageBackground
        source={imageConstants.homePageBg}
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
                  <TouchableOpacity
                    onPress={() => {
                      /* navigate to forgot-password screen */
                    }}
                  >
                    <Text style={styles.forgotText}>Forgot?</Text>
                  </TouchableOpacity>
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
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    submitting && styles.buttonDisabled,
                  ]}
                  onPress={onSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Log In</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
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
