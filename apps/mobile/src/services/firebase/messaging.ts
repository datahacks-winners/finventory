import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export class MessagingService {
  static async requestPermission(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    return enabled;
  }

  static async getToken(): Promise<string | null> {
    const enabled = await this.requestPermission();
    if (!enabled) return null;

    const token = await messaging().getToken();
    return token;
  }

  static async saveToken(userId: string, token: string): Promise<void> {
    const userRef = firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const fcmTokens = userDoc.data()?.fcmTokens || [];
      if (!fcmTokens.includes(token)) {
        await userRef.update({
          fcmTokens: [...fcmTokens, token],
        });
      }
    }
  }

  static async removeToken(userId: string, token: string): Promise<void> {
    const userRef = firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const fcmTokens = userDoc.data()?.fcmTokens || [];
      await userRef.update({
        fcmTokens: fcmTokens.filter((t: string) => t !== token),
      });
    }
  }

  static setupMessageHandler(
    onMessage: (message: FirebaseMessagingTypes.RemoteMessage) => void,
    onNotificationOpened: (message: FirebaseMessagingTypes.NotificationOpenEvent) => void
  ): void {
    messaging().onMessage(onMessage);
    messaging().onNotificationOpenedApp(onNotificationOpened);

    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        onNotificationOpened({ notification: remoteMessage });
      }
    });
  }

  static async initialize(): Promise<void> {
    const userId = auth().currentUser?.uid;
    if (!userId) return;

    const token = await this.getToken();
    if (token) {
      await this.saveToken(userId, token);
    }

    messaging().onTokenRefresh(async newToken => {
      await this.saveToken(userId, newToken);
    });
  }
}
