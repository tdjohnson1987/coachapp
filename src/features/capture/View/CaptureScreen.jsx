import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Polyline, Line, Circle, Polygon } from "react-native-svg";

import useCaptureVM from "../ViewModel/useCaptureVM";

const CaptureScreen = ({ navigation, route }) => {
    const vm = useCaptureVM();

    const returnProfile = route?.params?.returnToProfile;

    const handleBack = () => {
        if (returnProfile) {
            navigation.navigate("Profile", { profile: returnProfile });
        } else {
            navigation.navigate("Home");
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>

                <View style={{ alignItems: "center" }}>
                    <Text style={styles.headerTitle}>Capture</Text>
                    {returnProfile && (
                        <Text style={{ fontSize: 12, color: "#666", fontWeight: "600" }}>
                            Analyzing: {returnProfile.name}
                        </Text>
                    )}
                </View>

                <View style={{ width: 32 }} />
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Plan / stillbild</Text>

                <View style={styles.row}>
                    {vm.builtInPlans.map((p) => {
                        const active = !vm.customImageUri && p.id === vm.selectedPlanId;
                        return (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.pill, active && styles.pillActive]}
                                onPress={() => vm.chooseBuiltIn(p.id)}
                            >
                                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                                    {p.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity style={styles.uploadBtn} onPress={vm.pickCustomImage}>
                    <Ionicons name="image-outline" size={18} color="#FFF" />
                    <Text style={styles.btnText}>Ladda upp egen bild</Text>
                </TouchableOpacity>

                <Text style={styles.helper}>
                    {vm.customImageUri ? "Egen bild vald" : `Vald plan: ${vm.selectedPlanLabel}`}
                </Text>

                <View style={styles.toolbar}>
                    {/* Rad 1: verktyg */}
                    <View style={styles.toolRow}>
                        <TouchableOpacity
                            style={[styles.toolBtn, vm.tool === "pen" && styles.toolBtnActive]}
                            onPress={() => vm.setTool("pen")}
                        >
                            <Ionicons name="pencil" size={18} color={vm.tool === "pen" ? "#FFF" : "#1A1A1A"} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toolBtn, vm.tool === "line" && styles.toolBtnActive]}
                            onPress={() => vm.setTool("line")}
                        >
                            <Ionicons name="remove" size={22} color={vm.tool === "line" ? "#FFF" : "#1A1A1A"} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toolBtn, vm.tool === "circle" && styles.toolBtnActive]}
                            onPress={() => vm.setTool("circle")}
                        >
                            <Ionicons name="ellipse-outline" size={18} color={vm.tool === "circle" ? "#FFF" : "#1A1A1A"} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toolBtn, vm.tool === "player" && styles.toolBtnActive]}
                            onPress={() => vm.setTool("player")}
                        >
                            <Ionicons name="ellipse" size={18} color={vm.tool === "player" ? "#FFF" : "#1A1A1A"} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toolBtn, vm.tool === "arrow" && styles.toolBtnActive]}
                            onPress={() => vm.setTool("arrow")}
                        >
                            <Ionicons name="arrow-forward" size={18} color={vm.tool === "arrow" ? "#FFF" : "#1A1A1A"} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolBtn} onPress={vm.handleUndo}>
                            <Ionicons name="arrow-undo" size={18} color="#1A1A1A" />
                        </TouchableOpacity>
                    </View>

                    {/* Rad 2: tjocklek */}
                    <View style={styles.thicknessRow}>
                        <TouchableOpacity
                            style={styles.smallBtn}
                            onPress={() => vm.setStrokeWidth((v) => Math.max(2, v - 1))}
                        >
                            <Text style={styles.smallBtnText}>−</Text>
                        </TouchableOpacity>

                        <Text style={styles.thicknessText}>{vm.strokeWidth}px</Text>

                        <TouchableOpacity
                            style={styles.smallBtn}
                            onPress={() => vm.setStrokeWidth((v) => Math.min(12, v + 1))}
                        >
                            <Text style={styles.smallBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Färger */}
                    <View style={styles.colorRow}>
                        {["#FFFFFF", "#FF3B30", "#34C759", "#007AFF", "#FFCC00", "#AF52DE", "#000000"].map((c) => (
                            <TouchableOpacity
                                key={c}
                                onPress={() => vm.setColor(c)}
                                style={[
                                    styles.colorDot,
                                    { backgroundColor: c },
                                    vm.color === c && styles.colorDotActive,
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
                        vm.setCanvasSize({ w: width || 1, h: height || 1 });
                    }}
                    {...vm.panHandlers}
                >
                    {/* Bakgrund */}
                    {vm.activeImageSource ? (
                        <Image
                            source={vm.activeImageSource}
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

                    {/* Rit-overlay */}
                    <Svg
                        style={StyleSheet.absoluteFill}
                        viewBox={`0 0 ${vm.canvasSize.w} ${vm.canvasSize.h}`}
                        pointerEvents="none"
                    >
                        {vm.allToRender.map((s) => {
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
                                        fill="rgba(0,0,0,0)"
                                    />
                                );
                            }

                            if (type === "player") {
                                return (
                                    <Circle
                                        key={s.id}
                                        cx={s.cx}
                                        cy={s.cy}
                                        r={s.r}
                                        fill={stroke}
                                        stroke="rgba(0,0,0,0.2)"
                                        strokeWidth={Math.max(1, w / 2)}
                                    />
                                );
                            }

                            if (type === "arrow") {
                                const headPoints = vm.getArrowHead(s.x1, s.y1, s.x2, s.y2, w);
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
                            {vm.isRecording ? "• REC" : ""} {vm.isPlaying ? "• PLAY" : ""}
                        </Text>
                    </View>
                </View>

                {/* Controls */}
                <View style={styles.controlsRow}>
                    {!vm.isRecording ? (
                        <TouchableOpacity style={styles.btnBlue} onPress={vm.startRecording}>
                            <Ionicons name="radio-button-on" size={18} color="#FFF" />
                            <Text style={styles.btnText}>Spela in</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.btnRed} onPress={vm.stopRecording}>
                            <Ionicons name="square" size={18} color="#FFF" />
                            <Text style={styles.btnText}>Stop</Text>
                        </TouchableOpacity>
                    )}

                    {!vm.isPlaying ? (
                        <TouchableOpacity
                            style={[styles.btnGreen, vm.recordedStrokes.length === 0 && styles.btnDisabled]}
                            onPress={vm.startPlayback}
                            disabled={vm.recordedStrokes.length === 0}
                        >
                            <Ionicons name="play" size={18} color="#FFF" />
                            <Text style={styles.btnText}>Spela upp</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.btnGreen} onPress={vm.stopPlayback}>
                            <Ionicons name="pause" size={18} color="#FFF" />
                            <Text style={styles.btnText}>Pausa</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.btnGray} onPress={vm.handleClear}>
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
