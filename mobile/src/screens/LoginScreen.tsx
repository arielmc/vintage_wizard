import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";

type AuthMode = "login" | "signup" | "forgot";

export function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    error,
    clearError,
    isGoogleReady,
  } = useAuth();

  const handleGoogleLogin = async () => {
    setLocalLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLocalLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords don't match");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    setLocalLoading(true);
    try {
      await signUpWithEmail(email, password, name);
      Alert.alert(
        "Verification Sent",
        "Please check your inbox and click the link to verify your account."
      );
      setMode("login");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }
    setLocalLoading(true);
    try {
      await resetPassword(email);
      Alert.alert(
        "Success",
        `Password reset email sent to ${email}. Check your inbox.`
      );
      setMode("login");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-8 py-12">
          {/* Header */}
          <View className="mb-10">
            <View className="flex-row items-center gap-3 mb-2">
              <View className="w-11 h-11 bg-rose-500 rounded-xl items-center justify-center shadow-lg">
                <Ionicons name="sparkles" size={24} color="white" />
              </View>
              <Text className="text-3xl font-bold text-stone-900">
                Vintage Wizard
              </Text>
            </View>
            <Text className="text-stone-600 text-sm ml-14">
              Your stuff — researched, organized & ready
            </Text>
          </View>

          {/* Auth Card */}
          <View className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xl">
            {/* Tab Switcher */}
            <View className="flex-row border-b border-stone-100 bg-stone-50">
              <TouchableOpacity
                onPress={() => switchMode("login")}
                className={`flex-1 py-4 items-center ${
                  mode === "login" ? "border-b-2 border-rose-500" : ""
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    mode === "login" ? "text-stone-900" : "text-stone-500"
                  }`}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => switchMode("signup")}
                className={`flex-1 py-4 items-center ${
                  mode === "signup" ? "border-b-2 border-rose-500" : ""
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    mode === "signup" ? "text-stone-900" : "text-stone-500"
                  }`}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            <View className="p-6">
              {/* Error Message */}
              {error && (
                <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <View className="flex-row items-start gap-2">
                    <Ionicons name="alert-circle" size={16} color="#dc2626" />
                    <Text className="text-sm text-red-800 flex-1">{error}</Text>
                  </View>
                </View>
              )}

              {/* Google Sign In - only show if configured */}
              {isGoogleReady ? (
                <TouchableOpacity
                  onPress={handleGoogleLogin}
                  disabled={localLoading}
                  className="w-full bg-white border-2 border-stone-200 rounded-xl py-4 px-6 flex-row items-center justify-center gap-3 mb-6"
                >
                  {localLoading ? (
                    <ActivityIndicator color="#78716c" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color="#4285F4" />
                      <Text className="font-semibold text-stone-900">
                        Continue with Google
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}

              {/* Divider - only show if Google is available */}
              {isGoogleReady && (
                <View className="flex-row items-center mb-6">
                  <View className="flex-1 h-px bg-stone-200" />
                  <Text className="px-3 text-xs text-stone-400 uppercase">
                    or with email
                  </Text>
                  <View className="flex-1 h-px bg-stone-200" />
                </View>
              )}

              {/* Forgot Password Mode */}
              {mode === "forgot" ? (
                <>
                  <Text className="text-sm text-stone-600 mb-4">
                    Enter your email and we'll send you a link to reset your password.
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="w-full border border-stone-300 rounded-xl px-4 py-3 mb-4 text-base"
                    placeholderTextColor="#a8a29e"
                  />
                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    disabled={localLoading}
                    className="w-full bg-stone-900 rounded-xl py-4 items-center mb-4"
                  >
                    {localLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-semibold">
                        Send Reset Email
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => switchMode("login")}>
                    <Text className="text-center text-stone-500">
                      Back to Sign In
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Name field (signup only) */}
                  {mode === "signup" && (
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Your name or collection name"
                      autoCapitalize="words"
                      className="w-full border border-stone-300 rounded-xl px-4 py-3 mb-3 text-base"
                      placeholderTextColor="#a8a29e"
                    />
                  )}

                  {/* Email */}
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="w-full border border-stone-300 rounded-xl px-4 py-3 mb-3 text-base"
                    placeholderTextColor="#a8a29e"
                  />

                  {/* Password */}
                  <View className="relative mb-3">
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Password"
                      secureTextEntry={!showPassword}
                      className="w-full border border-stone-300 rounded-xl px-4 py-3 pr-12 text-base"
                      placeholderTextColor="#a8a29e"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3"
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#78716c"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Confirm Password (signup only) */}
                  {mode === "signup" && (
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm password"
                      secureTextEntry={!showPassword}
                      className="w-full border border-stone-300 rounded-xl px-4 py-3 mb-3 text-base"
                      placeholderTextColor="#a8a29e"
                    />
                  )}

                  {/* Forgot Password Link */}
                  {mode === "login" && (
                    <TouchableOpacity
                      onPress={() => switchMode("forgot")}
                      className="mb-4"
                    >
                      <Text className="text-right text-sm text-rose-600">
                        Forgot password?
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Submit Button */}
                  <TouchableOpacity
                    onPress={mode === "login" ? handleSignIn : handleSignUp}
                    disabled={localLoading}
                    className="w-full bg-stone-900 rounded-xl py-4 items-center mt-2"
                  >
                    {localLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-semibold">
                        {mode === "login" ? "Sign In" : "Create Account"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Footer */}
          <Text className="text-center text-xs text-stone-400 mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

