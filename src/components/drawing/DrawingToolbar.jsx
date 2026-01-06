import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function DrawingToolbar({
    tool,
    setTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    onUndo,
}) {

    if (typeof setTool !== "function") {
        return null;
    }
    return (
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
                    style={[styles.toolBtn, tool === "player" && styles.toolBtnActive]}
                    onPress={() => setTool("player")}
                >
                    <Ionicons name="ellipse" size={18} color={tool === "player" ? "#FFF" : "#1A1A1A"} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.toolBtn, tool === "arrow" && styles.toolBtnActive]}
                    onPress={() => setTool("arrow")}
                >
                    <Ionicons name="arrow-forward" size={18} color={tool === "arrow" ? "#FFF" : "#1A1A1A"} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolBtn} onPress={onUndo}>
                    <Ionicons name="arrow-undo" size={18} color="#1A1A1A" />
                </TouchableOpacity>
            </View>

            {/* Rad 2: tjocklek */}
            <View style={styles.thicknessRow}>
                <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => setStrokeWidth((v) => Math.max(2, v - 1))}
                >
                    <Text style={styles.smallBtnText}>−</Text>
                </TouchableOpacity>

                <Text style={styles.thicknessText}>{strokeWidth}px</Text>

                <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => setStrokeWidth((v) => Math.min(12, v + 1))}
                >
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
    );
}

const styles = StyleSheet.create({
    toolbar: { marginTop: 10, gap: 10 },
    toolRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },

    toolBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#E9ECEF",
        justifyContent: "center",
        alignItems: "center",
    },
    toolBtnActive: { backgroundColor: "#007AFF" },

    thicknessRow: { flexDirection: "row", alignItems: "center", gap: 10 },

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
