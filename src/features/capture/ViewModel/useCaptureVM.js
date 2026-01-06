import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { builtInPlans, getArrowHead, getEndMs } from "../Model/CaptureService";

export default function useCaptureVM() {
    // Ritdata
    const [strokes, setStrokes] = useState([]);
    const [currentStroke, setCurrentStroke] = useState(null);

    // Inspelning
    const [isRecording, setIsRecording] = useState(false);
    const isRecordingRef = useRef(false);
    const [recordedStrokes, setRecordedStrokes] = useState([]);
    const recordStartRef = useRef(0);

    // Playback
    const [isPlaying, setIsPlaying] = useState(false);
    const [playheadMs, setPlayheadMs] = useState(0);
    const playTimerRef = useRef(null);

    const [canvasSize, setCanvasSize] = useState({ w: 1, h: 1 });

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
    const [circleRadius, setCircleRadius] = useState(14); // (du använder inte denna just nu, men behåller)

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

    const handleClear = () => {
        setStrokes([]);
        setCurrentStroke(null);
        currentStrokeRef.current = null;
        setRecordedStrokes([]);
        stopPlayback();
        setAudioUri(null);
    };

    const handleUndo = () => {
        setCurrentStroke(null);
        currentStrokeRef.current = null;

        setStrokes((prev) => prev.slice(0, -1));
        setRecordedStrokes((prev) => prev.slice(0, -1));
    };

    const startRecording = async () => {
        stopPlayback();

        setRecordingBaseStrokes(strokes);
        setRecordedStrokes([]);

        recordStartRef.current = Date.now();
        isRecordingRef.current = true;
        setIsRecording(true);

        try {
            const perm = await Audio.requestPermissionsAsync();
            if (!perm.granted) {
                console.warn("Mic permission denied");
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

    const startPlayback = async () => {
        if (recordedStrokes.length === 0) return;

        setIsPlaying(true);
        setPlayheadMs(0);

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

            const endMs = getEndMs(recordedStrokes);
            if (t >= endMs + 300) stopPlayback();
        }, 16);
    };

    // PanResponder (ritlogik)
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
                const activeRadius = circleRadiusRef.current;

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
                    if (isRecordingRef.current) setRecordedStrokes((prev) => [...prev, stroke]);

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
                    if (isRecordingRef.current) setRecordedStrokes((prev) => [...prev, stroke]);
                }

                if (stroke.type === "line") {
                    const t = isRecordingRef.current ? now - recordStartRef.current : 0;
                    const finalized = { ...stroke, t };

                    setStrokes((prev) => [...prev, finalized]);
                    if (isRecordingRef.current) setRecordedStrokes((prev) => [...prev, finalized]);
                }

                if (stroke.type === "circle") {
                    const MIN_R = 3;
                    if ((stroke.r ?? 0) >= MIN_R) {
                        setStrokes((prev) => [...prev, stroke]);
                        if (isRecordingRef.current) setRecordedStrokes((prev) => [...prev, stroke]);
                    }

                    currentStrokeRef.current = null;
                    setCurrentStroke(null);
                    return;
                }

                if (stroke.type === "arrow") {
                    const t = isRecordingRef.current ? now - recordStartRef.current : 0;
                    const finalized = { ...stroke, t };

                    setStrokes((prev) => [...prev, finalized]);
                    if (isRecordingRef.current) setRecordedStrokes((prev) => [...prev, finalized]);

                    currentStrokeRef.current = null;
                    setCurrentStroke(null);
                    return;
                }

                currentStrokeRef.current = null;
                setCurrentStroke(null);
            },
        })
    ).current;

    // Playback-lagret
    const visibleRecorded = useMemo(() => {
        if (!isPlaying) return [];

        return recordedStrokes
            .map((s) => {
                const type = s.type || "pen";

                if (type === "pen") {
                    return {
                        ...s,
                        type,
                        points: (s.points || []).filter((p) => p.t <= playheadMs),
                    };
                }

                return s.t <= playheadMs ? { ...s, type } : null;
            })
            .filter(Boolean)
            .filter((s) => (s.type === "pen" ? (s.points?.length ?? 0) >= 2 : true));
    }, [isPlaying, playheadMs, recordedStrokes]);

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
        recordedStrokes,
        startRecording,
        stopRecording,
        startPlayback,
        stopPlayback,

        // Actions
        handleUndo,
        handleClear,

        // Helpers till View
        getArrowHead,
    };
}
