
// src/features/analysis/View/VideoAnalyzerView.jsx 
import React from 'react';


const VideoAnalyzerView = ({ vm }) => {
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
      <h2>Video Analyzer</h2>
      {/* UI components for video upload, frame selection, transcription display, and report generation */}
    </div>
  );
}

export default VideoAnalyzerView;



