import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { builtInPlans, getArrowHead } from "../Model/CaptureService";
import { AnalysisService } from "../../shared/AnalysisService"

export default function useCaptureVM() {
    // Ritdata
    const [strokes, setStrokes] = useState([]);
    const [currentStroke, setCurrentStroke] = useState(null);

    // Inspelning (events)
    const [isRecording, setIsRecording] = useState(false);
    const isRecordingRef = useRef(false);
    const recordStartRef = useRef(0);
    const [recordedEvents, setRecordedEvents] = useState([]); // {type:"add"|"undo"|"clear", t, stroke?}

    // Playback
    const [isPlaying, setIsPlaying] = useState(false);
    const [playheadMs, setPlayheadMs] = useState(0);
    const playTimerRef = useRef(null);

    const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

    const currentStrokeRef = useRef(null);
    const [recordingBaseStrokes, setRecordingBaseStrokes] = useState([]);

    // Audio
    const audioRecordingRef = useRef(null);
    const audioSoundRef = useRef(null);
    const [audioUri, setAudioUri] = useState(null);

    // Tool settings
    const [tool, setTool] = useState("pen");
    const [color, setColor] = useState("#FFFFFF");
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [circleRadius, setCircleRadius] = useState(14);

    // Refs så PanResponder alltid har senaste värden
    const toolRef = useRef(tool);
    const colorRef = useRef(color);
    const strokeWidthRef = useRef(strokeWidth);
    const circleRadiusRef = useRef(circleRadius);

    useEffect(() => {
        toolRef.current = tool;
    }, [tool]);
    useEffect(() => {
        colorRef.current = color;
    }, [color]);
    useEffect(() => {
        strokeWidthRef.current = strokeWidth;
    }, [strokeWidth]);
    useEffect(() => {
        circleRadiusRef.current = circleRadius;
    }, [circleRadius]);

    // Plan / bild
    const [selectedPlanId, setSelectedPlanId] = useState("tom");
    const [customImageUri, setCustomImageUri] = useState(null);

    const activeImageSource = customImageUri
        ? { uri: customImageUri }
        : builtInPlans.find((p) => p.id === selectedPlanId)?.src;

    const selectedPlanLabel =
        builtInPlans.find((p) => p.id === selectedPlanId)?.label ?? "";

    const pickCustomImage = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ["image/*"],
            copyToCacheDirectory: true,
        });
        if (result.canceled) return;
        setCustomImageUri(result.assets[0].uri);
    };

    const chooseBuiltIn = (id) => {
        setSelectedPlanId(id);
        setCustomImageUri(null);
    };

    // ========= Helpers =========

    const buildStrokesAtTime = (base, events, tMs) => {
        let out = [...base];

        for (const e of events) {
            if (e.t > tMs) break;

            if (e.type === "add") out.push(e.stroke);
            if (e.type === "undo") out.pop();
            if (e.type === "clear") out = [];
        }
        return out;
    };

    // ========= Playback =========

    const stopPlayback = async () => {
        setIsPlaying(false);
        setPlayheadMs(0);

        if (playTimerRef.current) {
            clearInterval(playTimerRef.current);
            playTimerRef.current = null;
        }

        try {
            if (audioSoundRef.current) {
                await audioSoundRef.current.stopAsync();
                await audioSoundRef.current.unloadAsync();
                audioSoundRef.current = null;
            }
        } catch (e) {
            console.error("Kunde inte stoppa ljud:", e);
        }
    };

    const startPlayback = async () => {
        if (recordedEvents.length === 0) return;

        setIsPlaying(true);
        setPlayheadMs(0);

        // --- AUDIO PLAY ---
        try {
            if (audioUri) {
                if (audioSoundRef.current) {
                    await audioSoundRef.current.unloadAsync();
                    audioSoundRef.current = null;
                }

                const { sound } = await Audio.Sound.createAsync(
                    { uri: audioUri },
                    { shouldPlay: true }
                );
                audioSoundRef.current = sound;
            }
        } catch (e) {
            console.error("Kunde inte spela upp ljud:", e);
        }

        const start = Date.now();
        playTimerRef.current = setInterval(() => {
            const t = Date.now() - start;
            setPlayheadMs(t);

            const endMs = recordedEvents.length
                ? recordedEvents[recordedEvents.length - 1].t
                : 0;

            if (t >= endMs + 300) stopPlayback();
        }, 16);
    };

    // ========= Actions =========

    const handleClear = () => {
        setStrokes([]);
        setCurrentStroke(null);
        currentStrokeRef.current = null;

        stopPlayback();
        setAudioUri(null);

        if (isRecordingRef.current) {
            const t = Date.now() - recordStartRef.current;
            setRecordedEvents((prev) => [...prev, { type: "clear", t }]);
        }
    };

    const handleUndo = () => {
        setCurrentStroke(null);
        currentStrokeRef.current = null;

        setStrokes((prev) => prev.slice(0, -1));

        if (isRecordingRef.current) {
            const t = Date.now() - recordStartRef.current;
            setRecordedEvents((prev) => [...prev, { type: "undo", t }]);
        }
    };

    const startRecording = async () => {
        stopPlayback();

        setRecordingBaseStrokes(strokes);
        setRecordedEvents([]);

        recordStartRef.current = Date.now();
        isRecordingRef.current = true;
        setIsRecording(true);

        // --- AUDIO REC ---
        try {
            const perm = await Audio.requestPermissionsAsync();
            if (!perm.granted) {
                console.warn("Mic permission denied");
                // återställ REC om du vill
                isRecordingRef.current = false;
                setIsRecording(false);
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const rec = new Audio.Recording();
            await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            await rec.startAsync();

            audioRecordingRef.current = rec;
            setAudioUri(null);
        } catch (e) {
            console.error("Kunde inte starta ljudinspelning:", e);
            isRecordingRef.current = false;
            setIsRecording(false);
        }
    };

    const stopRecording = async () => {
        isRecordingRef.current = false;
        setIsRecording(false);

        try {
            const rec = audioRecordingRef.current;
            if (!rec) return;

            await rec.stopAndUnloadAsync();
            const uri = rec.getURI();

            audioRecordingRef.current = null;
            setAudioUri(uri);
        } catch (e) {
            console.error("Kunde inte stoppa ljudinspelning:", e);
        }
    };

    // ========= PanResponder =========

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                const now = Date.now();

                const activeTool = toolRef.current;
                const activeColor = colorRef.current;
                const activeWidth = strokeWidthRef.current;

                // PEN
                if (activeTool === "pen") {
                    const stroke = {
                        id: now,
                        type: "pen",
                        color: activeColor,
                        width: activeWidth,
                        points: [
                            {
                                x: locationX,
                                y: locationY,
                                t: isRecordingRef.current ? now - recordStartRef.current : 0,
                            },
                        ],
                    };

                    currentStrokeRef.current = stroke;
                    setCurrentStroke(stroke);
                    return;
                }

                // LINE
                if (activeTool === "line") {
                    const stroke = {
                        id: now,
                        type: "line",
                        color: activeColor,
                        width: activeWidth,
                        x1: locationX,
                        y1: locationY,
                        x2: locationX,
                        y2: locationY,
                        t: 0,
                    };

                    currentStrokeRef.current = stroke;
                    setCurrentStroke(stroke);
                    return;
                }

                // CIRCLE (outline, drag-size)
                if (activeTool === "circle") {
                    const t = isRecordingRef.current ? now - recordStartRef.current : 0;

                    const stroke = {
                        id: now,
                        type: "circle",
                        color: activeColor,
                        width: activeWidth,
                        cx: locationX,
                        cy: locationY,
                        r: 0,
                        t,
                    };

                    currentStrokeRef.current = stroke;
                    setCurrentStroke(stroke);
                    return;
                }

                // PLAYER (filled dot, tap)
                if (activeTool === "player") {
                    const t = isRecordingRef.current ? now - recordStartRef.current : 0;

                    const stroke = {
                        id: now,
                        type: "player",
                        color: activeColor,
                        width: activeWidth,
                        cx: locationX,
                        cy: locationY,
                        r: Math.max(6, activeWidth * 3),
                        t,
                    };

                    setStrokes((prev) => [...prev, stroke]);

                    if (isRecordingRef.current) {
                        setRecordedEvents((prev) => [...prev, { type: "add", t, stroke }]);
                    }

                    currentStrokeRef.current = null;
                    setCurrentStroke(null);
                    return;
                }

                // ARROW
                if (activeTool === "arrow") {
                    const stroke = {
                        id: now,
                        type: "arrow",
                        color: activeColor,
                        width: activeWidth,
                        x1: locationX,
                        y1: locationY,
                        x2: locationX,
                        y2: locationY,
                        t: 0,
                    };

                    currentStrokeRef.current = stroke;
                    setCurrentStroke(stroke);
                    return;
                }
            },

            onPanResponderMove: (evt) => {
                const stroke = currentStrokeRef.current;
                if (!stroke) return;

                const { locationX, locationY } = evt.nativeEvent;
                const now = Date.now();

                if (stroke.type === "pen") {
                    const nextPoint = {
                        x: locationX,
                        y: locationY,
                        t: isRecordingRef.current ? now - recordStartRef.current : 0,
                    };
                    const updated = { ...stroke, points: [...stroke.points, nextPoint] };
                    currentStrokeRef.current = updated;
                    setCurrentStroke(updated);
                    return;
                }

                if (stroke.type === "line") {
                    const updated = { ...stroke, x2: locationX, y2: locationY };
                    currentStrokeRef.current = updated;
                    setCurrentStroke(updated);
                    return;
                }

                if (stroke.type === "circle") {
                    const dx = locationX - stroke.cx;
                    const dy = locationY - stroke.cy;
                    const r = Math.sqrt(dx * dx + dy * dy);

                    const updated = { ...stroke, r };
                    currentStrokeRef.current = updated;
                    setCurrentStroke(updated);
                    return;
                }

                if (stroke.type === "arrow") {
                    const updated = { ...stroke, x2: locationX, y2: locationY };
                    currentStrokeRef.current = updated;
                    setCurrentStroke(updated);
                    return;
                }
            },

            onPanResponderRelease: () => {
                const stroke = currentStrokeRef.current;
                if (!stroke) return;

                const now = Date.now();

                if (stroke.type === "pen") {
                    setStrokes((prev) => [...prev, stroke]);
                    if (isRecordingRef.current) {
                        const t = now - recordStartRef.current;
                        setRecordedEvents((prev) => [...prev, { type: "add", t, stroke }]);
                    }
                }

                if (stroke.type === "line") {
                    const t = isRecordingRef.current ? now - recordStartRef.current : 0;
                    const finalized = { ...stroke, t };

                    setStrokes((prev) => [...prev, finalized]);

                    if (isRecordingRef.current) {
                        setRecordedEvents((prev) => [
                            ...prev,
                            { type: "add", t: finalized.t, stroke: finalized },
                        ]);
                    }
                }

                if (stroke.type === "circle") {
                    const MIN_R = 3;
                    if ((stroke.r ?? 0) >= MIN_R) {
                        setStrokes((prev) => [...prev, stroke]);

                        if (isRecordingRef.current) {
                            const t = now - recordStartRef.current;
                            setRecordedEvents((prev) => [...prev, { type: "add", t, stroke }]);
                        }
                    }

                    currentStrokeRef.current = null;
                    setCurrentStroke(null);
                    return;
                }

                if (stroke.type === "arrow") {
                    const t = isRecordingRef.current ? now - recordStartRef.current : 0;
                    const finalized = { ...stroke, t };

                    setStrokes((prev) => [...prev, finalized]);

                    if (isRecordingRef.current) {
                        setRecordedEvents((prev) => [
                            ...prev,
                            { type: "add", t: finalized.t, stroke: finalized },
                        ]);
                    }

                    currentStrokeRef.current = null;
                    setCurrentStroke(null);
                    return;
                }

                currentStrokeRef.current = null;
                setCurrentStroke(null);
            },
        })
    ).current;
    
    //========== Saving - lager =========
    const saveAnalysis = (profileId, onSaveCallback) => {
        const analysisSnapshot = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            // Här bakar vi ihop ALLT
            composition: {
                background: customImageUri || selectedPlanId,
                initialStrokes: recordingBaseStrokes,
                events: recordedEvents,
                canvasRatio: canvasSize.w / canvasSize.h // Spara proportionerna!
            },
            audioUri: audioUri,
        };

        onSaveCallback(profileId, analysisSnapshot);
        return true;
    };
    
    const loadSavedReport = (report) => {
        AnalysisService.loadAnalysis(report, {
            setAudio: setAudioUri,
            setDrawingData: (data) => {
                setRecordedEvents(data);
                
                // Hämta basritningarna från rapporten, annars tom array
                const base = report.baseStrokes || [];
                setRecordingBaseStrokes(base);
                
                // Skapa förhandsvisningen genom att kombinera basen med alla händelser
                const finalStrokes = buildStrokesAtTime(base, data, 9999999); 
                setStrokes(finalStrokes);
            },
            setBackground: (bg) => {
                if (typeof bg === 'string' && (bg.includes('/') || bg.includes('file:'))) {
                    // Det är en egen bild (URI)
                    setCustomImageUri(bg);
                    setSelectedPlanId(null);;
                } else {
                    setSelectedPlanId(bg);
                    setCustomImageUri(null);
                }
            }
        });
    };

    // ========= Playback-lagret =========

    const visibleRecorded = useMemo(() => {
        if (!isPlaying) return [];

        // strokes som "finns" vid tiden playheadMs, enligt events
        const stack = buildStrokesAtTime([], recordedEvents, playheadMs);

        return stack
            .map((s) => {
                const type = s.type || "pen";

                if (type === "pen") {
                    return {
                        ...s,
                        type,
                        points: (s.points || []).filter((p) => p.t <= playheadMs),
                    };
                }

                return { ...s, type };
            })
            .filter((s) => (s.type === "pen" ? (s.points?.length ?? 0) >= 2 : true));
    }, [isPlaying, playheadMs, recordedEvents]);

    const baseToRender = isPlaying ? recordingBaseStrokes : strokes;

    const allToRender = useMemo(() => {
        const layers = isPlaying ? [...baseToRender, ...visibleRecorded] : baseToRender;
        return currentStroke ? [...layers, currentStroke] : layers;
    }, [isPlaying, baseToRender, visibleRecorded, currentStroke]);

    // Städa timer/audio vid unmount
    useEffect(() => {
        return () => {
            try {
                if (playTimerRef.current) clearInterval(playTimerRef.current);
            } catch { }
        };
    }, []);

    return {
        // Plan/bild
        builtInPlans,
        selectedPlanId,
        selectedPlanLabel,
        customImageUri,
        activeImageSource,
        pickCustomImage,
        chooseBuiltIn,

        // Verktyg
        tool,
        setTool,
        color,
        setColor,
        strokeWidth,
        setStrokeWidth,

        // Canvas
        canvasSize,
        setCanvasSize,
        panHandlers: panResponder.panHandlers,

        // Renderdata
        allToRender,

        // Inspelning/playback
        isRecording,
        isPlaying,
        recordedEvents,
        startRecording,
        stopRecording,
        startPlayback,
        stopPlayback,

        // Saving
        saveAnalysis,
        audioUri,
        loadSavedReport,

        // Actions
        handleUndo,
        handleClear,

        // Helpers till View
        getArrowHead,
    };
}
