import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export class AuthService {
  static async signInWithEmail(email: string, password: string) {
    await auth().signInWithEmailAndPassword(email, password);
  }

  static async signUpWithEmail(email: string, password: string, displayName: string) {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName });
  }

  static async getGoogleCredential(): Promise<FirebaseAuthTypes.AuthCredential> {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') {
      throw new Error('Google Sign-In was cancelled');
    }
    return auth.GoogleAuthProvider.credential(response.data.idToken);
  }

  static async signInWithGoogle() {
    const credential = await AuthService.getGoogleCredential();
    return auth().signInWithCredential(credential);
  }

  static async getAppleCredential(): Promise<FirebaseAuthTypes.AuthCredential> {
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    if (!appleAuthRequestResponse.identityToken) {
      throw new Error('Apple Sign-In failed - no identity token');
    }

    const { identityToken, nonce } = appleAuthRequestResponse;
    return auth.AppleAuthProvider.credential(identityToken, nonce);
  }

  static async signInWithApple() {
    const credential = await AuthService.getAppleCredential();
    return auth().signInWithCredential(credential);
  }

  static async signOut() {
    await auth().signOut();
  }

  static async linkAnonymousAccount(
    provider: 'email' | 'google' | 'apple',
    credential?: FirebaseAuthTypes.AuthCredential,
    emailCredentials?: { email: string; password: string },
  ) {
    const user = auth().currentUser;
    if (!user || !user.isAnonymous) {
      throw new Error('No anonymous user to link');
    }

    if (provider === 'email' && emailCredentials) {
      const credentialObj = auth.EmailAuthProvider.credential(
        emailCredentials.email,
        emailCredentials.password,
      );
      await user.linkWithCredential(credentialObj);
    } else if (credential) {
      await user.linkWithCredential(credential);
    }
  }

  static getCurrentUser() {
    return auth().currentUser;
  }

  static onAuthStateChanged(callback: (user: FirebaseAuthTypes.User | null) => void) {
    return auth().onAuthStateChanged(callback);
  }
}
