import React, { useEffect, useState } from 'react';
// Lade till ActivityIndicator här:
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

import useCaptureVM from "../../capture/ViewModel/useCaptureVM";
import useVideoAnalyserScreenVM from "../../analysis/ViewModel/useVideoAnalyserScreenVM";
import { useAnalysisVM } from "../../analysis/ViewModel/useAnalysisVM";
import DrawingCanvas from "../../../components/drawing/DrawingCanvas";
import AnalysisCanvas from "../../shared/AnalysisCanvas";

const ReportDetailView = ({ route, navigation }) => {
  const { playbackReport } = route.params;
  const [isReady, setIsReady] = useState(false);
  const [dataApplied, setDataApplied] = useState(false);
  
  const isVideoAnalysis = playbackReport?.type?.includes("Video") || !!playbackReport?.videoUri;
  const currentProfileId = playbackReport?.profileId || playbackReport?.athleteId;

  const analysisVM = useAnalysisVM({ athleteId: currentProfileId });
  const videoVM = useVideoAnalyserScreenVM({ analysisVM });
  const captureVM = useCaptureVM();

  // 1. Denna funktion bevakar videons status och injicerar data när den är "Loaded"
  const onPlaybackStatusUpdate = async (status) => {
    videoVM.onPlaybackStatusUpdate(status);

    if (status.isLoaded && !dataApplied) {
      console.log("Video status: LOADED. Injecting data...");
      
      if (videoVM.videoDrawing) {
        // Tvinga in datan direkt i refs
        videoVM.videoDrawing.setRecordedEventsManual?.(playbackReport.recordedEvents || []);
        videoVM.videoDrawing.setClipRangeManual?.(playbackReport.clipRange);
        
        const startPos = playbackReport.clipRange?.startMs || 0;
        await videoVM.videoRef.current?.setPositionAsync(startPos);
        videoVM.videoDrawing.setVideoTimeMs?.(startPos);
      }
      setDataApplied(true);
    }
  };

  useEffect(() => {
    async function setup() {
      if (!playbackReport) return;
      if (isVideoAnalysis) {
        // Ladda videofilen i motorn
        await analysisVM.loadVideo({
          uri: playbackReport.videoUri,
          name: playbackReport.title,
        });
      } else {
        captureVM.loadSavedReport(playbackReport);
      }
      setIsReady(true);
    }
    setup();
  }, [playbackReport]);

  const handleTogglePlay = async () => {
    if (isVideoAnalysis) {
      // SÄKERHETS-CHECK: Om VM:en tappat sitt range, tvinga in det igen precis innan start
      const currentRange = videoVM.videoDrawing.getClipRange();
      if (!currentRange || typeof currentRange.startMs !== 'number') {
        console.log("Range saknades i VM, tvingar in från rapport...");
        videoVM.videoDrawing.setClipRangeManual(playbackReport.clipRange);
      }
      
      // Anropa den faktiska uppspelningslogiken
      await videoVM.togglePlayback();
    } else {
      captureVM.isPlaying ? captureVM.stopPlayback() : captureVM.startPlayback();
    }
  };

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Laddar analys...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{playbackReport?.title || "Analys"}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <View 
          style={styles.pitchWrapperDetail}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            isVideoAnalysis ? videoVM.setCanvasSize({ w: width, h: height }) : captureVM.setCanvasSize({ w: width, h: height });
          }}
        >
          {isVideoAnalysis ? (
            <>
              <Video
                ref={videoVM.videoRef}
                source={{ uri: playbackReport.videoUri }}
                onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
                shouldPlay={videoVM.isPlaying}
              />
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <DrawingCanvas
                  strokes={videoVM.strokesForCanvas}
                  width={videoVM.canvasSize.w}
                  height={videoVM.canvasSize.h}
                />
              </View>
            </>
          ) : (
            <>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0B6E3A' }]} />
              {playbackReport.activeImageSource && (
                <Image source={playbackReport.activeImageSource} style={styles.imageFix} resizeMode="contain" />
              )}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <AnalysisCanvas 
                  allToRender={captureVM.allToRender} 
                  canvasSize={captureVM.canvasSize} 
                  getArrowHead={captureVM.getArrowHead}
                />
              </View>
            </>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.playBtn, (videoVM.playbackArmed || captureVM.isPlaying) && styles.stopBtn]} 
          onPress={handleTogglePlay}
        >
          <Ionicons 
            name={(videoVM.playbackArmed || captureVM.isPlaying) ? "square" : "play"} 
            size={24} color="#FFF" 
          />
          <Text style={styles.playBtnText}>
            {(videoVM.playbackArmed || captureVM.isPlaying) ? "Stoppa" : "Spela analys"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  card: { margin: 20, padding: 15, backgroundColor: '#FFF', borderRadius: 20, elevation: 3 },
  pitchWrapperDetail: { width: '100%', aspectRatio: 16 / 9, borderRadius: 15, overflow: 'hidden', backgroundColor: '#000' },
  imageFix: { width: '100%', height: '100%' },
  playBtn: { flexDirection: 'row', backgroundColor: '#007AFF', marginTop: 20, padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 10 },
  stopBtn: { backgroundColor: '#FF3B30' },
  playBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});

export default ReportDetailView;