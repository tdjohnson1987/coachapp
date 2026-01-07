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

  const [captureNotes, setCaptureNotes] = useState([]);
  const [keyFrames, setKeyFrames] = useState([]);

  const [currentAthleteId, setCurrentAthleteId] = useState(null);
  const [currentCoachId, setCurrentCoachId] = useState(null);

  const useProfileForAnalysis = (coachId, athleteId) => {
    setCurrentCoachId(coachId);
    setCurrentAthleteId(athleteId);
  };

  const loadVideo = async (file) => {
    setVideoFile(file);
    const meta = await AnalysisService.loadVideoMetadata(file);
    setVideoMeta(meta);
    const previews = await AnalysisService.extractPreviewFrames({ videoFile: file });
    setFrames(previews);
  };

  const addCaptureNote = (note) => {
    setCaptureNotes((prev) => [...prev, note]);
  };

  const addKeyFrame = (frame) => {
    setKeyFrames((prev) => [...prev, frame]);
  };

  const generateAndSaveReport = async () => {
    if (!currentAthleteId || !currentCoachId) return;

    const built = AnalysisService.buildReport({
      coachId: currentCoachId,
      athleteId: currentAthleteId,
      videoMeta,
      transcription,
      captureNotes,
      keyFrames,
    });

    await AnalysisService.persistReport(built);
    setReport(built);

    // clear working data for a fresh start
    setCaptureNotes([]);
    setKeyFrames([]);
    return built;
  };

  const toggleFrameSelection = (frameId) => {
    setSelectedFrames((prev) =>
      prev.includes(frameId) ? prev.filter((id) => id !== frameId) : [...prev, frameId],
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
    captureNotes,
    keyFrames,

    // actions
    loadVideo,
    toggleFrameSelection,
    runTranscription,

    useProfileForAnalysis,
    addCaptureNote,
    addKeyFrame,
    generateAndSaveReport,
  };
};
