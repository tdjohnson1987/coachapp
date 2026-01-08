import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Circle, Polygon } from 'react-native-svg';

const AnalysisCanvas = ({
  allToRender = [],
  canvasSize,
  width,
  height,
  getArrowHead,
}) => {
  const w = canvasSize?.w ?? width ?? 0;
  const h = canvasSize?.h ?? height ?? 0;

  // Nothing to draw yet
  if (!w || !h) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${w} ${h}`}
        pointerEvents="none"
      >
        {allToRender.map((s) => {
          const type = s.type || 'pen';
          const stroke = s.color || '#FFFFFF';
          const sw = s.width || 4;

          if (type === 'pen') {
            return (
              <Polyline
                key={s.id}
                points={(s.points || [])
                  .map((p) => `${p.x},${p.y}`)
                  .join(' ')}
                fill="none"
                stroke={stroke}
                strokeWidth={sw}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          }

          if (type === 'line') {
            return (
              <Line
                key={s.id}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke={stroke}
                strokeWidth={sw}
                strokeLinecap="round"
              />
            );
          }

          if (type === 'circle') {
            return (
              <Circle
                key={s.id}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                stroke={stroke}
                strokeWidth={sw}
                fill="transparent"
              />
            );
          }

          if (type === 'player') {
            return (
              <Circle
                key={s.id}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                fill={stroke}
                stroke="rgba(0,0,0,0.2)"
                strokeWidth={1}
              />
            );
          }

          if (type === 'arrow' && getArrowHead) {
            const headPoints = getArrowHead(s.x1, s.y1, s.x2, s.y2, sw);
            return (
              <React.Fragment key={s.id}>
                <Line
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke={stroke}
                  strokeWidth={sw}
                  strokeLinecap="round"
                />
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
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
});

export default AnalysisCanvas;
