// src/features/shared/AnalysisService.ts

export const AnalysisService = {
  formatAnalysis: (type: 'Drawing' | 'Video', data: any, audioUri?: string) => {
    return {
      id: Date.now(),
      date: new Date().toLocaleDateString('sv-SE'),
      time: new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
      type: type,
      audioUri: audioUri || null,
      drawingData: data, // Sparar rit-events/data
    };
  },

  // NY FUNKTION: Fördelar data till rätt ställe i valfri ViewModel
  loadAnalysis: (report: any, actions: {
    setAudio: (uri: string | null) => void,
    setDrawingData: (data: any) => void,
    setBackground?: (bg: any) => void,
    onReady?: () => void
  }) => {
    if (!report) return;

    // 1. Sätt ljudspåret
    actions.setAudio(report.audioUri);

    // 2. Sätt rit-data (events)
    actions.setDrawingData(report.drawingData || []);

    // 3. Om det finns en bakgrund (bild/video), sätt den
    if (report.thumbnail && actions.setBackground) {
      actions.setBackground(report.thumbnail);
    }

    // 4. Signalera att laddningen är klar (valfritt)
    if (actions.onReady) actions.onReady();
  }
};