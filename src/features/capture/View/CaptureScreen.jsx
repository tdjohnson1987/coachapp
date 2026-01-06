import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import Svg, { Polyline, Line, Circle, Polygon } from "react-native-svg";

const CaptureScreen = ({ navigation, route }) => {
    const returnProfile = route?.params?.returnToProfile;

    const handleBack = () => {
        if (returnProfile) {
            // Gå tillbaka till profilen
            navigation.navigate("Profile", { profile: returnProfile });
        } else {
            // Om ingen profil finns (t.ex. om man gick hit direkt från Home)
            navigation.navigate("Home");
        }
    };
    // Ritdata: varje stroke = lista av punkter {x,y} och ev timestamp
    const [strokes, setStrokes] = useState([]); // [{ id, points: [{x,y,t}] }]
    const [currentStroke, setCurrentStroke] = useState(null);

    // Inspelning: spela in tidsstämplar när man ritar
    const [isRecording, setIsRecording] = useState(false);
    const isRecordingRef = useRef(false);
    const [recordedStrokes, setRecordedStrokes] = useState([]); // Ta bort??
    const recordStartRef = useRef(0);

    // Playback
    const [isPlaying, setIsPlaying] = useState(false);
    const [playheadMs, setPlayheadMs] = useState(0);
    const playTimerRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState({ w: 1, h: 1 });

    //HÄR??
    const currentStrokeRef = useRef(null);
    const [recordingBaseStrokes, setRecordingBaseStrokes] = useState([]);

    const audioRecordingRef = useRef(null);
    const audioSoundRef = useRef(null);
    const [audioUri, setAudioUri] = useState(null);

    const [tool, setTool] = useState("pen");
    const [color, setColor] = useState("#FFFFFF");
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [circleRadius, setCircleRadius] = useState(14);

    const toolRef = useRef(tool);
    const colorRef = useRef(color);
    const strokeWidthRef = useRef(strokeWidth);
    const circleRadiusRef = useRef(circleRadius);

    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);
    useEffect(() => { circleRadiusRef.current = circleRadius; }, [circleRadius]);




    const builtInPlans = useMemo(
        () => [
            { id: "tom", label: "Tom", src: require("../../../assets/fields/tom.jpg") },
            { id: "fotball", label: "Fotboll", src: require("../../../assets/fields/fotball.jpg") },
            { id: "handboll", label: "Handboll", src: require("../../../assets/fields/handball.jpg") },
            { id: "hockey", label: "Hockey", src: require("../../../assets/fields/hockey.jpg") },
            { id: "basketball", label: "Basket", src: require("../../../assets/fields/basketball.jpg") },
        ],
        []
    );


    const [selectedPlanId, setSelectedPlanId] = useState("tom");
    const [customImageUri, setCustomImageUri] = useState(null);

    const activeImageSource = customImageUri
        ? { uri: customImageUri }
        : builtInPlans.find((p) => p.id === selectedPlanId)?.src;

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

                // ======================
                // PENNA 
                // ======================
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
                                t: isRecordingRef.current
                                    ? now - recordStartRef.current
                                    : 0,
                            },
                        ],
                    };

                    currentStrokeRef.current = stroke;
                    setCurrentStroke(stroke);
                    return;
                }

                // ======================
                // LINJE 
                // ======================
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
                        t: 0, // sätts vid release
                    };

                    currentStrokeRef.current = stroke;
                    setCurrentStroke(stroke);
                    return;
                }

                // ======================
                // CIRKEL 
                // ======================
                if (activeTool === "circle") {
                    const t = isRecordingRef.current ? now - recordStartRef.current : 0;

                    const stroke = {
                        id: now,
                        type: "circle",
                        color: activeColor,
                        width: activeWidth,
                        cx: locationX,
                        cy: locationY,
                        r: 0,     // börjar på 0, byggs upp när du drar
                        t,
                    };

                    currentStrokeRef.current = stroke;
                    setCurrentStroke(stroke);
                    return;
                }

                //pil

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

                // PENNA: lägg till punkt
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

                // LINJE: uppdatera slutpunkt
                if (stroke.type === "line") {
                    const updated = { ...stroke, x2: locationX, y2: locationY };
                    currentStrokeRef.current = updated;
                    setCurrentStroke(updated);
                    return;
                }

                // CIRKEL: uppdatera radie
                if (stroke.type === "circle") {
                    const dx = locationX - stroke.cx;
                    const dy = locationY - stroke.cy;
                    const r = Math.sqrt(dx * dx + dy * dy);

                    const updated = { ...stroke, r };
                    currentStrokeRef.current = updated;
                    setCurrentStroke(updated);
                    return;
                }

                // PIL: uppdatera slutpunkt
                if (stroke.type === "arrow") {
                    const updated = { ...stroke, x2: locationX, y2: locationY };
                    currentStrokeRef.current = updated;
                    setCurrentStroke(updated);
                    return;
                }

                // (om du fortfarande har eraser-knappen just nu: ta bort den delen om du vill skippa den)
            },


            onPanResponderRelease: () => {
                const stroke = currentStrokeRef.current;
                if (!stroke) return;

                const now = Date.now();

                // PENNA: spara
                if (stroke.type === "pen") {
                    setStrokes((prev) => [...prev, stroke]);
                    if (isRecordingRef.current) setRecordedStrokes((prev) => [...prev, stroke]);
                }

                // LINJE: sätt timestamp vid release och spara
                if (stroke.type === "line") {
                    const t = isRecordingRef.current ? now - recordStartRef.current : 0;
                    const finalized = { ...stroke, t };
                    setStrokes((prev) => [...prev, finalized]);
                    if (isRecordingRef.current) setRecordedStrokes((prev) => [...prev, finalized]);
                }

                //cirkel
                if (stroke.type === "circle") {
                    const MIN_R = 3; // så att man inte råkar lägga en “prick”

                    if ((stroke.r ?? 0) >= MIN_R) {
                        setStrokes((prev) => [...prev, stroke]);
                        if (isRecordingRef.current) setRecordedStrokes((prev) => [...prev, stroke]);
                    }

                    currentStrokeRef.current = null;
                    setCurrentStroke(null);
                    return;
                }

                ///pil
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



    const handleClear = () => {
        setStrokes([]);
        setCurrentStroke(null);
        currentStrokeRef.current = null;
        setRecordedStrokes([]);
        stopPlayback();
        setAudioUri(null);
    };

    const handleUndo = () => {
        // Avbryt ev “pågående stroke”
        setCurrentStroke(null);
        currentStrokeRef.current = null;

        setStrokes((prev) => prev.slice(0, -1));

        // Om du vill att "undo" även påverkar inspelningen:
        setRecordedStrokes((prev) => prev.slice(0, -1));
    };


    const startRecording = async () => {
        stopPlayback();

        setRecordingBaseStrokes(strokes);
        setRecordedStrokes([]);

        recordStartRef.current = Date.now();
        isRecordingRef.current = true;
        setIsRecording(true);

        // --- AUDIO ---
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
            setAudioUri(null); // ny inspelning -> nollställ gammal
        } catch (e) {
            console.error("Kunde inte starta ljudinspelning:", e);
        }
    };


    const stopRecording = async () => {
        isRecordingRef.current = false;
        setIsRecording(false);

        // --- AUDIO ---
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

    const stopPlayback = async () => {
        setIsPlaying(false);
        setPlayheadMs(0);

        if (playTimerRef.current) {
            clearInterval(playTimerRef.current);
            playTimerRef.current = null;
        }

        // --- AUDIO STOP ---
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
        if (recordedStrokes.length === 0) return;
        setIsPlaying(true);
        setPlayheadMs(0);

        // --- AUDIO PLAY ---
        try {
            if (audioUri) {
                // städa ev gammalt sound
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

    const getEndMs = (strokesArr) => {
        let max = 0;
        for (const s of strokesArr) {
            const type = s.type || "pen";

            if (type === "pen") {
                const last = s.points?.[s.points.length - 1];
                if (last?.t > max) max = last.t;
            } else {
                // line/circle har t direkt
                if ((s.t ?? 0) > max) max = s.t ?? 0;
            }
        }
        return max;
    };


    const getArrowHead = (x1, y1, x2, y2, w) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;

        // unit vector
        const ux = dx / len;
        const uy = dy / len;

        // storlek på pilspets (skalar med tjocklek)
        const headLen = Math.max(10, w * 4);
        const headWidth = Math.max(8, w * 3);

        // baspunkt för pilspetsen (lite bak från spetsen)
        const bx = x2 - ux * headLen;
        const by = y2 - uy * headLen;

        // normal (90 grader)
        const nx = -uy;
        const ny = ux;

        const leftX = bx + nx * (headWidth / 2);
        const leftY = by + ny * (headWidth / 2);
        const rightX = bx - nx * (headWidth / 2);
        const rightY = by - ny * (headWidth / 2);

        // triangel: left -> tip -> right
        return `${leftX},${leftY} ${x2},${y2} ${rightX},${rightY}`;
    };




    // Under playback visar vi bara punkter <= playheadMs
    const visibleRecorded = useMemo(() => {
        if (!isPlaying) return [];

        return recordedStrokes
            .map((s) => {
                const type = s.type || "pen";

                // PENNA: filtrera punkter
                if (type === "pen") {
                    return {
                        ...s,
                        type,
                        points: (s.points || []).filter((p) => p.t <= playheadMs),
                    };
                }

                // LINJE/CIRKEL: visa när deras "t" har passerats
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


    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Capture</Text>
                    {returnProfile && (
                        <Text style={{ fontSize: 12, color: '#666', fontWeight: '600' }}>
                            Analyzing: {returnProfile.name}
                        </Text>
                    )}
                </View>
                
                <View style={{ width: 32 }} />
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Plan / stillbild</Text>

                <View style={styles.row}>
                    {builtInPlans.map((p) => {
                        const active = !customImageUri && p.id === selectedPlanId;
                        return (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.pill, active && styles.pillActive]}
                                onPress={() => chooseBuiltIn(p.id)}
                            >
                                <Text style={[styles.pillText, active && styles.pillTextActive]}>{p.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity style={styles.uploadBtn} onPress={pickCustomImage}>
                    <Ionicons name="image-outline" size={18} color="#FFF" />
                    <Text style={styles.btnText}>Ladda upp egen bild</Text>
                </TouchableOpacity>

                <Text style={styles.helper}>
                    {customImageUri
                        ? "Egen bild vald"
                        : `Vald plan: ${builtInPlans.find((p) => p.id === selectedPlanId)?.label}`}
                </Text>


                <View style={styles.toolbar}>
                    {/* Rad 1: verktyg */}
                    <View style={styles.toolRow}>
                        <TouchableOpacity
                            style={[styles.toolBtn, tool === "pen" && styles.toolBtnActive]}
                            onPress={() => setTool("pen")}
                        >
                            <Ionicons name="pencil" size={18} color={tool === "pen" ? "#FFF" : "#1A1A1A"} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toolBtn, tool === "line" && styles.toolBtnActive]}
                            onPress={() => setTool("line")}
                        >
                            <Ionicons name="remove" size={22} color={tool === "line" ? "#FFF" : "#1A1A1A"} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toolBtn, tool === "circle" && styles.toolBtnActive]}
                            onPress={() => setTool("circle")}
                        >
                            <Ionicons name="ellipse-outline" size={18} color={tool === "circle" ? "#FFF" : "#1A1A1A"} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toolBtn, tool === "arrow" && styles.toolBtnActive]}
                            onPress={() => setTool("arrow")}
                        >
                            <Ionicons name="arrow-forward" size={18} color={tool === "arrow" ? "#FFF" : "#1A1A1A"} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolBtn} onPress={handleUndo}>
                            <Ionicons name="arrow-undo" size={18} color="#1A1A1A" />
                        </TouchableOpacity>


                    </View>

                    {/* Rad 2: tjocklek */}
                    <View style={styles.thicknessRow}>
                        <TouchableOpacity style={styles.smallBtn} onPress={() => setStrokeWidth((v) => Math.max(2, v - 1))}>
                            <Text style={styles.smallBtnText}>−</Text>
                        </TouchableOpacity>

                        <Text style={styles.thicknessText}>{strokeWidth}px</Text>

                        <TouchableOpacity style={styles.smallBtn} onPress={() => setStrokeWidth((v) => Math.min(12, v + 1))}>
                            <Text style={styles.smallBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Färger */}
                    <View style={styles.colorRow}>
                        {["#FFFFFF", "#FF3B30", "#34C759", "#007AFF", "#FFCC00", "#AF52DE", "#000000"].map((c) => (
                            <TouchableOpacity
                                key={c}
                                onPress={() => setColor(c)}
                                style={[
                                    styles.colorDot,
                                    { backgroundColor: c },
                                    color === c && styles.colorDotActive,
                                    c === "#FFFFFF" && { borderWidth: 1, borderColor: "#CED4DA" },
                                ]}
                            />
                        ))}
                    </View>
                </View>


                <View
                    style={styles.pitchWrapper}
                    onLayout={(e) => {
                        const { width, height } = e.nativeEvent.layout;
                        setCanvasSize({ w: width || 1, h: height || 1 });
                    }}
                    {...panResponder.panHandlers}
                >
                    {/* Bakgrund */}
                    {activeImageSource ? (
                        <Image
                            source={activeImageSource}
                            style={styles.bgImage}
                            resizeMode="contain"
                            pointerEvents="none"
                        />
                    ) : (
                        <View style={styles.noImage} pointerEvents="none">
                            <Ionicons name="image-outline" size={40} color="#ADB5BD" />
                            <Text style={styles.noImageText}>Välj en plan eller ladda upp en bild</Text>
                        </View>
                    )}

                    {/* Rit-overlay (alltid ovanpå) */}
                    <Svg
                        style={StyleSheet.absoluteFill}
                        viewBox={`0 0 ${canvasSize.w} ${canvasSize.h}`}
                        pointerEvents="none"
                    >
                        {allToRender.map((s) => {
                            const type = s.type || "pen";
                            const stroke = s.color || "#FFFFFF";
                            const w = s.width || 4;

                            if (type === "pen") {
                                return (
                                    <Polyline
                                        key={s.id}
                                        points={(s.points || []).map((p) => `${p.x},${p.y}`).join(" ")}
                                        fill="none"
                                        stroke={stroke}
                                        strokeWidth={w}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                );
                            }

                            if (type === "line") {
                                return (
                                    <Line
                                        key={s.id}
                                        x1={s.x1}
                                        y1={s.y1}
                                        x2={s.x2}
                                        y2={s.y2}
                                        stroke={stroke}
                                        strokeWidth={w}
                                        strokeLinecap="round"
                                    />
                                );
                            }

                            if (type === "circle") {
                                return (
                                    <Circle
                                        key={s.id}
                                        cx={s.cx}
                                        cy={s.cy}
                                        r={s.r}
                                        stroke={stroke}
                                        strokeWidth={w}
                                        fill="rgba(0,0,0,0)" // transparent
                                    />
                                );
                            }

                            if (type === "arrow") {
                                const headPoints = getArrowHead(s.x1, s.y1, s.x2, s.y2, w);

                                return (
                                    <React.Fragment key={s.id}>
                                        <Line
                                            x1={s.x1}
                                            y1={s.y1}
                                            x2={s.x2}
                                            y2={s.y2}
                                            stroke={stroke}
                                            strokeWidth={w}
                                            strokeLinecap="round"
                                        />
                                        <Polygon points={headPoints} fill={stroke} />
                                    </React.Fragment>
                                );
                            }


                            return null;
                        })}

                    </Svg>

                    <View style={styles.overlayInfo} pointerEvents="none">
                        <Text style={styles.overlayText}>
                            {isRecording ? "• REC" : ""} {isPlaying ? "• PLAY" : ""}
                        </Text>
                    </View>

                </View>



                {/* Controls */}
                <View style={styles.controlsRow}>
                    {!isRecording ? (
                        <TouchableOpacity style={styles.btnBlue} onPress={startRecording}>
                            <Ionicons name="radio-button-on" size={18} color="#FFF" />
                            <Text style={styles.btnText}>Spela in</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.btnRed} onPress={stopRecording}>
                            <Ionicons name="square" size={18} color="#FFF" />
                            <Text style={styles.btnText}>Stop</Text>
                        </TouchableOpacity>
                    )}

                    {!isPlaying ? (
                        <TouchableOpacity
                            style={[styles.btnGreen, recordedStrokes.length === 0 && styles.btnDisabled]}
                            onPress={startPlayback}
                            disabled={recordedStrokes.length === 0}
                        >
                            <Ionicons name="play" size={18} color="#FFF" />
                            <Text style={styles.btnText}>Spela upp</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.btnGreen} onPress={stopPlayback}>
                            <Ionicons name="pause" size={18} color="#FFF" />
                            <Text style={styles.btnText}>Pausa</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.btnGray} onPress={handleClear}>
                        <Ionicons name="trash" size={18} color="#1A1A1A" />
                        <Text style={[styles.btnText, { color: "#1A1A1A" }]}>Rensa</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.helper}>
                    MVP: “inspelning” sparar ritningen med timestamps och kan spela upp den igen.
                </Text>
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

    card: {
        backgroundColor: "#FFF",
        borderRadius: 18,
        padding: 16,
        marginHorizontal: 20,
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

    pitchWrapper: {
        width: "100%",
        aspectRatio: 16 / 9,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "#0B6E3A",
        position: "relative",
    },

    pitch: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 3,
        borderColor: "rgba(255,255,255,0.7)",
    },
    centerLine: {
        position: "absolute",
        left: "50%",
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: "rgba(255,255,255,0.7)",
    },
    centerCircle: {
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 140,
        height: 140,
        marginLeft: -70,
        marginTop: -70,
        borderRadius: 70,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.7)",
    },

    overlayInfo: {
        position: "absolute",
        top: 8,
        left: 8,
        backgroundColor: "rgba(0,0,0,0.45)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    overlayText: { color: "#FFF", fontSize: 12, fontWeight: "600" },

    controlsRow: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },
    btnBlue: {
        backgroundColor: "#007AFF",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    btnRed: {
        backgroundColor: "#DC3545",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    btnGreen: {
        backgroundColor: "#34C759",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    btnGray: {
        backgroundColor: "#E9ECEF",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

    helper: { marginTop: 10, color: "#6C757D", fontSize: 12 },

    row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },

    pill: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: "#F1F3F5",
    },
    pillActive: { backgroundColor: "#007AFF" },
    pillText: { fontSize: 13, color: "#495057", fontWeight: "600" },
    pillTextActive: { color: "#FFF" },

    uploadBtn: {
        backgroundColor: "#007AFF",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    bgImage: {
        ...StyleSheet.absoluteFillObject,
        width: "100%",
        height: "100%",
    },

    noImage: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
        backgroundColor: "#000",
    },
    noImageText: { color: "#CED4DA", fontSize: 14, textAlign: "center", marginTop: 8 },


    //Här nytt
    toolbar: { marginTop: 10, gap: 10 },
    toolRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },

    thicknessRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },


    toolBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#E9ECEF",
        justifyContent: "center",
        alignItems: "center",
    },
    toolBtnActive: { backgroundColor: "#007AFF" },

    smallBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: "#E9ECEF",
        justifyContent: "center",
        alignItems: "center",
    },
    smallBtnText: { fontSize: 20, fontWeight: "800", color: "#1A1A1A" },
    thicknessText: { fontWeight: "700", color: "#1A1A1A" },

    colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    colorDot: { width: 26, height: 26, borderRadius: 13 },
    colorDotActive: { transform: [{ scale: 1.15 }], borderWidth: 2, borderColor: "#1A1A1A" },


});

export default CaptureScreen;
