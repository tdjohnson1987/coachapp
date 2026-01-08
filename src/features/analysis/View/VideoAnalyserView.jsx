import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
} from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

import DrawingCanvas from "../../../components/drawing/DrawingCanvas";
import DrawingToolbar from "../../../components/drawing/DrawingToolbar";
import useVideoAnalyserScreenVM from "../ViewModel/useVideoAnalyserScreenVM.js";

const VideoAnalyzerView = ({ navigation, vm, route }) => {
  const screen = useVideoAnalyserScreenVM({ analysisVM: vm });
  const videoDrawing = screen.videoDrawing;

  const returnProfile = route?.params?.returnToProfile;
  const profile = returnProfile || route?.params?.profile;

  const handleBack = () => {
    if (returnProfile) navigation.navigate("Profile", { profile: returnProfile });
    else navigation.navigate("Home");
  };

  const {
    videoFile,
    videoMeta,
    frames,
    selectedFrames,
    transcription,
    report,
    loading,
    error,
    toggleFrameSelection,
  } = vm;

  const d = videoDrawing?.drawing;

  // Adapter för DrawingToolbar + touch-layer
  const drawApi = d
    ? {
      panHandlers:
        d.panHandlers ??
        d.panResponder?.panHandlers ??
        d._panResponder?.panHandlers,
      tool: d.activeTool ?? d.tool,
      setTool: d.setActiveTool ?? d.setTool,
      color: d.activeColor ?? d.color,
      setColor: d.setActiveColor ?? d.setColor,
      strokeWidth: d.activeWidth ?? d.strokeWidth,
      setStrokeWidth: d.setActiveWidth ?? d.setStrokeWidth,
      undo: d.undo,
      clear: d.clear,
    }
    : null;

  const renderFrameItem = ({ item }) => {
    const isSelected = selectedFrames.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.tag, isSelected && styles.tagActive]}
        onPress={() => toggleFrameSelection(item.id)}
      >
        <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
          t={item.time}s
        </Text>
      </TouchableOpacity>
    );
  };

  const clipReady = screen.clipReady;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>

        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitle}>Video Analysis</Text>
          {profile && (
            <Text style={{ fontSize: 12, color: "#666", fontWeight: "600" }}>
              Analyserar: {profile.name}
            </Text>
          )}
        </View>

        <View style={{ width: 32 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {returnProfile && (
          <Text style={{ marginBottom: 8, color: "#6C757D" }}>
            Analyserar: {returnProfile.name}
          </Text>
        )}

        {/* Video card */}
        <View style={styles.card}>
          <Text style={styles.label}>Videokälla</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={screen.handlePickVideo}
          >
            <Text style={styles.primaryButtonText}>
              {videoMeta ? "Byt video" : "Välj video"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            {videoMeta ? videoMeta.name : "Ingen video vald ännu"}
          </Text>

          <View
            style={styles.videoWrapper}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              screen.setCanvasSize({ w: width || 1, h: height || 1 });
            }}
          >
            {videoFile ? (
              <>
                {Platform.OS === "web" ? (
                  <View style={{ flex: 1 }}>
                    <video
                      src={videoFile.uri}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                      controls
                      autoPlay={screen.isPlaying}
                    />
                  </View>
                ) : (
                  <Video
                    key={`${screen.videoKey}-${videoFile?.uri ?? ""}`}
                    ref={screen.videoRef}
                    source={{ uri: videoFile.uri }}
                    style={styles.video}
                    resizeMode="contain"
                    shouldPlay={screen.isPlaying}
                    useNativeControls={false}
                    onPlaybackStatusUpdate={screen.onPlaybackStatusUpdate}
                  />
                )}

                {/* Drawing overlay */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <DrawingCanvas
                    strokes={screen.strokesForCanvas}
                    width={screen.canvasSize.w}
                    height={screen.canvasSize.h}
                  />
                </View>
              </>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="videocam-outline" size={40} color="#ADB5BD" />
                <Text style={styles.placeholderText}>
                  Välj en video för att börja analysera
                </Text>
              </View>
            )}

            {/* Touch-layer för ritning */}
            {!!videoFile && !!drawApi?.panHandlers && (
              <View
                style={[StyleSheet.absoluteFill, { zIndex: 50 }]}
                pointerEvents="auto"
                {...drawApi.panHandlers}
              />
            )}
          </View>

          {/* Meta + clear */}
          <View style={styles.inlineRow}>
            <Text style={styles.metaText}>
              {videoMeta ? `${Math.round(videoMeta.size / 1024 / 1024)} MB` : ""}
            </Text>

            <TouchableOpacity
              onPress={drawApi?.clear}
              disabled={!videoFile || !drawApi}
            >
              <Text
                style={[
                  styles.clearText,
                  (!videoFile || !drawApi) && styles.clearTextDisabled,
                ]}
              >
                Rensa ritning
              </Text>
            </TouchableOpacity>
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[
                styles.controlBtn,
                { backgroundColor: videoDrawing.isRecording ? "#DC3545" : "#34C759" },
                !videoFile && styles.controlBtnDisabled,
              ]}
              disabled={!videoFile}
              onPress={screen.toggleRecording}
            >
              <Text style={styles.controlBtnText}>
                {videoDrawing.isRecording ? "STOP REC" : "REC"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlBtn,
                { backgroundColor: "#6F42C1" },
                !clipReady && styles.controlBtnDisabled,
              ]}
              disabled={!clipReady}
              onPress={screen.togglePlayback}
            >
              <Text style={styles.controlBtnText}>
                {(screen.playbackArmed || videoDrawing.isPlayback) ? "STOP" : "PLAYBACK"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlBtn,
                { backgroundColor: "#343A40" },
                !videoFile && styles.controlBtnDisabled,
              ]}
              disabled={!videoFile}
              onPress={screen.togglePlay}
            >
              <Text style={styles.controlBtnText}>
                {screen.isPlaying ? "PAUSE" : "PLAY"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlBtn,
                { backgroundColor: "#0D6EFD" },
                !videoFile && styles.controlBtnDisabled,
              ]}
              disabled={!videoFile}
              onPress={screen.handleReset}
            >
              <Text style={styles.controlBtnText}>RESET</Text>
            </TouchableOpacity>
          </View>

          {/* Toolbar */}
          {drawApi && (
            <DrawingToolbar
              tool={drawApi.tool}
              setTool={drawApi.setTool}
              color={drawApi.color}
              setColor={drawApi.setColor}
              strokeWidth={drawApi.strokeWidth}
              setStrokeWidth={drawApi.setStrokeWidth}
              onUndo={drawApi.undo}
            />
          )}
        </View>

        {/* Key frames + status */}
        <View style={styles.card}>
          <Text style={styles.label}>Nyckelframes</Text>

          {frames.length === 0 ? (
            <Text style={styles.helperText}>
              Inga frames ännu (kommer från analys-steget).
            </Text>
          ) : (
            <FlatList
              horizontal
              data={frames}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderFrameItem}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4 }}
            />
          )}

          <View style={styles.divider} />

          <Text style={styles.label}>Status</Text>
          <Text style={styles.statusText}>
            Transkription: {transcription ? "Klar" : "Ej påbörjad"}
          </Text>
          <Text style={styles.statusText}>
            Rapport: {report ? "Skapad" : "Ej skapad"}
          </Text>
          {loading && <Text style={styles.statusText}>Bearbetar...</Text>}
          {error && <Text style={styles.errorText}>{String(error)}</Text>}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  iconButton: { padding: 5 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#1A1A1A" },

  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6C757D",
    marginBottom: 8,
    textTransform: "uppercase",
  },

  primaryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 6,
  },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  helperText: { fontSize: 13, color: "#6C757D", marginBottom: 8 },

  videoWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    marginTop: 8,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  video: { width: "100%", height: "100%" },

  videoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  placeholderText: {
    color: "#CED4DA",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },

  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  metaText: { fontSize: 12, color: "#868E96" },
  clearText: { fontSize: 13, color: "#DC3545", fontWeight: "600" },
  clearTextDisabled: { color: "#CED4DA" },

  controlsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  controlBtnText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  controlBtnDisabled: { opacity: 0.45 },

  tag: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F1F3F5",
    marginRight: 8,
  },
  tagActive: { backgroundColor: "#007AFF" },
  tagText: { fontSize: 12, color: "#495057", fontWeight: "600" },
  tagTextActive: { color: "#FFF" },

  divider: { height: 1, backgroundColor: "#E9ECEF", marginVertical: 10 },
  statusText: { fontSize: 14, color: "#343A40", marginTop: 2 },
  errorText: { fontSize: 14, color: "#DC3545", marginTop: 4 },
});

export default VideoAnalyzerView;
