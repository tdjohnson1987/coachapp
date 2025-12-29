import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileSelectionView from './src/features/userProfiles/View/ProfileSelectionView';
import ProfileView from './src/features/userProfiles/View/ProfileView';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Selection');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Ladda profiler från minnet när appen startar
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const savedProfiles = await AsyncStorage.getItem('@coachapp_profiles');
        if (savedProfiles !== null) {
          setProfiles(JSON.parse(savedProfiles));
        } else {
          // Standardprofiler om det är första gången appen öppnas
          setProfiles([
            { id: 1, name: 'Anna Andersson', fitnessLevel: 'Elite', age: '28', image: null },
            { id: 2, name: 'Thomas Coach', fitnessLevel: 'Pro', age: '45', image: null },
          ]);
        }
      } catch (e) {
        console.error("Kunde inte ladda profiler", e);
      } finally {
        setLoading(false);
      }
    };
    loadProfiles();
  }, []);

  // 2. Spara profiler till minnet varje gång 'profiles' uppdateras
  useEffect(() => {
    const saveProfiles = async () => {
      try {
        await AsyncStorage.setItem('@coachapp_profiles', JSON.stringify(profiles));
      } catch (e) {
        console.error("Kunde inte spara profiler", e);
      }
    };
    if (!loading) saveProfiles();
  }, [profiles]);

  const navigate = (screen, params) => {
    if (params?.profile) setSelectedProfile(params.profile);
    setCurrentScreen(screen);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'Selection' ? (
        <ProfileSelectionView 
          navigation={{ navigate }} 
          profiles={profiles} 
          setProfiles={setProfiles} 
        />
      ) : (
        <ProfileView 
          route={{ params: { profile: selectedProfile, onUpdate: (updated) => setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p)) } }} 
          navigation={{ goBack: () => setCurrentScreen('Selection') }} 
        />
      )}
    </View>
  );
}