import firestore from '@react-native-firebase/firestore';
import { UserProfile } from '../../types/auth';

export class FirestoreService {
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const doc = await firestore().collection('users').doc(userId).get();
    return doc.exists ? (doc.data() as UserProfile) : null;
  }

  static async createUserProfile(userId: string, profile: Partial<UserProfile>) {
    const userProfile: UserProfile = {
      displayName: profile.displayName || '',
      email: profile.email || '',
      photoURL: profile.photoURL,
      phone: profile.phone,
      createdAt: firestore.FieldValue.serverTimestamp() as any,
      updatedAt: firestore.FieldValue.serverTimestamp() as any,
      providers: profile.providers || [],
      isAnonymous: profile.isAnonymous || false,
      notificationPreferences: {
        orders: true,
        messages: true,
        standingOrderMatches: true,
        promotions: false,
      },
    };

    await firestore().collection('users').doc(userId).set(userProfile);
    return userProfile;
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    await firestore().collection('users').doc(userId).update({
      ...updates,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  static async addFavorite(userId: string, listingId: string): Promise<void> {
    await firestore()
      .collection('users')
      .doc(userId)
      .collection('favorites')
      .doc(listingId)
      .set({
        listingRef: firestore().collection('listings').doc(listingId),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
  }

  static async removeFavorite(userId: string, listingId: string): Promise<void> {
    await firestore()
      .collection('users')
      .doc(userId)
      .collection('favorites')
      .doc(listingId)
      .delete();
  }

  static async getFavorites(userId: string): Promise<any[]> {
    const snapshot = await firestore()
      .collection('users')
      .doc(userId)
      .collection('favorites')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  static listenToUserMessages(
    userId: string,
    callback: (messages: any[]) => void
  ): () => void {
    return firestore()
      .collection('messages')
      .where('participants', 'array-contains', userId)
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(messages);
      });
  }

  static async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    listingId?: string
  ): Promise<void> {
    await firestore().collection('messages').add({
      participants: [senderId, recipientId],
      senderId,
      recipientId,
      listingRef: listingId ? firestore().collection('listings').doc(listingId) : null,
      content,
      read: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  static async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    await firestore().collection('messages').doc(messageId).update({
      read: true,
    });
  }
}
