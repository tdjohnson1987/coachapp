import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import Svg, { Polyline, Line, Circle, Polygon } from "react-native-svg";

function getArrowHead(x1, y1, x2, y2, w) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const ux = dx / len;
    const uy = dy / len;

    const headLen = Math.max(10, w * 4);
    const headWidth = Math.max(8, w * 3);

    const bx = x2 - ux * headLen;
    const by = y2 - uy * headLen;

    const nx = -uy;
    const ny = ux;

    const leftX = bx + nx * (headWidth / 2);
    const leftY = by + ny * (headWidth / 2);
    const rightX = bx - nx * (headWidth / 2);
    const rightY = by - ny * (headWidth / 2);

    return `${leftX},${leftY} ${x2},${y2} ${rightX},${rightY}`;
}

export default function DrawingCanvas({ strokes = [], width = 1, height = 1 }) {
    const viewBox = useMemo(() => `0 0 ${width} ${height}`, [width, height]);

    return (
        <Svg style={StyleSheet.absoluteFill} viewBox={viewBox} pointerEvents="none">
            {strokes.map((s) => {
                const type = s.type || "pen";
                const stroke = s.color || "#FFFFFF";
                const w = s.width || 4;

                if (type === "pen") {
                    const pts = (s.points || []).map((p) => `${p.x},${p.y}`).join(" ");
                    return (
                        <Polyline
                            key={s.id}
                            points={pts}
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
    );
}
