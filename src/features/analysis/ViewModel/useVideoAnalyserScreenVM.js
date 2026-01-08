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
    const playbackTimerRef = useRef(null);
    const playbackWallStartRef = useRef(null);

    const stopPlaybackTimer = () => {
        if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current);
            playbackTimerRef.current = null;
        }
        playbackWallStartRef.current = null;
    };

    const startPlaybackTimer = async () => {
        stopPlaybackTimer();
        playbackWallStartRef.current = Date.now();

        playbackTimerRef.current = setInterval(async () => {
            const t = Date.now() - (playbackWallStartRef.current ?? Date.now());

            // driv ritningens playback-tid (timeline)
            videoDrawing.setPlaybackTimeline?.(t);

            const ref = playbackMetaRef.current;

            while (ref.idx < ref.events.length && (ref.events[ref.idx].t ?? 0) <= t) {
                const ev = ref.events[ref.idx];
                ref.idx += 1;

                try {
                    // hoppa till positionen som spelades in när play/pause klickades
                    if (typeof ev.posMs === "number") {
                        await videoRef.current?.setPositionAsync?.(ev.posMs);
                        videoDrawing.setVideoTimeMs?.(ev.posMs);
                    }

                    if (ev.type === "video-pause") {
                        await videoRef.current?.pauseAsync?.();
                        setIsPlaying(false);
                    } else if (ev.type === "video-play") {
                        await videoRef.current?.playAsync?.();
                        setIsPlaying(true);
                    }
                } catch { }
            }


            const dur = videoDrawing.getTimelineDuration?.() ?? 0;

            // stoppa när timeline är slut (inte när videon når endMs)
            if (t >= dur + 50) {
                stopPlaybackTimer();
                setPlaybackArmed(false);
                try { await videoRef.current?.pauseAsync?.(); } catch { }
                setIsPlaying(false);
                await videoDrawing.stopPlayback?.();
            }
        }, 33);
    };

    const playbackMetaRef = useRef({ events: [], idx: 0 }); //Här?



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
        stopPlaybackTimer();

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
            // Web: du kan logga event även här om du har video-elementet,
            // men med din nuvarande setup skippar vi web för enkelhet.
            setIsPlaying((p) => !p);
            return;
        }

        try {
            // Hämta position + timeline FÖRE vi togglar (så eventet blir korrekt tidsstämplat)
            const posMs = await getVideoPosMs();
            const t = videoDrawing.getTimelineNow?.() ?? 0;

            if (videoDrawing.isRecording) {
                videoDrawing.pushMetaEvent?.({
                    type: isPlaying ? "video-pause" : "video-play",
                    t,
                    posMs,
                });
            }

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

        // Om playback kör -> stoppa playback + timer + video
        if (videoDrawing.isPlayback || playbackArmed) {
            setPlaybackArmed(false);
            await videoDrawing.stopPlayback?.();
            stopPlaybackTimer();

            try {
                await videoRef.current?.pauseAsync?.();
            } catch { }
            setIsPlaying(false);
        }

        // STOP REC
        if (videoDrawing.isRecording) {
            const endMs = await getVideoPosMs();
            await videoDrawing.stopRecording?.({ endVideoMs: endMs });

            // pausa när man stoppar rec
            try {
                await videoRef.current?.pauseAsync?.();
            } catch { }
            setIsPlaying(false);

            return;
        }

        // START REC (startar INTE videon — man vill kunna rita på stillbild)
        const startMs = await getVideoPosMs();
        await videoDrawing.startRecording?.({ startVideoMs: startMs });

        // Logga initialt videoläge vid start av inspelning
        // (så playback kan veta om videon var pausad eller spelade när inspelningen började)
        const t0 = videoDrawing.getTimelineNow?.() ?? 0;
        videoDrawing.pushMetaEvent?.({
            type: isPlaying ? "video-play" : "video-pause",
            t: t0,
            posMs: startMs,
        });
    };


    const togglePlayback = async () => {
        if (!videoFile) return;

        const range = videoDrawing.getClipRange?.();
        const startMs = range?.startMs;
        const endMs = range?.endMs;
        if (typeof startMs !== "number" || typeof endMs !== "number") return;

        // STOP playback
        if (playbackArmed || videoDrawing.isPlayback) {
            stopPlaybackTimer();
            playbackMetaRef.current = { events: [], idx: 0 };
            setPlaybackArmed(false);
            await videoDrawing.stopPlayback?.();
            try { await videoRef.current?.pauseAsync?.(); } catch { }
            setIsPlaying(false);
            return;
        }

        setPlaybackArmed(true);

        try {
            await videoRef.current?.setPositionAsync?.(startMs);
            videoDrawing.setVideoTimeMs?.(startMs);

            await videoDrawing.startPlayback?.();

            const meta = (videoDrawing.recordedEvents ?? [])
                .filter(e => e?.type === "video-play" || e?.type === "video-pause")
                .slice()
                .sort((a, b) => (a.t ?? 0) - (b.t ?? 0));

            playbackMetaRef.current = { events: meta, idx: 0 };


            await videoRef.current?.playAsync?.();
            setIsPlaying(true);

            await startPlaybackTimer(); // ✅ starta timern här
        } catch (e) {
            console.warn("playback start failed", e);
            stopPlaybackTimer();
            setPlaybackArmed(false);
        }
    };

    const handleReset = async () => {
        stopPlaybackTimer();
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



        if (status.didJustFinish) {
            stopPlaybackTimer();
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
