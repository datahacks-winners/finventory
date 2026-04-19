import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { FirestoreService } from '../services/firebase/firestore';
import auth from '@react-native-firebase/auth';

export function ProfileScreen() {
  const { user, userProfile, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await FirestoreService.updateUserProfile(user!.uid, {
        displayName,
        phone,
      });

      await auth().currentUser?.updateProfile({ displayName });
      setEditing(false);
      Alert.alert('Success', 'Profile updated');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  if (!userProfile) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-6">
        {/* Header */}
        <View className="items-center mb-6">
          <View className="w-24 h-24 bg-blue-500 rounded-full items-center justify-center mb-4">
            <Text className="text-white text-3xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-2xl font-bold">{displayName}</Text>
          <Text className="text-gray-500">{userProfile.email}</Text>
        </View>

        {/* Edit Form */}
        {editing ? (
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-semibold">Display Name</Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg p-3 mb-4"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <Text className="text-gray-700 mb-2 font-semibold">Phone</Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg p-3 mb-4"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-blue-500 rounded-lg p-3"
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-center font-semibold">Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-gray-300 rounded-lg p-3"
                onPress={() => setEditing(false)}
              >
                <Text className="text-gray-700 text-center font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            className="bg-blue-500 rounded-lg p-3 mb-6"
            onPress={() => setEditing(true)}
          >
            <Text className="text-white text-center font-semibold">Edit Profile</Text>
          </TouchableOpacity>
        )}

        {/* Account Info */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-gray-700 mb-2 font-semibold">Account Type</Text>
          <Text className="text-gray-900">
            {userProfile.isAnonymous ? 'Anonymous (Guest)' : 'Registered'}
          </Text>
        </View>

        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-gray-700 mb-2 font-semibold">Providers</Text>
          {userProfile.providers.map(provider => (
            <Text key={provider} className="text-gray-900 capitalize">
              {provider.replace('.com', '')}
            </Text>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          className="bg-red-500 rounded-lg p-4"
          onPress={handleSignOut}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
