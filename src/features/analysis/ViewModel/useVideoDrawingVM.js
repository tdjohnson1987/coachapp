import { useMemo, useRef, useState } from "react";
import { Audio } from "expo-av";
import useDrawingVM from "../../../components/drawing/useDrawingVM";

// recordedEvents: { type:"add"|"undo"|"clear", t:number(ms, RELATIVT TAGNINGEN), stroke? }
export default function useVideoDrawingVM() {
    // --- Video time (ABSOLUT i videon)
    const videoTimeAbsRef = useRef(0);

    // --- “Tagning” (clip range i ABSOLUT video-ms)
    const clipStartMsRef = useRef(null);
    const clipEndMsRef = useRef(null);

    // --- Recording/playback flags
    const [isRecording, setIsRecording] = useState(false);
    const [isPlayback, setIsPlayback] = useState(false);

    const [recordedEvents, setRecordedEvents] = useState([]);
    const [audioUri, setAudioUri] = useState(null);

    // --- Audio (mic record + playback sound)
    const audioRecRef = useRef(null);
    const audioSoundRef = useRef(null);

    const setVideoTimeMs = (absMs) => {
        videoTimeAbsRef.current = absMs ?? 0;
    };

    const getClipRange = () => ({
        startMs: clipStartMsRef.current,
        endMs: clipEndMsRef.current,
    });

    // ABS -> REL (relativt clipStart)
    const getRelMs = () => {
        const s = clipStartMsRef.current ?? 0;
        return Math.max(0, (videoTimeAbsRef.current ?? 0) - s);
    };

    const pushEvent = (evt) => setRecordedEvents((prev) => [...prev, evt]);

    // --- Drawing VM (tar callbacks som i Capture)
    const drawing = useDrawingVM({
        enabled: true,
        onAddStroke: (stroke) => {
            if (!isRecording) return;
            pushEvent({ type: "add", t: getRelMs(), stroke });
        },
        onUndo: () => {
            if (!isRecording) return;
            pushEvent({ type: "undo", t: getRelMs() });
        },
        onClear: () => {
            if (!isRecording) return;
            pushEvent({ type: "clear", t: getRelMs() });
        },
    });

    const clearAll = async () => {
        drawing?.clear?.();
        setRecordedEvents([]);
        setAudioUri(null);
        clipStartMsRef.current = null;
        clipEndMsRef.current = null;
        setIsRecording(false);
        setIsPlayback(false);

        try {
            await audioSoundRef.current?.stopAsync?.();
        } catch { }
        try {
            await audioSoundRef.current?.unloadAsync?.();
        } catch { }
        audioSoundRef.current = null;

        try {
            await audioRecRef.current?.stopAndUnloadAsync?.();
        } catch { }
        audioRecRef.current = null;
    };

    // ✅ Start REC: klippet startar vid NUvarande videotid
    const startRecording = async ({ startVideoMs } = {}) => {
        // ny tagning
        const startAbs = typeof startVideoMs === "number" ? startVideoMs : videoTimeAbsRef.current ?? 0;
        clipStartMsRef.current = startAbs;
        clipEndMsRef.current = null;

        setRecordedEvents([]);
        setAudioUri(null);
        setIsPlayback(false);

        // audio record (mic)
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });


            const rec = new Audio.Recording();
            await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            await rec.startAsync();
            audioRecRef.current = rec;
        } catch (e) {
            console.warn("audio record start failed", e);
            audioRecRef.current = null;
        }

        setIsRecording(true);
    };

    // ✅ Stop REC: sätter clipEndMs vid NUvarande videotid och sparar mic-audio
    const stopRecording = async ({ endVideoMs } = {}) => {
        const endAbs = typeof endVideoMs === "number" ? endVideoMs : videoTimeAbsRef.current ?? 0;
        clipEndMsRef.current = endAbs;

        await Audio.setAudioModeAsync({ //HÄR?
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
        });


        // stop mic record
        try {
            const rec = audioRecRef.current;
            if (rec) {
                await rec.stopAndUnloadAsync();
                const uri = rec.getURI();
                setAudioUri(uri ?? null);
            }
        } catch (e) {
            console.warn("audio record stop failed", e);
        } finally {
            audioRecRef.current = null;
        }

        setIsRecording(false);
    };

    // ✅ Playback: events bygger ritning utifrån REL playhead (video position - clipStart)
    const startPlayback = async () => {
        if (!recordedEvents.length) return;
        setIsPlayback(true);

        // starta mic playback från början (synkas genom att vi startar samtidigt som video)
        if (audioUri) {
            try {
                // städa gammal
                try {
                    await audioSoundRef.current?.stopAsync?.();
                } catch { }
                try {
                    await audioSoundRef.current?.unloadAsync?.();
                } catch { }
                audioSoundRef.current = null;

                const { sound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
                audioSoundRef.current = sound;
            } catch (e) {
                console.warn("audio playback failed", e);
            }
        }
    };

    const stopPlayback = async () => {
        setIsPlayback(false);
        try {
            await audioSoundRef.current?.stopAsync?.();
        } catch { }
    };

    // Render strokes:
    // - under REC / PLAYBACK: rel = (videoAbs - clipStart)
    // - annars: visa allt (Infinity)
    const strokesToRender = useMemo(() => {
        const buildStrokesAtTime = (t) => {
            let s = [];
            for (const evt of recordedEvents) {
                if (evt.t > t) break;
                if (evt.type === "add" && evt.stroke) s = [...s, evt.stroke];
                if (evt.type === "undo") s = s.slice(0, -1);
                if (evt.type === "clear") s = [];
            }
            return s;
        };

        if (isRecording || isPlayback) return buildStrokesAtTime(getRelMs());
        return buildStrokesAtTime(Number.POSITIVE_INFINITY);
    }, [recordedEvents, isRecording, isPlayback]);

    return {
        drawing,

        // states
        isRecording,
        isPlayback,
        recordedEvents,
        audioUri,

        // clip
        getClipRange,

        // time
        setVideoTimeMs,

        // actions
        startRecording,
        stopRecording,
        startPlayback,
        stopPlayback,
        clearAll,

        // render
        strokesToRender,
    };
}
