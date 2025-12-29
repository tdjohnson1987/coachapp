// src/features/analysis/ViewModel/useAnalysisVM.js
import { useState } from 'react';
import AnalysisService from '../Model/AnalysisService';

export const useAnalysisVM = (context) => {
  const [videoFile, setVideoFile] = useState(null);
  const [videoMeta, setVideoMeta] = useState(null);
  const [frames, setFrames] = useState([]);
  const [selectedFrames, setSelectedFrames] = useState([]);
  const [transcription, setTranscription] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadVideo = async (file) => {
    setVideoFile(file);
    const meta = await AnalysisService.loadVideoMetadata(file);
    setVideoMeta(meta);
    const previews = await AnalysisService.extractPreviewFrames({ videoFile: file });
    setFrames(previews);
  };

  const toggleFrameSelection = (frameId) => {
    setSelectedFrames((prev) =>
      prev.includes(frameId) ? prev.filter(id => id !== frameId) : [...prev, frameId]
    );
  };

  const runTranscription = async (audioBlob) => {
    setLoading(true);
    try {
      const stt = await AnalysisService.runSpeechToText(audioBlob);
      setTranscription(stt);
    } catch (e) {
      setError('Kunde inte transkribera ljudet.');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!videoMeta || !transcription) return;
    const framesForReport = frames.filter(f => selectedFrames.includes(f.id));
    const built = AnalysisService.buildReport({
      videoMeta,
      sttResult: transcription,
      selectedFrames: framesForReport,
      context,
    });
    setReport(built);
    await AnalysisService.persistReport(built);
  };

  return {
    // state
    videoFile,
    videoMeta,
    frames,
    selectedFrames,
    transcription,
    report,
    loading,
    error,
    // actions
    loadVideo,
    toggleFrameSelection,
    runTranscription,
    generateReport,
  };
};
