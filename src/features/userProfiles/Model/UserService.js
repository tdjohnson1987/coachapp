// src/features/userProfiles/Model/UserService.js
import axios from 'axios';

// Exempel på hur en användarstruktur (Model) kan se ut
const API_URL = 'https://din-api-url.com/api';

const UserService = {
  // Simulerad data för utvecklingsfasen (Steg 1-2)
  getMockProfiles: () => {
    return [
      { id: 1, name: "Tränare Thomas", role: "coach", bio: "Huvudtränare för A-laget" },
      { id: 2, name: "Spelare Erik", role: "athlete", team: "U19" },
      { id: 3, name: "Dr. Andersson", role: "doctor", specialization: "Fysioterapi" }
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
      console.error("Kunde inte hämta profiler:", error);
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
      console.error("Kunde inte hämta profil:", error);
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
      console.error("Kunde inte spara feedback:", error);
    }
  }
};

export default UserService;