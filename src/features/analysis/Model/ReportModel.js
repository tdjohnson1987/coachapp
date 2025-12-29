const ReportModel = {
  reportId: "unique_id",
  coachId: "coach_profile_id",
  athleteId: "athlete_profile_id",
  timestamp: "2025-12-28T14:30:00Z",
  videoSourceId: "capture_video_id",
  
  // Text content from STT
  transcription: {
    fullText: "Coach narration converted to text...",
    segments: [
      {
        timestamp: 5.2,
        text: "At 5 seconds, the player was...",
        frameIndex: 156
      }
    ]
  },
  
  // Relevant frames with annotations
  frames: [
    {
      frameIndex: 156,
      timestamp: 5.2,
      imageUrl: "frame_156.jpg",
      annotations: {
        drawings: [],
        labels: ["Player A", "Pass destination"]
      },
      metrics: {
        // From pose estimation
        poseData: {},
        speed: "5.2 m/s",
        acceleration: "0.8 m/s²"
      }
    }
  ],
  
  // Metadata
  sport: "football",
  playType: "attacking_move",
  playerPositions: {
    "Player1": {x: 0.23, y: 0.56}, // normalized coords
    "Player2": {x: 0.67, y: 0.42}
  },
  
  // Export
  exportFormat: "pdf",
  exportDate: "2025-12-28T14:45:00Z"
}

export default ReportModel 