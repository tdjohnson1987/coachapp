// src/features/userProfiles/ViewModel/useProfileVM.js
import { useState, useEffect } from 'react';
import UserService from '../Model/UserService';

export const useProfileVM = () => {
  const [profiles, setProfiles] = useState([]);
  const [inspectedProfile, setInspectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const addProfile = async (profileData) => {
    try {
      const createdProfile = await UserService.createProfile(profileData);
      setProfiles(prev => [...prev, createdProfile]);
    } catch (err) {
      setError("Kunde inte spara profilen. Försök igen.");
    }
  };
  useEffect(() => {
      const loadProfiles = async () => {
          setLoading(true);
          const data = await UserService.getAllProfiles();
          setProfiles(data);
          setLoading(false);
      };
      loadProfiles();
  }, []);

  return {
    profiles,
    inspectedProfile,
    loading,
    inspectProfile: (id) => setInspectedProfile(profiles.find(p => p.id === id)),
    closeInspection: () => setInspectedProfile(null),
    addProfile // Exponera denna för vyn
  };
};