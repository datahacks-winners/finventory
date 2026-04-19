import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { AuthModalProps } from '../types/auth';

export function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (mode === 'signup' && !displayName) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName);
      }
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithApple();
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/50"
      >
        <View className="bg-white rounded-t-3xl p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-blue-500 text-lg">Close</Text>
            </TouchableOpacity>
          </View>

          {mode === 'signup' && (
            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-3"
              placeholder="Full Name"
              value={displayName}
              onChangeText={setDisplayName}
            />
          )}

          <TextInput
            className="border border-gray-300 rounded-lg p-3 mb-3"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            className="border border-gray-300 rounded-lg p-3 mb-4"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            className="bg-blue-500 rounded-lg p-4 mb-3"
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-lg">
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-red-500 rounded-lg p-4 mb-3 flex-row items-center justify-center"
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Text className="text-white font-semibold mr-2">G</Text>
            <Text className="text-white font-semibold">Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-black rounded-lg p-4 mb-4 flex-row items-center justify-center"
            onPress={handleAppleSignIn}
            disabled={loading}
          >
            <Text className="text-white font-semibold mr-2"></Text>
            <Text className="text-white font-semibold">Continue with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            <Text className="text-blue-500">
              {mode === 'signin'
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
