import { useEffect, useRef, useState } from "react";
import { PanResponder } from "react-native";

export default function useDrawingVM({
    enabled = true,
    initialStrokes = [],
    defaultTool = "pen",
    defaultColor = "#FFFFFF",
    defaultStrokeWidth = 4,

    onAddStroke,
    onUndo,
    onClear,

    // nya (valfria) callbacks för timed playback
    onStrokeStart,
    onStrokePoint,
    onStrokeEnd,
} = {}) {
    const [strokes, setStrokes] = useState(initialStrokes);
    const [currentStroke, setCurrentStroke] = useState(null);

    const currentStrokeRef = useRef(null);
    const activeStrokeIdRef = useRef(null);

    const [tool, setTool] = useState(defaultTool);
    const [color, setColor] = useState(defaultColor);
    const [strokeWidth, setStrokeWidth] = useState(defaultStrokeWidth);

    const toolRef = useRef(tool);
    const colorRef = useRef(color);
    const strokeWidthRef = useRef(strokeWidth);

    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);

    const clear = () => {
        setStrokes([]);
        setCurrentStroke(null);
        currentStrokeRef.current = null;
        activeStrokeIdRef.current = null;
        onClear?.();
    };

    const undo = () => {
        setCurrentStroke(null);
        currentStrokeRef.current = null;
        activeStrokeIdRef.current = null;
        setStrokes((prev) => prev.slice(0, -1));
        onUndo?.();
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => enabled,
            onMoveShouldSetPanResponder: () => enabled,

            onPanResponderGrant: (evt) => {
                if (!enabled) return;

                const { locationX, locationY } = evt.nativeEvent;
                const id = Date.now();

                const activeTool = toolRef.current;
                const activeColor = colorRef.current;
                const activeWidth = strokeWidthRef.current;

                // PLAYER (tap) - direkt färdig
                if (activeTool === "player") {
                    const stroke = {
                        id,
                        type: "player",
                        color: activeColor,
                        width: activeWidth,
                        cx: locationX,
                        cy: locationY,
                        r: Math.max(6, activeWidth * 3),
                    };

                    onStrokeStart?.({ id, stroke });
                    onStrokePoint?.({ id, stroke });
                    onStrokeEnd?.({ id });

                    setStrokes((prev) => [...prev, stroke]);
                    onAddStroke?.(stroke);

                    return;
                }

                // Skapa "pågående" stroke
                let stroke = null;

                if (activeTool === "pen") {
                    stroke = {
                        id,
                        type: "pen",
                        color: activeColor,
                        width: activeWidth,
                        points: [{ x: locationX, y: locationY }],
                    };
                } else if (activeTool === "line") {
                    stroke = {
                        id,
                        type: "line",
                        color: activeColor,
                        width: activeWidth,
                        x1: locationX,
                        y1: locationY,
                        x2: locationX,
                        y2: locationY,
                    };
                } else if (activeTool === "circle") {
                    stroke = {
                        id,
                        type: "circle",
                        color: activeColor,
                        width: activeWidth,
                        cx: locationX,
                        cy: locationY,
                        r: 0,
                    };
                } else if (activeTool === "arrow") {
                    stroke = {
                        id,
                        type: "arrow",
                        color: activeColor,
                        width: activeWidth,
                        x1: locationX,
                        y1: locationY,
                        x2: locationX,
                        y2: locationY,
                    };
                }

                if (!stroke) return;

                activeStrokeIdRef.current = id;
                currentStrokeRef.current = stroke;
                setCurrentStroke(stroke);

                onStrokeStart?.({ id, stroke });
                onStrokePoint?.({ id, stroke }); // första “frame”
            },

            onPanResponderMove: (evt) => {
                if (!enabled) return;
                const stroke = currentStrokeRef.current;
                if (!stroke) return;

                const { locationX, locationY } = evt.nativeEvent;
                const id = activeStrokeIdRef.current;

                let updated = stroke;

                if (stroke.type === "pen") {
                    updated = {
                        ...stroke,
                        points: [...stroke.points, { x: locationX, y: locationY }],
                    };
                } else if (stroke.type === "line") {
                    updated = { ...stroke, x2: locationX, y2: locationY };
                } else if (stroke.type === "circle") {
                    const dx = locationX - stroke.cx;
                    const dy = locationY - stroke.cy;
                    const r = Math.sqrt(dx * dx + dy * dy);
                    updated = { ...stroke, r };
                } else if (stroke.type === "arrow") {
                    updated = { ...stroke, x2: locationX, y2: locationY };
                }

                currentStrokeRef.current = updated;
                setCurrentStroke(updated);

                if (id) onStrokePoint?.({ id, stroke: updated });
            },

            onPanResponderRelease: () => {
                if (!enabled) return;
                const stroke = currentStrokeRef.current;
                if (!stroke) return;

                // commit stroke
                if (stroke.type === "circle") {
                    const MIN_R = 3;
                    if ((stroke.r ?? 0) >= MIN_R) {
                        setStrokes((prev) => [...prev, stroke]);
                        onAddStroke?.(stroke);
                    }
                } else {
                    setStrokes((prev) => [...prev, stroke]);
                    onAddStroke?.(stroke);
                }

                const id = activeStrokeIdRef.current;
                if (id) onStrokeEnd?.({ id });

                activeStrokeIdRef.current = null;
                currentStrokeRef.current = null;
                setCurrentStroke(null);
            },
        })
    ).current;

    const allToRender = currentStroke ? [...strokes, currentStroke] : strokes;

    return {
        strokes,
        currentStroke,
        allToRender,

        tool,
        setTool,
        color,
        setColor,
        strokeWidth,
        setStrokeWidth,

        clear,
        undo,

        panHandlers: panResponder.panHandlers,
    };
}
