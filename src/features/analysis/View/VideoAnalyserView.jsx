import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  Pressable,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

import DrawingCanvas from "../../../components/drawing/DrawingCanvas";
import DrawingToolbar from "../../../components/drawing/DrawingToolbar";
import useVideoDrawingVM from "../ViewModel/useVideoDrawingVM.js";

const VideoAnalyzerView = ({ navigation, vm, route }) => {
  const videoDrawing = useVideoDrawingVM();

  const returnProfile = route?.params?.returnToProfile;
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
    loadVideo,
    toggleFrameSelection,
  } = vm;

  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 1, h: 1 });
  const [drawMode, setDrawMode] = useState(true);

  const d = videoDrawing?.drawing;

  const strokesForCanvas =
    videoDrawing?.isPlayback
      ? (videoDrawing?.strokesToRender ?? [])
      : (d?.allToRender ?? d?.strokes ?? []);




  // ✅ Robust adapter (panHandlers + toolbar props)
  const drawApi = d
    ? {
      panHandlers: d.panHandlers ?? d.panResponder?.panHandlers ?? d._panResponder?.panHandlers,
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



  const handlePickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["video/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const file = result.assets?.[0];
    if (!file?.uri) return;

    try {
      await videoRef.current?.stopAsync?.();
    } catch { }

    // reset state
    d?.clear?.();
    videoDrawing.stopPlayback?.();
    videoDrawing.stopRecording?.();
    setIsPlaying(false);

    await loadVideo({
      uri: file.uri,
      name: file.name ?? "video.mp4",
      size: file.size ?? 0,
      type: file.mimeType ?? "video/mp4",
    });
  };

  const togglePlay = async () => {
    if (!videoFile) return;

    if (Platform.OS === "web") {
      setIsPlaying((p) => !p);
      return;
    }

    try {
      if (isPlaying) {
        await videoRef.current?.pauseAsync?.();
        setIsPlaying(false);
      } else {
        await videoRef.current?.playAsync?.();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn("play/pause failed", e);
    }
  };

  const getVideoPosMs = async () => {
    try {
      const st = await videoRef.current?.getStatusAsync?.();
      if (st?.isLoaded) return st.positionMillis ?? 0;
    } catch { }
    return 0;
  };

  const toggleRecording = async () => {
    if (!videoFile) return;

    // stoppa playback om den kör
    if (videoDrawing.isPlayback) {
      await videoDrawing.stopPlayback?.();
      try { await videoRef.current?.pauseAsync?.(); } catch { }
      setIsPlaying(false);
    }

    if (videoDrawing.isRecording) {
      const endMs = await getVideoPosMs();
      await videoDrawing.stopRecording?.({ endVideoMs: endMs });

      // “Capture-känsla”: pausa när du stoppar REC
      try { await videoRef.current?.pauseAsync?.(); } catch { }
      setIsPlaying(false);
      return;
    }

    const startMs = await getVideoPosMs();
    await videoDrawing.startRecording?.({ startVideoMs: startMs });

    // “Capture-känsla”: börja spela när du startar REC
    try { await videoRef.current?.playAsync?.(); } catch { }
    setIsPlaying(true);
  };



  const togglePlayback = async () => {
    if (!videoFile) return;

    const range = videoDrawing.getClipRange?.();
    const startMs = range?.startMs;
    const endMs = range?.endMs;
    if (typeof startMs !== "number" || typeof endMs !== "number") return;

    if (videoDrawing.isPlayback) {
      await videoDrawing.stopPlayback?.();
      try { await videoRef.current?.pauseAsync?.(); } catch { }
      setIsPlaying(false);
      return;
    }

    try {
      await videoRef.current?.setPositionAsync?.(startMs);
      await videoRef.current?.playAsync?.();
      setIsPlaying(true);
    } catch { }

    d?.clear?.();

    await videoDrawing.startPlayback?.();
  };




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



  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>

        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitle}>Video Analysis</Text>
          {returnProfile && (
            <Text style={{ fontSize: 12, color: "#666", fontWeight: "600" }}>
              Analyzing: {returnProfile.name}
            </Text>
          )}
        </View>

        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        {returnProfile && (
          <Text style={{ marginBottom: 8, color: '#6C757D' }}>
            Analyserar: {returnProfile.name}
          </Text>
        )}

        {/* Video card */}
        <View style={styles.card}>
          <Text style={styles.label}>Videokälla</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handlePickVideo}>
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
              setCanvasSize({ w: width || 1, h: height || 1 });
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
                      autoPlay={isPlaying}
                    />
                  </View>
                ) : (
                  <Video
                    ref={videoRef}
                    source={{ uri: videoFile.uri }}
                    style={styles.video}
                    resizeMode="contain"
                    shouldPlay={isPlaying}
                    useNativeControls={false}
                    onPlaybackStatusUpdate={async (status) => {
                      if (!status?.isLoaded) return;

                      const pos = status.positionMillis ?? 0;
                      videoDrawing.setVideoTimeMs?.(pos);

                      const { endMs } = videoDrawing.getClipRange?.() ?? {};
                      if (videoDrawing.isPlayback && typeof endMs === "number" && pos >= endMs) {
                        try { await videoRef.current?.pauseAsync?.(); } catch { }
                        setIsPlaying(false);
                        await videoDrawing.stopPlayback?.();
                      }
                    }}



                  />
                )}

                {/* Drawing overlay (render-only) */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <DrawingCanvas
                    strokes={strokesForCanvas}
                    width={canvasSize.w}
                    height={canvasSize.h}
                  />
                </View>

                {/* Info */}
                <View style={styles.overlayInfoBox} pointerEvents="none">
                  <Text style={styles.overlayInfo}>
                    Objekt: {videoDrawing.strokesToRender?.length ?? 0}
                  </Text>
                </View>

                {/* Play/Pause overlay (tips: stäng Rita för att kunna trycka på play) */}
                <View style={styles.playOverlay} pointerEvents="box-none">
                  <Pressable onPress={togglePlay} style={styles.playButton}>
                    <Ionicons
                      name={isPlaying ? "pause-circle" : "play-circle"}
                      size={72}
                      color="#FFFFFF"
                    />
                  </Pressable>
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
            {!!videoFile && !!drawApi?.panHandlers && drawMode && (
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

            <TouchableOpacity onPress={drawApi?.clear} disabled={!videoFile || !drawApi}>
              <Text style={[styles.clearText, (!videoFile || !d) && styles.clearTextDisabled]}>
                Rensa ritning
              </Text>
            </TouchableOpacity>
          </View>

          {/* Controls: REC + PLAYBACK + Rita */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[
                styles.controlBtn,
                { backgroundColor: videoDrawing.isRecording ? "#DC3545" : "#34C759" },
                !videoFile && styles.controlBtnDisabled,
              ]}
              disabled={!videoFile}
              onPress={toggleRecording}
            >
              <Text style={styles.controlBtnText}>
                {videoDrawing.isRecording ? "STOP REC" : "REC"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlBtn,
                { backgroundColor: "#6F42C1" },
                (!videoFile || !videoDrawing.recordedEvents?.length) && styles.controlBtnDisabled,
              ]}
              disabled={!videoFile || !videoDrawing.recordedEvents?.length}
              onPress={togglePlayback}
            >
              <Text style={styles.controlBtnText}>
                {videoDrawing.isPlayback ? "STOP" : "PLAYBACK"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlBtn,
                { backgroundColor: drawMode ? "#0D6EFD" : "#ADB5BD" },
                !videoFile && styles.controlBtnDisabled,
              ]}
              disabled={!videoFile}
              onPress={() => setDrawMode((v) => !v)}
            >
              <Text style={styles.controlBtnText}>{drawMode ? "Rita: PÅ" : "Rita: AV"}</Text>
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
            <Text style={styles.helperText}>Inga frames ännu (kommer från analys-steget).</Text>
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
          <Text style={styles.statusText}>Transkription: {transcription ? "Klar" : "Ej påbörjad"}</Text>
          <Text style={styles.statusText}>Rapport: {report ? "Skapad" : "Ej skapad"}</Text>
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

  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    borderRadius: 999,
    overflow: "hidden",
  },

  overlayInfoBox: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overlayInfo: { color: "#fff", fontWeight: "600" },

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
