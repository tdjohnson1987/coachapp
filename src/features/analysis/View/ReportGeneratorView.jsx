// src/features/analysis/View/ReportGeneratorView.jsx
import React from 'react';

const ReportGeneratorView = ({ vm }) => {
  const {
    videoFile,
    videoMeta,
    frames,
    selectedFrames,
    transcription,
    report,
    loading,
    error,
    loadVideo,
    toggleFrameSelection,
    runTranscription,
    generateReport,
  } = vm;

  return (
    <div>
      <h2>Report Generator</h2>
      {/* UI components for video upload, frame selection, transcription display, and report generation */}
    </div>
  );
}

export default ReportGeneratorView;

