import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Circle, Polygon } from "react-native-svg";

const AnalysisCanvas = ({ 
    allToRender, 
    canvasSize, 
    activeImageSource, 
    getArrowHead 
}) => {
    return (
        <View style={styles.container}>
            {/* 1. Bakgrundsbilden (Planen) */}
            {activeImageSource && (
                <Image
                    source={activeImageSource}
                    style={StyleSheet.absoluteFill}
                    resizeMode="contain"
                />
            )}

            {/* 2. SVG-lagret (Ritningarna) */}
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
                        return <Line key={s.id} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={stroke} strokeWidth={w} strokeLinecap="round" />;
                    }

                    if (type === "circle") {
                        return <Circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} stroke={stroke} strokeWidth={w} fill="transparent" />;
                    }

                    if (type === "player") {
                        return <Circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill={stroke} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />;
                    }

                    if (type === "arrow" && getArrowHead) {
                        const headPoints = getArrowHead(s.x1, s.y1, s.x2, s.y2, w);
                        return (
                            <React.Fragment key={s.id}>
                                <Line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={stroke} strokeWidth={w} strokeLinecap="round" />
                                <Polygon points={headPoints} fill={stroke} />
                            </React.Fragment>
                        );
                    }
                    return null;
                })}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0B6E3A', // Grön planfärg som backup
    },
});

export default AnalysisCanvas;