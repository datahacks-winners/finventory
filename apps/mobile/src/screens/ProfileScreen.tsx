import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { FirestoreService } from '../services/firebase/firestore';
import auth from '@react-native-firebase/auth';

// Stitch Theme
const colors = {
  surface: '#fff8f5',
  surfaceContainer: '#ffeadc',
  surfaceContainerLow: '#fff1e9',
  surfaceContainerHigh: '#f9e4d7',
  surfaceContainerHighest: '#f3dfd1',
  onSurface: '#241911',
  onSurfaceVariant: '#404750',
  outline: '#707881',
  outlineVariant: '#c0c7d1',
  primary: '#005f93',
  primaryContainer: '#1e78b4',
  onPrimary: '#ffffff',
  primaryFixed: '#cde5ff',
  secondary: '#8c4f14',
  secondaryContainer: '#fdac6a',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
};

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Header */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Your Profile</Text>
        <Text style={styles.heroTitle}>Your dock, digitized.</Text>
        <Text style={styles.heroSubtitle}>
          Manage your account and supplier preferences
        </Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>ORDERS</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statIcon}>📦</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>RESCUED</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>340</Text>
            <Text style={styles.statIcon}>🐟</Text>
          </View>
        </View>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{userProfile.email}</Text>
        </View>

        {/* Edit Form */}
        {editing ? (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholderTextColor={colors.outline}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor={colors.outline}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditing(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditing(true)}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Account Info Cards */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Account Type</Text>
          <Text style={styles.infoValue}>
            {userProfile.isAnonymous ? 'Anonymous (Guest)' : 'Registered'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Sign In Method</Text>
          <Text style={styles.infoValue}>
            {userProfile.providers?.[0]?.replace('.com', '') || 'Email'}
          </Text>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  heroLabel: {
    fontFamily: 'Caveat',
    fontSize: 24,
    color: colors.primaryFixed,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.onPrimary,
    letterSpacing: -0.02,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.primaryFixed,
    marginTop: 8,
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: -20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 1,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'Caveat',
  },
  statIcon: {
    fontSize: 24,
  },
  profileCard: {
    backgroundColor: colors.surfaceContainerLow,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
  },
  userEmail: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.onSurface,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  infoSection: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  infoCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
  signOutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: colors.errorContainer,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
  },
  bottomPadding: {
    height: 40,
  },
});
