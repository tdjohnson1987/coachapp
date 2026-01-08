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

  transcription,

  captureNotes,
  keyFrames,

  sport: videoMeta?.sport || null,
});

export default createReport;
