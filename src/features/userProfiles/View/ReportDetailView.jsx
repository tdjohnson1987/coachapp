import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

import useCaptureVM from "../../capture/ViewModel/useCaptureVM";
import useVideoAnalyserScreenVM from "../../analysis/ViewModel/useVideoAnalyserScreenVM";
import { useAnalysisVM } from "../../analysis/ViewModel/useAnalysisVM";
import DrawingCanvas from "../../../components/drawing/DrawingCanvas";
import AnalysisCanvas from "../../shared/AnalysisCanvas";

const ReportDetailView = ({ route, navigation }) => {
  const { playbackReport } = route.params;
  const isVideoAnalysis = playbackReport?.type === "Video Drawing Analysis";

  // Motor 1: För Video
  const analysisVM = useAnalysisVM({ coachId: 1, athleteId: 2 });
  const videoVM = useVideoAnalyserScreenVM({ analysisVM });

  // Motor 2: För Capture (Grön plan)
  const captureVM = useCaptureVM();

  useEffect(() => {
    if (!playbackReport) return;

    if (isVideoAnalysis) {
      // Ladda motorn för video
      analysisVM.loadVideo({
        uri: playbackReport.videoUri,
        name: playbackReport.title,
      });
      if (videoVM.videoDrawing) {
        videoVM.videoDrawing.recordedEvents = playbackReport.recordedEvents || [];
        videoVM.videoDrawing.setClipRange?.(playbackReport.clipRange);
      }
    } else {
      // Ladda motorn för Capture
      captureVM.loadSavedReport(playbackReport);
    }
  }, [playbackReport]);

  const handleTogglePlay = () => {
    if (isVideoAnalysis) {
      videoVM.togglePlayback();
    } else {
      captureVM.isPlaying ? captureVM.stopPlayback() : captureVM.startPlayback();
    }
  };

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
              {/* VIDEO-VY */}
              <Video
                ref={videoVM.videoRef}
                source={{ uri: playbackReport.videoUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
                shouldPlay={videoVM.isPlaying}
                onPlaybackStatusUpdate={videoVM.onPlaybackStatusUpdate}
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
              {/* CAPTURE-VY (Den gröna planen) */}
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