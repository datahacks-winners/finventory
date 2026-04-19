import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useBrowseStore } from '../stores/browseStore';

export function useUserLocation() {
  const { userLocation, setUserLocation } = useBrowseStore();
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        setPermissionStatus('granted');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setPermissionStatus('denied');
    } finally {
      setLoading(false);
    }
  };

  return {
    userLocation,
    permissionStatus,
    loading,
    requestLocation,
  };
}
