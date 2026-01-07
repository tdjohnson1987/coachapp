import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
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
    loadVideo,
    toggleFrameSelection,
    addKeyFrame,
  } = vm;

  const videoRef = useRef(null);

  // ✅ state (inte ref) för att undvika "flash" där alla strokes syns direkt
  const [playbackArmed, setPlaybackArmed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [canvasSize, setCanvasSize] = useState({ w: 1, h: 1 });
  const [videoKey, setVideoKey] = useState(0);

  const d = videoDrawing?.drawing;

  // När REC/PLAYBACK/Armed => rendera strokes från events (tidsstyrt)
  // annars => rendera "vanlig" ritning (om ni använder det läget)
  const strokesForCanvas =
    (videoDrawing.isRecording || videoDrawing.isPlayback || playbackArmed)
      ? (videoDrawing.strokesToRender ?? [])
      : (d?.allToRender ?? d?.strokes ?? []);

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

  const handlePickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["video/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const file = result.assets?.[0];
    if (!file?.uri) return;

    // stoppa video
    try { await videoRef.current?.stopAsync?.(); } catch { }

    // nollställ UI + VM
    setPlaybackArmed(false);
    setIsPlaying(false);
    await videoDrawing.clearAll?.();

    // tvinga nytt Video-instant
    setVideoKey((k) => k + 1);

    await loadVideo({
      uri: file.uri,
      name: file.name ?? "video.mp4",
      size: file.size ?? 0,
      type: file.mimeType ?? "video/mp4",
    });

    // starta från 0 visuellt/logiskt
    videoDrawing.setVideoTimeMs?.(0);
    try { await videoRef.current?.setPositionAsync?.(0); } catch { }
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

    // om playback kör -> stoppa
    if (videoDrawing.isPlayback || playbackArmed) {
      setPlaybackArmed(false);
      await videoDrawing.stopPlayback?.();
      try {
        await videoRef.current?.pauseAsync?.();
      } catch { }
      setIsPlaying(false);
    }

    // STOP REC
    if (videoDrawing.isRecording) {
      const endMs = await getVideoPosMs();
      await videoDrawing.stopRecording?.({ endVideoMs: endMs });

      // pausa när man stoppar rec (som ni vill)
      try { await videoRef.current?.pauseAsync?.(); } catch { }
      setIsPlaying(false);
      return;
    }

    // START REC (startar INTE videon — du vill kunna rita på stillbild)
    const startMs = await getVideoPosMs();
    await videoDrawing.startRecording?.({ startVideoMs: startMs });
  };

  const togglePlayback = async () => {
    if (!videoFile) return;

    const range = videoDrawing.getClipRange?.();
    const startMs = range?.startMs;
    const endMs = range?.endMs;
    if (typeof startMs !== "number" || typeof endMs !== "number") return;

    // STOP playback
    if (playbackArmed || videoDrawing.isPlayback) {
      setPlaybackArmed(false);
      await videoDrawing.stopPlayback?.();
      try {
        await videoRef.current?.pauseAsync?.();
      } catch { }
      setIsPlaying(false);
      return;
    }

    // ✅ ARM först så vi INTE flashar "alla strokes"
    setPlaybackArmed(true);

    try {
      // sätt video & playhead till clip-start
      await videoRef.current?.setPositionAsync?.(startMs);
      videoDrawing.setVideoTimeMs?.(startMs);

      // starta VM playback (ljud + flaggor)
      await videoDrawing.startPlayback?.();

      // spela video
      await videoRef.current?.playAsync?.();
      setIsPlaying(true);
    } catch (e) {
      console.warn("playback start failed", e);
      setPlaybackArmed(false);
    }
  };

  const handleReset = async () => {
    // stoppa allt
    setPlaybackArmed(false);
    setIsPlaying(false);

    try { await videoRef.current?.pauseAsync?.(); } catch { }
    try { await videoRef.current?.setPositionAsync?.(0); } catch { }

    await videoDrawing.clearAll?.();
    videoDrawing.setVideoTimeMs?.(0);
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

  const range = videoDrawing.getClipRange?.();
  const clipReady =
    !!videoFile &&
    typeof range?.startMs === "number" &&
    typeof range?.endMs === "number" &&
    range.endMs > range.startMs;

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
            <Text
              style={{ fontSize: 12, color: "#666", fontWeight: "600" }}
            >
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
            onPress={handlePickVideo}
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
              setCanvasSize({ w: width || 1, h: height || 1 });
            }}
            ref={captureRef}
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
                    key={`${videoKey}-${videoFile?.uri ?? ""}`}
                    ref={videoRef}
                    source={{ uri: videoFile.uri }}
                    style={styles.video}
                    resizeMode="contain"
                    shouldPlay={isPlaying}
                    useNativeControls={false}
                    onPlaybackStatusUpdate={async (status) => {
                      if (!status?.isLoaded) return;

                      const pos = status.positionMillis ?? 0;

                      // viktigt: uppdatera tiden för timed replay
                      videoDrawing.setVideoTimeMs?.(pos);

                      // stoppa playback vid endMs
                      const r = videoDrawing.getClipRange?.();
                      const endMs = r?.endMs;

                      if ((playbackArmed || videoDrawing.isPlayback) && typeof endMs === "number" && pos >= endMs) {
                        setPlaybackArmed(false);
                        try { await videoRef.current?.pauseAsync?.(); } catch { }
                        setIsPlaying(false);
                        await videoDrawing.stopPlayback?.();
                        return;
                      }

                      if (status.didJustFinish) {
                        setPlaybackArmed(false);
                        setIsPlaying(false);
                        await videoDrawing.stopPlayback?.();
                      }
                    }}
                  />
                )}

                {/* Drawing overlay */}
                <View
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                >
                  <DrawingCanvas
                    strokes={strokesForCanvas}
                    width={canvasSize.w}
                    height={canvasSize.h}
                  />
                </View>


              </>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons
                  name="videocam-outline"
                  size={40}
                  color="#ADB5BD"
                />
                <Text style={styles.placeholderText}>
                  Välj en video för att börja analysera
                </Text>
              </View>
            )}

            {/* Touch-layer för ritning (alltid på när video finns) */}
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
              {videoMeta
                ? `${Math.round(videoMeta.size / 1024 / 1024)} MB`
                : ""}
            </Text>

            <TouchableOpacity onPress={drawApi?.clear} disabled={!videoFile || !drawApi}>
              <Text style={[styles.clearText, (!videoFile || !drawApi) && styles.clearTextDisabled]}>
                Rensa ritning
              </Text>
            </TouchableOpacity>
          </View>

          {/* Controls: REC + PLAYBACK + PLAY + RESET */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[
                styles.controlBtn,
                {
                  backgroundColor: videoDrawing.isRecording
                    ? "#DC3545"
                    : "#34C759",
                },
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
                !clipReady && styles.controlBtnDisabled,
              ]}
              disabled={!clipReady}
              onPress={togglePlayback}
            >
              <Text style={styles.controlBtnText}>
                {(playbackArmed || videoDrawing.isPlayback) ? "STOP" : "PLAYBACK"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlBtn,
                { backgroundColor: "#343A40" },
                !videoFile && styles.controlBtnDisabled,
              ]}
              disabled={!videoFile}
              onPress={togglePlay}
            >
              <Text style={styles.controlBtnText}>{isPlaying ? "PAUSE" : "PLAY"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlBtn,
                { backgroundColor: "#0D6EFD" },
                !videoFile && styles.controlBtnDisabled,
              ]}
              disabled={!videoFile}
              onPress={handleReset}
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
          {loading && (
            <Text style={styles.statusText}>Bearbetar...</Text>
          )}
          {error && (
            <Text style={styles.errorText}>{String(error)}</Text>
          )}
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
