import { useEffect, useRef, useState } from "react";
import { PanResponder } from "react-native";

/**
 * En liten, återanvändbar rit-VM för overlay-ritning.
 * - Ingen "recording/playback" här (det är capture-specifikt)
 * - Används både av VideoAnalyzerView och CaptureScreen om du vill.
 */
export default function useDrawingVM({
    enabled = true,
    initialStrokes = [],
    defaultTool = "pen",
    defaultColor = "#FFFFFF",
    defaultStrokeWidth = 4,

    onAddStroke,
    onUndo,
    onClear,
} = {}) {
    // Ritdata
    const [strokes, setStrokes] = useState(initialStrokes);
    const [currentStroke, setCurrentStroke] = useState(null);
    const currentStrokeRef = useRef(null);

    // Tool settings
    const [tool, setTool] = useState(defaultTool); // "pen" | "line" | "circle" | "player" | "arrow"
    const [color, setColor] = useState(defaultColor);
    const [strokeWidth, setStrokeWidth] = useState(defaultStrokeWidth);

    // Refs så PanResponder alltid har senaste värden
    const toolRef = useRef(tool);
    const colorRef = useRef(color);
    const strokeWidthRef = useRef(strokeWidth);

    useEffect(() => {
        toolRef.current = tool;
    }, [tool]);
    useEffect(() => {
        colorRef.current = color;
    }, [color]);
    useEffect(() => {
        strokeWidthRef.current = strokeWidth;
    }, [strokeWidth]);

    // Public actions
    const clear = () => {
        setStrokes([]);
        setCurrentStroke(null);
        currentStrokeRef.current = null;
        onClear?.();
    };

    const undo = () => {
        // avbryt pågående stroke
        setCurrentStroke(null);
        currentStrokeRef.current = null;
        setStrokes((prev) => prev.slice(0, -1));
        onUndo?.();
    };

    // PanResponder (ritlogik)
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => enabled,
            onMoveShouldSetPanResponder: () => enabled,

            onPanResponderGrant: (evt) => {
                if (!enabled) return;
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
                        points: [{ x: locationX, y: locationY }],
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
                    };
                    currentStrokeRef.current = stroke;
                    setCurrentStroke(stroke);
                    return;
                }

                // CIRCLE (outline, drag-size)
                if (activeTool === "circle") {
                    const stroke = {
                        id: now,
                        type: "circle",
                        color: activeColor,
                        width: activeWidth,
                        cx: locationX,
                        cy: locationY,
                        r: 0,
                    };
                    currentStrokeRef.current = stroke;
                    setCurrentStroke(stroke);
                    return;
                }

                // PLAYER (filled dot, tap)
                if (activeTool === "player") {
                    const stroke = {
                        id: now,
                        type: "player",
                        color: activeColor,
                        width: activeWidth,
                        cx: locationX,
                        cy: locationY,
                        r: Math.max(6, activeWidth * 3),
                    };
                    setStrokes((prev) => [...prev, stroke]);
                    onAddStroke?.(stroke); // <-- VIKTIGT för recording i video-läget
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
                    };
                    currentStrokeRef.current = stroke;
                    setCurrentStroke(stroke);
                    return;
                }
            },

            onPanResponderMove: (evt) => {
                if (!enabled) return;
                const stroke = currentStrokeRef.current;
                if (!stroke) return;

                const { locationX, locationY } = evt.nativeEvent;

                if (stroke.type === "pen") {
                    const updated = {
                        ...stroke,
                        points: [...stroke.points, { x: locationX, y: locationY }],
                    };
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
                if (!enabled) return;
                const stroke = currentStrokeRef.current;
                if (!stroke) return;

                // Spara strokes som byggs av drag
                if (stroke.type === "pen") {
                    setStrokes((prev) => [...prev, stroke]);
                    onAddStroke?.(stroke);
                }

                if (stroke.type === "line") {
                    setStrokes((prev) => [...prev, stroke]);
                    onAddStroke?.(stroke);
                }

                if (stroke.type === "circle") {
                    const MIN_R = 3;
                    if ((stroke.r ?? 0) >= MIN_R) {
                        setStrokes((prev) => [...prev, stroke]);
                        onAddStroke?.(stroke); // <-- här inne
                    }
                }


                if (stroke.type === "arrow") {
                    setStrokes((prev) => [...prev, stroke]);
                    onAddStroke?.(stroke);
                }

                currentStrokeRef.current = null;
                setCurrentStroke(null);
            },
        })
    ).current;

    // Exponera render-lista
    const allToRender = currentStroke ? [...strokes, currentStroke] : strokes;

    return {
        // data
        strokes,
        currentStroke,
        allToRender,

        // tools
        tool,
        setTool,
        color,
        setColor,
        strokeWidth,
        setStrokeWidth,

        // actions
        clear,
        undo,

        // handlers
        panHandlers: panResponder.panHandlers,
    };
}
