// src/features/userProfiles/ViewModel/useProfileVM.js
import { useState, useEffect } from 'react';
import UserService from '../Model/UserService';

export const useProfileVM = () => {
  const [profiles, setProfiles] = useState([]);
  const [inspectedProfile, setInspectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ... din befintliga fetch-logik

  const addProfile = async (profileData) => {
    const createdProfile = await UserService.createProfile(profileData);
    setProfiles(prev => [...prev, createdProfile]);
  };

  return {
    profiles,
    inspectedProfile,
    loading,
    inspectProfile: (id) => setInspectedProfile(profiles.find(p => p.id === id)),
    closeInspection: () => setInspectedProfile(null),
    addProfile // Exponera denna för vyn
  };
};