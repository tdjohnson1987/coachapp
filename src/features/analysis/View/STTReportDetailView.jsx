// src/features/analysis/View/STTReportDetailView.jsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAnalysisVM } from '../ViewModel/useAnalysisVM';
import useCaptureVM from '../../capture/ViewModel/useCaptureVM';
import AnalysisCanvas from '../../shared/AnalysisCanvas';

const STTReportDetailView = ({ navigation, route }) => {
  const { reportId } = route.params;
  const analysisVM = useAnalysisVM();
  const captureVM = useCaptureVM();

  const [report, setReport] = useState(null);

  useEffect(() => {
    const load = async () => {
      const r = await analysisVM.loadSTTReport(reportId);
      setReport(r);
      if (r?.drawing) {
        captureVM.loadSavedReport(r.drawing);
      }
    };
    load();
    return () => captureVM.resetVM();
  }, [reportId]);

  if (!report) {
    return (
      <View style={styles.container}>
        <Text style={{ padding: 20 }}>Loading...</Text>
      </View>
    );
  }

  const created = report.createdAtIso
    ? new Date(report.createdAtIso).toLocaleString()
    : '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{report.title || 'Analysis'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.meta}>
          {report.profileName} • {created}
        </Text>


        {/* Transcription */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transcription</Text>
          <Text style={styles.transcription}>
            {report.transcription.fullText}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFF',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 13, color: '#6C757D', marginBottom: 12 },
  canvasCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  pitchWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0B6E3A',
    position: 'relative',
  },
  bgImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  transcription: { fontSize: 14, lineHeight: 20, color: '#495057' },
});

export default STTReportDetailView;



        {/* Optional canvas playback */}
        // {captureVM.canvasSize.w > 0 && (
        //   <View style={styles.canvasCard}>
        //     <View
        //       style={styles.pitchWrapper}
        //       onLayout={(e) => {
        //         const { width, height } = e.nativeEvent.layout;
        //         captureVM.setCanvasSize({ w: width, h: height });
        //       }}
        //     >
        //       {report.drawing?.activeImageSource && (
        //         <Image
        //           source={report.drawing.activeImageSource}
        //           style={styles.bgImage}
        //           resizeMode="cover"
        //         />
        //       )}

        //       {captureVM.canvasSize.w > 1 && (
        //         <AnalysisCanvas
        //           width={captureVM.canvasSize.w}
        //           height={captureVM.canvasSize.h}
        //           layers={captureVM.allToRender}
        //         />
        //       )}
        //     </View>
        //   </View>
        // )}