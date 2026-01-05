import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";


// OBS: Om du har react-native-svg installerat (vanligt i Expo) får du snygga linjer.
// Om den saknas: kör `npx expo install react-native-svg`
import Svg, { Polyline } from "react-native-svg";

const CaptureScreen = ({ navigation }) => {
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





    const builtInPlans = useMemo(
        () => [
            { id: "fotboll", label: "Fotboll", src: require("../../../assets/fields/fotball.jpg") },
            { id: "handboll", label: "Handboll", src: require("../../../assets/fields/handball.jpg") },
            // Lägg INTE basket förrän filen finns
            // { id: "basket", label: "Basket", src: require("../../../assets/fields/basket.jpg") },
        ],
        []
    );


    const [selectedPlanId, setSelectedPlanId] = useState("fotball");
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

                const stroke = {
                    id: now,
                    points: [{
                        x: locationX,
                        y: locationY,
                        t: isRecordingRef.current ? now - recordStartRef.current : 0, // <-- ÄNDRAD
                    }],
                };

                currentStrokeRef.current = stroke;
                setCurrentStroke(stroke);
            },

            onPanResponderMove: (evt) => {
                const stroke = currentStrokeRef.current;
                if (!stroke) return;

                const { locationX, locationY } = evt.nativeEvent;
                const now = Date.now();

                const nextPoint = {
                    x: locationX,
                    y: locationY,
                    t: isRecordingRef.current ? now - recordStartRef.current : 0, // <-- ÄNDRAD
                };

                const updated = { ...stroke, points: [...stroke.points, nextPoint] };
                currentStrokeRef.current = updated;
                setCurrentStroke(updated);
            },

            onPanResponderRelease: () => {
                const stroke = currentStrokeRef.current;
                if (!stroke) return;

                setStrokes((prev) => [...prev, stroke]);

                if (isRecordingRef.current) { // <-- ÄNDRAD
                    setRecordedStrokes((prev) => [...prev, stroke]);
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
            const last = s.points[s.points.length - 1];
            if (last?.t > max) max = last.t;
        }
        return max;
    };

    // Under playback visar vi bara punkter <= playheadMs
    const visibleRecorded = useMemo(() => {
        if (!isPlaying) return [];

        return recordedStrokes
            .map((s) => ({
                ...s,
                points: s.points.filter((p) => p.t <= playheadMs),
            }))
            .filter((s) => s.points.length >= 2);
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
                <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Capture</Text>
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
                        {allToRender.map((s) => (
                            <Polyline
                                key={s.id}
                                points={s.points.map((p) => `${p.x},${p.y}`).join(" ")}
                                fill="none"
                                stroke="white"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        ))}
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
    // (En liten hack: vi använder wrapper som 16:9 så att ytan blir stabil)
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

});

export default CaptureScreen;
