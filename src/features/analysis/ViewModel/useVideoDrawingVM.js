import { useMemo, useRef, useState } from "react";
import { Audio } from "expo-av";
import useDrawingVM from "../../../components/drawing/useDrawingVM";

export default function useVideoDrawingVM() {
    // ----- video time (ABS, ms) -----
    const [videoTimeAbsMs, setVideoTimeAbsMs] = useState(0);
    const videoTimeAbsRef = useRef(0);

    const setVideoTimeMs = (absMs) => {
        const v = absMs ?? 0;
        videoTimeAbsRef.current = v;
        setVideoTimeAbsMs(v);
    };

    // ----- clip range in video time -----
    const clipStartMsRef = useRef(null);
    const clipEndMsRef = useRef(null);

    const getClipRange = () => ({
        startMs: clipStartMsRef.current,
        endMs: clipEndMsRef.current,
    });

    // ----- recording / playback flags -----
    const [isRecording, setIsRecording] = useState(false);
    const [isPlayback, setIsPlayback] = useState(false);
    const [isPlaybackArmed, setIsPlaybackArmed] = useState(false);

    const isRecordingRef = useRef(false);

    // ----- events + audio -----
    const [recordedEvents, setRecordedEvents] = useState([]);
    const [audioUri, setAudioUri] = useState(null);

    const audioRecRef = useRef(null);
    const audioSoundRef = useRef(null);

    const getRelMsRecording = () => {
        const startAbs = clipStartMsRef.current ?? 0;
        const nowAbs = videoTimeAbsRef.current ?? 0;
        return Math.max(0, nowAbs - startAbs);
    };


    // playback time base uses video position - clipStart
    const getRelMsPlayback = () => {
        const s = clipStartMsRef.current ?? 0;
        return Math.max(0, (videoTimeAbsMs ?? 0) - s);
    };

    const pushEvent = (evt) => setRecordedEvents((prev) => [...prev, evt]);
    const pushMetaEvent = pushEvent;



    const recWallStartRef = useRef(null);
    const getTimelineMs = () => {
        const s = recWallStartRef.current ?? Date.now();
        return Math.max(0, Date.now() - s);
    };

    const getTimelineNow = () => getTimelineMs();


    const [playbackTimelineMs, setPlaybackTimelineMs] = useState(0);
    const playbackTimelineRef = useRef(0);

    const setPlaybackTimeline = (ms) => {
        const v = ms ?? 0;
        playbackTimelineRef.current = v;
        setPlaybackTimelineMs(v);
    };


    // Sort events for stable replay
    const eventsSorted = useMemo(() => {
        return [...recordedEvents].sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
    }, [recordedEvents]);

    const getTimelineDuration = () => {
        const last = eventsSorted.length ? (eventsSorted[eventsSorted.length - 1].t ?? 0) : 0;
        return last;
    };


    // ----- Drawing VM (records detailed stroke build) -----
    const drawing = useDrawingVM({
        enabled: true,

        onStrokeStart: ({ id, stroke }) => {
            if (!isRecordingRef.current) return;
            if (!id || !stroke) return;
            pushEvent({ type: "stroke-start", t: getTimelineMs(), id, stroke });
        },

        onStrokePoint: ({ id, stroke }) => {
            if (!isRecordingRef.current) return;
            if (!id || !stroke) return;
            pushEvent({ type: "stroke-point", t: getTimelineMs(), id, stroke });
        },

        onStrokeEnd: ({ id }) => {
            if (!isRecordingRef.current) return;
            if (!id) return;
            pushEvent({ type: "stroke-end", t: getTimelineMs(), id });
        },

        onUndo: () => {
            if (!isRecordingRef.current) return;
            pushEvent({ type: "undo", t: getTimelineMs() });
        },

        onClear: () => {
            if (!isRecordingRef.current) return;
            pushEvent({ type: "clear", t: getTimelineMs() });
        },
    });

    // ----- clear/reset -----
    const clearAll = async () => {
        drawing?.clear?.();

        setRecordedEvents([]);
        setAudioUri(null);

        clipStartMsRef.current = null;
        clipEndMsRef.current = null;

        videoTimeAbsRef.current = 0;
        setVideoTimeAbsMs(0);

        setIsRecording(false);
        setIsPlayback(false);
        setIsPlaybackArmed(false);

        recWallStartRef.current = null;
        setPlaybackTimeline(0);


        isRecordingRef.current = false;

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

    // ----- recording -----
    const startRecording = async ({ startVideoMs } = {}) => {

        recWallStartRef.current = Date.now();


        const startAbs =
            typeof startVideoMs === "number" ? startVideoMs : videoTimeAbsRef.current ?? 0;

        clipStartMsRef.current = startAbs;
        clipEndMsRef.current = null;

        setRecordedEvents([]);
        setAudioUri(null);

        setIsPlayback(false);
        setIsPlaybackArmed(false);

        setIsRecording(true);
        isRecordingRef.current = true;

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


    };

    const stopRecording = async ({ endVideoMs } = {}) => {
        const startAbs = clipStartMsRef.current ?? 0;


        const dur = getRelMsRecording();
        const computedEnd = startAbs + dur;

        const endAbs =
            typeof endVideoMs === "number" ? endVideoMs : videoTimeAbsRef.current ?? 0;


        clipEndMsRef.current = Math.max(endAbs, computedEnd);


        setIsRecording(false);
        isRecordingRef.current = false;

        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });
        } catch { }

        try {
            const rec = audioRecRef.current;
            if (rec) {
                await rec.stopAndUnloadAsync();
                setAudioUri(rec.getURI() ?? null);
            }
        } catch (e) {
            console.warn("audio record stop failed", e);
        } finally {
            audioRecRef.current = null;
        }

        recWallStartRef.current = null;

    };

    // ----- playback controls -----
    const armPlayback = () => setIsPlaybackArmed(true);
    const disarmPlayback = () => setIsPlaybackArmed(false);

    const startPlayback = async () => {
        setIsPlayback(true);
        setIsPlaybackArmed(true);
        setPlaybackTimeline(0);


        if (audioUri) {
            try {
                try {
                    await audioSoundRef.current?.stopAsync?.();
                } catch { }
                try {
                    await audioSoundRef.current?.unloadAsync?.();
                } catch { }
                audioSoundRef.current = null;

                const { sound } = await Audio.Sound.createAsync(
                    { uri: audioUri },
                    { shouldPlay: true }
                );
                audioSoundRef.current = sound;
            } catch (e) {
                console.warn("audio playback failed", e);
            }
        }
    };

    const stopPlayback = async () => {
        setIsPlayback(false);
        setIsPlaybackArmed(false);
        setPlaybackTimeline(0);

        try {
            await audioSoundRef.current?.stopAsync?.();
        } catch { }
    };

    // ----- build strokes for time t (ms relative) -----
    const buildStrokesAtTime = (t) => {
        let done = [];
        const building = new Map();

        for (const evt of eventsSorted) {
            const tt = evt.t ?? 0;
            if (tt > t) break;

            if (evt.type === "clear") {
                done = [];
                building.clear();
                continue;
            }

            if (evt.type === "undo") {
                done = done.slice(0, -1);
                continue;
            }

            if (evt.type === "stroke-start") {
                if (evt.id && evt.stroke) building.set(evt.id, evt.stroke);
                continue;
            }

            if (evt.type === "stroke-point") {
                if (evt.id && evt.stroke) building.set(evt.id, evt.stroke);
                continue;
            }

            if (evt.type === "stroke-end") {
                const s = evt.id ? building.get(evt.id) : null;
                if (s) done.push(s);
                if (evt.id) building.delete(evt.id);
                continue;
            }
        }

        // visa även strokes som fortfarande byggs (så man ser “pennan”)
        for (const s of building.values()) done.push(s);

        return done;
    };

    // ----- strokesToRender (the thing UI should use) -----
    const strokesToRender = useMemo(() => {
        if (isRecording) return buildStrokesAtTime(getTimelineMs());
        if (isPlayback) return buildStrokesAtTime(playbackTimelineMs);

        // i idle-läge: visa allt (om du vill)
        return buildStrokesAtTime(Number.POSITIVE_INFINITY);
    }, [isRecording, isPlayback, playbackTimelineMs, eventsSorted]);

    return {
        drawing,

        // state
        isRecording,
        isPlayback,
        isPlaybackArmed,

        recordedEvents,
        audioUri,

        // clip + time
        getClipRange,
        setVideoTimeMs,

        // actions
        startRecording,
        stopRecording,

        armPlayback,
        disarmPlayback,
        startPlayback,
        stopPlayback,

        clearAll,
        pushMetaEvent,
        setPlaybackTimeline,
        getTimelineDuration,
        getTimelineNow,

        // render
        strokesToRender,
    };
}
