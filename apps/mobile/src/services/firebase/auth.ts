import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';

export class AuthService {
  static async signInWithEmail(email: string, password: string) {
    await auth().signInWithEmailAndPassword(email, password);
  }

  static async signUpWithEmail(email: string, password: string, displayName: string) {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName });
  }

  static async signInWithGoogle() {
    GoogleSignin.configure({
      webClientId: '__YOUR_WEB_CLIENT_ID__',
    });

    await GoogleSignin.hasPlayServices();
    const { idToken } = await GoogleSignin.signIn();
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    return auth().signInWithCredential(googleCredential);
  }

  static async signInWithApple() {
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    if (!appleAuthRequestResponse.identityToken) {
      throw new Error('Apple Sign-In failed - no identity token');
    }

    const { identityToken, nonce } = appleAuthRequestResponse;
    const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);
    return auth().signInWithCredential(appleCredential);
  }

  static async signOut() {
    await auth().signOut();
  }

  static async linkAnonymousAccount(provider: 'email' | 'google' | 'apple', credential?: FirebaseAuthTypes.AuthCredential) {
    const user = auth().currentUser;
    if (!user || !user.isAnonymous) {
      throw new Error('No anonymous user to link');
    }

    if (provider === 'email' && credential) {
      const { email, password } = credential;
      const credentialObj = auth.EmailAuthProvider.credential(email, password);
      await user.linkWithCredential(credentialObj);
    } else if (provider === 'google' && credential) {
      await user.linkWithCredential(credential);
    } else if (provider === 'apple' && credential) {
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
