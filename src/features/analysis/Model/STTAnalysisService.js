// src/features/analysis/Model/STTAnalysisService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transcribeAudio } from '../../../api/sttApi';

const STORAGE_KEY = '@coachapp_stt_reports';

const STTAnalysisService = {
  async transcribeAudioFile(audioUri) {
    if (!audioUri) {
      return { fullText: '', confidence: 0, segments: [], keywords: [], language: 'en' };
    }

    const result = await transcribeAudio(audioUri);

    const fullText = result?.text || '';
    const segments = result?.segments || [];
    const language = result?.language || 'en';
    const confidence = result?.confidence ?? 0;
    const keywords = extractKeywords(fullText);

    return { fullText, segments, language, confidence, keywords };
  },

  buildFromDrawingSnapshot({ coachId, athleteId, profileName, snapshot, transcription }) {
    return {
      // Identity / linking
      id: snapshot.id,                // reuse drawing id for easier linking
      reportId: snapshot.id,          // keep also as reportId if you prefer
      type: 'Drawing+STT',
      title: snapshot.title,          // "Name analysis" from prompt
      athleteId,
      coachId,
      profileName,
      createdAtIso: new Date().toISOString(),

      // Existing drawing snapshot (for playback)
      drawing: {
        ...snapshot,
        // (id, title, type, date, time, recordedEvents, baseStrokes, canvasSize,
        //  activeImageSource, audioUri, description)
      },

      // STT info
      transcription: {
        fullText: transcription.fullText,
        segments: transcription.segments,
        language: transcription.language,
        confidence: transcription.confidence,
        keywords: transcription.keywords,
      },

      status: 'draft',
    };
  },

  async persist(report) {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [...existing, report];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return report;
  },

  async getReportsForAthlete(athleteId) {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    return existing.filter((r) => r.athleteId === athleteId);
  },

  async getReportById(reportId) {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    return existing.find((r) => r.reportId === reportId || r.id === reportId) || null;
  },

  async updateStatus(reportId, status) {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = existing.map((r) =>
      r.reportId === reportId || r.id === reportId ? { ...r, status } : r
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated.find((r) => r.reportId === reportId || r.id === reportId) || null;
  },
};

function extractKeywords(text) {
  const stop = ['the', 'and', 'with', 'that', 'this', 'för', 'som', 'och'];
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stop.includes(w));

  const freq = {};
  words.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([w]) => w);
}

export default STTAnalysisService;
