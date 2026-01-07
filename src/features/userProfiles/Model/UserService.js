// src/features/userProfiles/Model/UserService.js
import axios from 'axios';

// Exempel på hur en användarstruktur (Model) kan se ut
const API_URL = 'https://din-api-url.com/api';

const UserService = {
  // Simulerad data för utvecklingsfasen (Steg 1-2)
  // Uppdatering i UserService.js
  getMockProfiles: () => {
    return [
      { id: 1, name: "Anna Jönsson", age: 24, fitnessLevel: "Advanced", role: "athlete", bio: "Siktar på SM-guld." }
    ];
  },

  // Hämta alla profiler från API
  async getAllProfiles() {
    try {
      // Just nu returnerar vi mock-data, byt till axios-anrop sen:
      // const response = await axios.get(`${API_URL}/profiles`);
      // return response.data;
      return this.getMockProfiles();
    } catch (error) {
      console.error("Could not retrieve profile:", error);
      throw error;
    }
  },
  async createProfile(newProfileData) {
    try {
      // I framtiden: const response = await axios.post(`${API_URL}/profiles`, newProfileData);
      // För nu simulerar vi att vi sparar och får tillbaka objektet med ett ID
      return {
        ...newProfileData,
        id: Date.now() // Temporärt ID
      };
    } catch (error) {
      console.error("Kunde inte skapa profil:", error);
      throw error;
    }
  },

  // Hämta en specifik profil baserat på ID
  async getProfileById(id) {
    try {
      // Simulera API-fördröjning
      return new Promise((resolve) => {
        setTimeout(() => {
          const profiles = this.getMockProfiles();
          resolve(profiles.find(p => p.id === parseInt(id)));
        }, 500);
      });
    } catch (error) {
      console.error("Could not retrieve profile:", error);
    }
  },

  // Skapa en ny feedback-rapport för en specifik användare
  async saveFeedback(userId, feedbackData) {
    try {
      // feedbackData kan innehålla rityta-bild, STT-text och video-länk
      const response = await axios.post(`${API_URL}/feedback`, {
        targetUserId: userId,
        content: feedbackData,
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error("Could not retrieve feedback:", error);
    }
  },

  async deleteProfile(profileId) {
    try {
      console.log(`Model: Raderar profil med ID ${profileId}`);
      // I framtiden: await axios.delete(`${API_URL}/profiles/${profileId}`);
      return true; 
    } catch (error) {
      console.error("Kunde inte radera profil i Model:", error);
      throw error;
    }
  }
};

export default UserService;