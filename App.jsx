import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeView from './src/features/home/HomeView';
import ProfileSelectionView from './src/features/userProfiles/View/ProfileSelectionView';
import ProfileView from './src/features/userProfiles/View/ProfileView';

// If you already have these, import them instead of the placeholders
import VideoAnalyzerView from './src/features/analysis/View/VideoAnalyserView';
import ReportGeneratorView from './src/features/analysis/View/ReportGeneratorView';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home'); // start on Home
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Load profiles from storage on app start
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const savedProfiles = await AsyncStorage.getItem('@coachapp_profiles');
        if (savedProfiles !== null) {
          setProfiles(JSON.parse(savedProfiles));
        } else {
          // Default profiles first time
          setProfiles([
            { id: 1, name: 'Anna Andersson', fitnessLevel: 'Elite', age: '28', image: null },
            { id: 2, name: 'Thomas Coach', fitnessLevel: 'Pro', age: '45', image: null },
          ]);
        }
      } catch (e) {
        console.error('Kunde inte ladda profiler', e);
      } finally {
        setLoading(false);
      }
    };
    loadProfiles();
  }, []);

  // 2. Save profiles to storage whenever they change
  useEffect(() => {
    const saveProfiles = async () => {
      try {
        await AsyncStorage.setItem('@coachapp_profiles', JSON.stringify(profiles));
      } catch (e) {
        console.error('Kunde inte spara profiler', e);
      }
    };
    if (!loading) saveProfiles();
  }, [profiles, loading]);

  // Simple navigation helper
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
      {currentScreen === 'Home' && (
        <HomeView navigate={navigate} />
      )}

      {currentScreen === 'Selection' && (
        <ProfileSelectionView
          navigation={{ navigate }}
          profiles={profiles}
          setProfiles={setProfiles}
        />
      )}

      {currentScreen === 'Profile' && (
        <ProfileView
          route={{
            params: {
              profile: selectedProfile,
              onUpdate: (updated) =>
                setProfiles(prev =>
                  prev.map(p => (p.id === updated.id ? updated : p)),
                ),
            },
          }}
          navigation={{ goBack: () => setCurrentScreen('Selection') }}
        />
      )}

      {currentScreen === 'VideoAnalysis' && (
        <VideoAnalyzerView />
      )}

      {currentScreen === 'ReportGenerator' && (
        <ReportGeneratorView />
      )}
    </View>
  );
}
