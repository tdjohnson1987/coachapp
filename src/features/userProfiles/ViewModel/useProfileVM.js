// src/features/userProfiles/ViewModel/useProfileVM.js
import { useState, useEffect } from 'react';
import UserService from '../Model/UserService';
import * as ImagePicker from 'expo-image-picker';

export const useProfileVM = () => {
  const [profiles, setProfiles] = useState([]);
  const [inspectedProfile, setInspectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setLoading(true);
        const data = await UserService.getAllProfiles();
        setProfiles(data || []);
      } catch (err) {
        setError('Kunde inte hämta profiler.');
      } finally {
        setLoading(false);
      }
    };
    loadProfiles();
  }, []);

  const addProfile = async (formData) => {
    try {
      const newProfile = {
        ...formData,
        id: Date.now().toString(),
        reports: [],
      };
      setProfiles((prev) => [...prev, newProfile]);
      return newProfile;
    } catch (err) {
      setError('Kunde inte spara profilen.');
      return null;
    }
  };

  const prepareNewProfile = (formData) => {
    return {
      ...formData,
      id: Date.now(),
      reports: [],
    };
  };

  const updateProfileInList = (updatedProfile) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === updatedProfile.id ? updatedProfile : p)),
    );
  };

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
      console.error('ImagePicker Error:', err);
      return null;
    }
  };

  const deleteReport = (profile, reportId) => {
    const updatedReports = (profile.reports || []).filter((r) => r.id !== reportId);
    const updatedProfile = { ...profile, reports: updatedReports };
    updateProfileInList(updatedProfile);
    return updatedProfile;
  };

  const deleteProfile = async (profileId, currentProfiles) => {
    try {
      if (!currentProfiles) {
        console.error('VM Error: currentProfiles is undefined');
        return null;
      }

      const updatedList = currentProfiles.filter((p) => p.id !== profileId);
      await UserService.deleteProfile(profileId);
      return updatedList;
    } catch (err) {
      console.error('VM Error:', err);
      return null;
    }
  };

  // NEW: helper to attach an analysis snapshot to a profile
  const addReportToProfile = (profileId, snapshot) => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return null;

    const updatedProfile = {
      ...target,
      reports: [...(target.reports || []), snapshot],
    };

    updateProfileInList(updatedProfile);
    return updatedProfile;
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
    addReportToProfile,
    inspectProfile: (id) => setInspectedProfile(profiles.find((p) => p.id === id)),
    closeInspection: () => setInspectedProfile(null),
  };
};
