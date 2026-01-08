import { useRef, useState, useMemo } from "react";
import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import useVideoDrawingVM from "./useVideoDrawingVM";

// Denna VM äger all “screen-orchestration” för VideoAnalyserView.
// Den tar in "analysis vm" (din vm-prop i view) som dependency.
export default function useVideoAnalyserScreenVM({ analysisVM }) {
    const videoDrawing = useVideoDrawingVM();

    const videoRef = useRef(null);

    // UI-state som tidigare låg i View
    const [playbackArmed, setPlaybackArmed] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ w: 1, h: 1 });
    const [videoKey, setVideoKey] = useState(0);

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
    } = analysisVM;

    // --- helpers ---
    const getVideoPosMs = async () => {
        try {
            const st = await videoRef.current?.getStatusAsync?.();
            if (st?.isLoaded) return st.positionMillis ?? 0;
        } catch { }
        return 0;
    };

    const clipRange = videoDrawing.getClipRange?.();
    const clipReady =
        !!videoFile &&
        typeof clipRange?.startMs === "number" &&
        typeof clipRange?.endMs === "number" &&
        clipRange.endMs > clipRange.startMs;

    // --- actions (flyttade från View) ---

    const handlePickVideo = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ["video/*"],
            copyToCacheDirectory: true,
        });
        if (result.canceled) return;

        const file = result.assets?.[0];
        if (!file?.uri) return;

        // stoppa video
        try {
            await videoRef.current?.stopAsync?.();
        } catch { }

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
        try {
            await videoRef.current?.setPositionAsync?.(0);
        } catch { }
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
            try {
                await videoRef.current?.pauseAsync?.();
            } catch { }
            setIsPlaying(false);
            return;
        }

        // START REC (startar INTE videon — man vill kunna rita på stillbild)
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

        // ARM först så vi INTE flashar "alla strokes"
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
        setPlaybackArmed(false);
        setIsPlaying(false);

        try {
            await videoRef.current?.pauseAsync?.();
        } catch { }
        try {
            await videoRef.current?.setPositionAsync?.(0);
        } catch { }

        await videoDrawing.clearAll?.();
        videoDrawing.setVideoTimeMs?.(0);
    };

    // Flyttad logik från onPlaybackStatusUpdate i View
    const onPlaybackStatusUpdate = async (status) => {
        if (!status?.isLoaded) return;

        const pos = status.positionMillis ?? 0;

        // viktigt: uppdatera tiden för timed replay
        videoDrawing.setVideoTimeMs?.(pos);

        // stoppa playback vid endMs
        const r = videoDrawing.getClipRange?.();
        const endMs = r?.endMs;

        if (
            (playbackArmed || videoDrawing.isPlayback) &&
            typeof endMs === "number" &&
            pos >= endMs
        ) {
            setPlaybackArmed(false);
            try {
                await videoRef.current?.pauseAsync?.();
            } catch { }
            setIsPlaying(false);
            await videoDrawing.stopPlayback?.();
            return;
        }

        if (status.didJustFinish) {
            setPlaybackArmed(false);
            setIsPlaying(false);
            await videoDrawing.stopPlayback?.();
        }
    };

    // strokesForCanvas-beräkningen flyttas också (så View inte behöver “veta”)
    const strokesForCanvas = useMemo(() => {
        const d = videoDrawing?.drawing;

        return videoDrawing.isRecording || videoDrawing.isPlayback || playbackArmed
            ? (videoDrawing.strokesToRender ?? [])
            : (d?.allToRender ?? d?.strokes ?? []);
    }, [videoDrawing, playbackArmed]);

    return {
        // från analysisVM (till View)
        videoFile,
        videoMeta,
        frames,
        selectedFrames,
        transcription,
        report,
        loading,
        error,
        toggleFrameSelection,
        addKeyFrame,

        // video refs/state
        videoRef,
        isPlaying,
        playbackArmed,
        canvasSize,
        videoKey,

        // drawing VM (till View)
        videoDrawing,
        strokesForCanvas,

        // computed
        clipReady,

        // handlers
        setCanvasSize,
        handlePickVideo,
        togglePlay,
        toggleRecording,
        togglePlayback,
        handleReset,
        onPlaybackStatusUpdate,
    };
}
