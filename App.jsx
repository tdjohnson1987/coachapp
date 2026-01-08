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
import useCaptureVM from './src/features/capture/ViewModel/useCaptureVM';
import ReportDetailView from './src/features/userProfiles/View/ReportDetailView';
import { AuthProvider } from './src/context/AuthContext';
import STTReportDetailView from './src/features/analysis/View/STTReportDetailView';


export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home'); // start on Home
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedSttReportId, setSelectedSttReportId] = useState(null); // NEW
  const [captureRouteParams, setCaptureRouteParams] = useState(null);


  
  const goBack = () => {
    // simplest: always go back to Home (or Profile, if you prefer)
    setCurrentScreen('Home');
    setCurrentParams(null);
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('@coachapp_current_user');
        if (stored) {
          setCurrentUser(JSON.parse(stored));
          return;
        }
        const newUser = { id: `coach-${Date.now()}` };
        setCurrentUser(newUser);
        await AsyncStorage.setItem('@coachapp_current_user', JSON.stringify(newUser));
      } catch (e) {
        console.error('Kunde inte ladda användare', e);
      }
    };
    loadCurrentUser();
  }, []);

  // create analysis VM ONCE per app render, not inside JSX
  const analysisVM = useAnalysisVM({
    coachId: 1,
    athleteId: 2,
    sport: 'football',
  });

  const captureVM = useCaptureVM();   // create once


  // --- NY FUNKTION: Lägg till analys i en profils historik ---
  const addAnalysisToProfile = (profileId, newAnalysis) => {
    const analysisWithId = {
      ...newAnalysis,
      id: newAnalysis.id || Date.now().toString() 
    };

    setProfiles((prev) => prev.map((p) => {
      if (p.id === profileId) {
        const updatedReports = [analysisWithId, ...(p.reports || [])];
        const updatedUser = { ...p, reports: updatedReports };
        
        // Synka vald profil direkt så listan uppdateras i vyn
        setSelectedProfile(updatedUser);
        return updatedUser;
      }
      return p;
    }));
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
  // UPDATE THIS IN App.js
  const navigate = (screen, params) => {
    if (params?.profile) {
      setSelectedProfile(params.profile);
    }
    if (params?.playbackReport) {
      setSelectedReport(params.playbackReport);
    }
    
    // FIX: Look for any variation of the ID key
    const incomingId = params?.sttReportId || params?.reportId || params?.id;
    if (incomingId) {
      setSelectedSttReportId(incomingId);
    }

    if (screen === 'Capture') {
      setCaptureRouteParams(params || {});
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
    <AuthProvider user={currentUser}>
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
          // ADD THESE TWO PROPS BELOW:
          profiles={profiles}
          setProfiles={setProfiles}
          
          route={{
            params: {
              profile: selectedProfile,
              onUpdate: (updated) => {
                if (!updated || !updated.id) {
                  return;
                }
                setProfiles(prev =>
                  prev.map(p => (p.id === updated.id ? updated : p)),
                );
                setSelectedProfile(updated);
              },

            },
          }}
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
        <ReportGeneratorView
          navigation={{ navigate }}
          route={{ params: { profile: selectedProfile } }}
        />
      )}

      {currentScreen === 'ReportDetail' && selectedReport && (
        <ReportDetailView 
          route={{ params: { playbackReport: selectedReport } }} 
          navigation={{ 
            goBack: () => setCurrentScreen('Profile') 
          }} 
        />
      )}
    
      {currentScreen === 'STTReportDetail' && (
        <STTReportDetailView
          // Pass the VMs created at the top of App.js as PROPS
          analysisVM={analysisVM}
          captureVM={captureVM}
          navigation={{
            goBack: () => setCurrentScreen('Profile'),
            navigate,
          }}
          // Pass the ID explicitly
          route={{ params: { reportId: selectedSttReportId } }}
        />
      )}

      {currentScreen === 'Capture' && captureRouteParams && (
        <CaptureScreen
          navigation={{ navigate, goBack }}
          vm={captureVM}
          route={{ params: captureRouteParams }}
        />
      )}


    </View>
    </AuthProvider>
  );
}
