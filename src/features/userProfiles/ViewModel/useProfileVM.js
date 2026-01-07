// src/features/userProfiles/ViewModel/useProfileVM.js
import { useState, useEffect } from 'react';
import UserService from '../Model/UserService';
import * as ImagePicker from 'expo-image-picker'; // VIKTIGT: Denna saknades

export const useProfileVM = () => {
  const [profiles, setProfiles] = useState([]);
  const [inspectedProfile, setInspectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ladda profiler vid start
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setLoading(true);
        const data = await UserService.getAllProfiles();
        setProfiles(data || []);
      } catch (err) {
        setError("Kunde inte hämta profiler.");
      } finally {
        setLoading(false);
      }
    };
    loadProfiles();
  }, []);

  // LOGIK: Skapa profil
  const addProfile = async (formData) => {
    try {
      const newProfile = {
        ...formData,
        id: Date.now().toString(), // Sträng-ID är ofta säkrare i React Native
        reports: []
      };
      
      // Här antar vi att UserService har en metod för att spara en enskild profil
      // Om inte, kan du spara hela listan: await UserService.saveProfiles([...profiles, newProfile]);
      setProfiles(prev => [...prev, newProfile]);
      return newProfile;
    } catch (err) {
      setError("Kunde inte spara profilen.");
      return null;
    }
  };
  const prepareNewProfile = (formData) => {
    return {
      ...formData,
      id: Date.now(),
      reports: [] // Se till att varje ny profil får en tom rapportlista direkt
    };
  };

  // LOGIK: Uppdatera en profil i listan (används av onUpdate i vyn)
  const updateProfileInList = (updatedProfile) => {
    setProfiles(prev =>
      prev.map(p => (p.id === updatedProfile.id ? updatedProfile : p))
    );
  };

  // LOGIK: Hantera bildval
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        return result.assets[0].uri;
      }
      return null;
    } catch (err) {
      console.error("ImagePicker Error:", err);
      return null;
    }
  };

  // LOGIK: Radera rapport från profil
  const deleteReport = (profile, reportId) => {
    const updatedReports = (profile.reports || []).filter(r => r.id !== reportId);
    const updatedProfile = { ...profile, reports: updatedReports };
    
    // Uppdatera listan direkt så att ändringen reflekteras överallt
    updateProfileInList(updatedProfile);
    return updatedProfile;
  };
  
  const deleteProfile = async (profileId, currentProfiles) => {
    try {
      // Check if the list exists before filtering
      if (!currentProfiles) {
        console.error("VM Error: currentProfiles is undefined");
        return null;
      }

      // Filter the list
      const updatedList = currentProfiles.filter(p => p.id !== profileId);
      
      // Call the model/service
      await UserService.deleteProfile(profileId);
      
      return updatedList;
    } catch (err) {
      console.error("VM Error:", err);
      return null;
    }
  };

  return {
    profiles,
    loading,
    error,
    inspectedProfile,
    pickImage,
    prepareNewProfile,
    deleteReport,
    deleteProfile,
    addProfile,
    updateProfileInList,
    inspectProfile: (id) => setInspectedProfile(profiles.find(p => p.id === id)),
    closeInspection: () => setInspectedProfile(null),
  };
};