import { useRef, useState, useMemo } from "react";
import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import useVideoDrawingVM from "./useVideoDrawingVM";


export default function useVideoAnalyserScreenVM({ analysisVM }) {
    const videoDrawing = useVideoDrawingVM();

    const videoRef = useRef(null);

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

    const handlePickVideo = async () => {
        stopPlaybackTimer();

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

        setPlaybackArmed(false);
        setIsPlaying(false);
        await videoDrawing.clearAll?.();

        setVideoKey((k) => k + 1);

        await loadVideo({
            uri: file.uri,
            name: file.name ?? "video.mp4",
            size: file.size ?? 0,
            type: file.mimeType ?? "video/mp4",
        });

        videoDrawing.setVideoTimeMs?.(0);
        try {
            await videoRef.current?.setPositionAsync?.(0);
        } catch { }
    };

    const togglePlay = async () => {
        if (!videoFile) return;

        if (Platform.OS === "web") {
            return;
        }

        try {
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

        if (videoDrawing.isPlayback || playbackArmed) {
            setPlaybackArmed(false);
            await videoDrawing.stopPlayback?.();
            stopPlaybackTimer();

            try {
                await videoRef.current?.pauseAsync?.();
            } catch { }
            setIsPlaying(false);
        }

        if (videoDrawing.isRecording) {
            const endMs = await getVideoPosMs();
            await videoDrawing.stopRecording?.({ endVideoMs: endMs });

            try {
                await videoRef.current?.pauseAsync?.();
            } catch { }
            setIsPlaying(false);

            return;
        }

        const startMs = await getVideoPosMs();
        await videoDrawing.startRecording?.({ startVideoMs: startMs });

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

            try {
                await videoRef.current?.setVolumeAsync?.(0.1);
            } catch { }

            await videoRef.current?.playAsync?.();
            setIsPlaying(true);

            await startPlaybackTimer();
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
            await videoRef.current?.setVolumeAsync?.(1.0);
        } catch { }


        try {
            await videoRef.current?.pauseAsync?.();
        } catch { }
        try {
            await videoRef.current?.setPositionAsync?.(0);
        } catch { }

        await videoDrawing.clearAll?.();
        videoDrawing.setVideoTimeMs?.(0);
    };

    const onPlaybackStatusUpdate = async (status) => {
        if (!status?.isLoaded) return;

        const pos = status.positionMillis ?? 0;
        videoDrawing.setVideoTimeMs?.(pos);

        if (status.didJustFinish) {
            stopPlaybackTimer();
            setPlaybackArmed(false);
            setIsPlaying(false);
            await videoDrawing.stopPlayback?.();
        }
    };

    const strokesForCanvas = useMemo(() => {
        const d = videoDrawing?.drawing;

        return videoDrawing.isRecording || videoDrawing.isPlayback || playbackArmed
            ? (videoDrawing.strokesToRender ?? [])
            : (d?.allToRender ?? d?.strokes ?? []);
    }, [videoDrawing, playbackArmed]);

    return {
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
        videoRef,
        isPlaying,
        playbackArmed,
        canvasSize,
        videoKey,
        videoDrawing,
        strokesForCanvas,
        clipReady,

        setCanvasSize,
        handlePickVideo,
        togglePlay,
        toggleRecording,
        togglePlayback,
        handleReset,
        onPlaybackStatusUpdate,
    };
}
