// src/features/analysis/Model/ReportModel.js
const createReport = ({
  coachId,
  athleteId,
  videoMeta,
  transcription,
  captureNotes,
  keyFrames,
}) => ({
  reportId: Date.now().toString(),
  coachId,
  athleteId,
  createdAt: new Date().toISOString(),
  videoSourceId: videoMeta?.id || null,
  videoMeta: videoMeta || null,

  transcription,           // { fullText, segments: [...] }

  captureNotes,            // [{ id, imageUri, text }]
  keyFrames,               // [{ id, time, imageUri, strokes, note }]

  sport: videoMeta?.sport || null,
});

export default createReport;
