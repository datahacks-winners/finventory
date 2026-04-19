import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './useAuth';

export function useRequireAuth() {
  const auth = useAuth();
  const navigation = useNavigation();
  const isAnonymous = auth.user?.isAnonymous || false;

  useEffect(() => {
    if (auth.loading) return;

    if (!auth.user) {
      navigation.navigate('AuthModal' as never);
    } else if (isAnonymous) {
      navigation.navigate('AuthModal' as never);
    }
  }, [auth.user, auth.loading, isAnonymous, navigation]);

  return auth;
}
