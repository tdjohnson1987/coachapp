// src/features/analysis/Model/AnalysisService.js
import { transcribeAudio } from '../../../api/sttApi';
import { saveReport } from '../../../api/filesApi';

const AnalysisService = {
  async loadVideoMetadata(file) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      // ev. duration läses i View via <video> och skickas in senare
    };
  },

  async extractPreviewFrames({ videoFile, frameCount = 6 }) {
    // Här kan du senare implementera <video> + <canvas>
    // För nu: returnera mock-data
    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      frames.push({
        id: i,
        time: i * 2,            // sekund
        thumbnailUrl: null,     // fylls på när du har canvas
        notes: '',
      });
    }
    return frames;
  },

  async runSpeechToText(audioBlob) {
    const result = await transcribeAudio(audioBlob); // STT‑API
    return {
      fullText: result.text,
      segments: result.segments ?? [],
    };
  },

  buildReport({ videoMeta, sttResult, selectedFrames, context }) {
    return {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      coachId: context.coachId,
      athleteId: context.athleteId,
      sport: context.sport,
      video: videoMeta,
      transcription: sttResult,
      frames: selectedFrames,
    };
  },

  async persistReport(report) {
    return await saveReport(report);
  },
};

export default AnalysisService;
