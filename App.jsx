import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeView from './src/features/home/HomeView';
import ProfileSelectionView from './src/features/userProfiles/View/ProfileSelectionView';
import ProfileView from './src/features/userProfiles/View/ProfileView';

import VideoAnalyzerView from './src/features/analysis/View/VideoAnalyserView';
import ReportGeneratorView from './src/features/analysis/View/ReportGeneratorView';
import { useAnalysisVM } from './src/features/analysis/ViewModel/useAnalysisVM';

import CaptureScreen from './src/features/capture/View/CaptureScreen';
import ReportDetailView from './src/features/userProfiles/View/ReportDetailView';


export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home'); // start on Home
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // create analysis VM ONCE per app render, not inside JSX
  const analysisVM = useAnalysisVM({
    coachId: 1,
    athleteId: 2,
    sport: 'football',
  });

  // --- NY FUNKTION: Lägg till analys i en profils historik ---
  const addAnalysisToProfile = (profileId, newAnalysis) => {
    setProfiles((prevProfiles) => {
      const updatedProfiles = prevProfiles.map((p) => {
        if (p.id === profileId) {
          // Skapa reports-array om den inte finns, annars lägg till mätningen överst
          const updatedReports = [newAnalysis, ...(p.reports || [])];
          const updatedUser = { ...p, reports: updatedReports };
          
          // Om detta är den valda profilen, uppdatera även selectedProfile-statet
          if (selectedProfile?.id === profileId) {
            setSelectedProfile(updatedUser);
          }
          return updatedUser;
        }
        return p;
      });
      return updatedProfiles;
    });
  };

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
  
  const [selectedReport, setSelectedReport] = useState(null);

  // Simple navigation helper
  const navigate = (screen, params) => {
    if (params?.profile) setSelectedProfile(params.profile);
    if (params?.playbackReport) {
      setSelectedReport(params.playbackReport);
    }
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
              onUpdate: (updated) => {
                setProfiles(prev =>
                  prev.map(p => (p.id === updated.id ? updated : p)),
                );
                // Uppdatera även det valda profil-statet så vyn inte hoppar tillbaka till gammal data
                setSelectedProfile(updated); 
              },
            },
          }}
          // FIX: Lägg till navigate här så ProfileView kan använda den
          navigation={{ 
            goBack: () => setCurrentScreen('Selection'),
            navigate: navigate 
          }}
        />
      )}

      {currentScreen === 'VideoAnalysis' && (
        <VideoAnalyzerView 
          navigation={{ navigate }} 
          vm={analysisVM} 
          route={{ params: { returnToProfile: selectedProfile } }} 
        />
      )}

      {currentScreen === 'ReportGenerator' && (
        <ReportGeneratorView navigation={{ navigate }} vm={analysisVM} />
      )}

      {currentScreen === 'ReportDetail' && selectedReport && (
        <ReportDetailView 
          route={{ params: { playbackReport: selectedReport } }} 
          navigation={{ 
            goBack: () => setCurrentScreen('Profile') 
          }} 
        />
      )}
    
      {currentScreen === 'Capture' && (
        <CaptureScreen 
          navigation={{ navigate }} 
          route={{ 
            params: { 
              returnToProfile: selectedProfile,
              onSaveAnalysis: addAnalysisToProfile // LÄGG TILL DENNA RAD
            } 
          }} 
        />
      )}

    </View>
  );
}
