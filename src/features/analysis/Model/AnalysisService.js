// src/features/analysis/Model/AnalysisService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transcribeAudio } from '../../../api/sttApi';
import { saveReport } from '../../../api/filesApi'; // can stay a no-op for now
import createReport from './ReportModel'; // updated factory function

const STORAGE_KEY = '@coachapp_reports';

const AnalysisService = {
  async loadVideoMetadata(file) {
    return {
      id: file.uri,        // simple id for now
      name: file.name,
      size: file.size,
      type: file.type,
    };
  },

  async extractPreviewFrames({ videoFile, frameCount = 6 }) {
    const videoDuration = 30;
    const interval = videoDuration / frameCount;

    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      frames.push({
        id: i.toString(),
        time: Number((i * interval).toFixed(1)),
        thumbnailUrl: null,
        notes: '',
      });
    }
    return frames;
  },

  async runSpeechToText(audioBlob) {
    const result = await transcribeAudio(audioBlob);
    return {
      fullText: result?.text || '',
      segments: result?.segments ?? [],
    };
  },

  // Build a full report object from current VM state
  buildReport({ coachId, athleteId, videoMeta, transcription, captureNotes, keyFrames }) {
    return createReport({
      coachId,
      athleteId,
      videoMeta,
      transcription,
      captureNotes,
      keyFrames,
    });
  },

  // Save locally (per device) and optionally to backend
  async persistReport(report) {
    // local storage with AsyncStorage
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];

    const updated = [...existing, report];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); // [web:197][web:198]

    // optional backend call; safe even if saveReport is a stub
    try {
      await saveReport(report);
    } catch (e) {
      console.warn('saveReport (remote) failed, using local only', e);
    }

    return report;
  },

  // Helper to load all reports for one athlete/profile
  async getReportsForAthlete(athleteId) {
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    return existing.filter((r) => r.athleteId === athleteId);
  },
};

export default AnalysisService;
