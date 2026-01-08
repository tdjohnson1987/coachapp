// src/features/analysis/View/STTReportDetailView.jsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnalysisCanvas from '../../shared/AnalysisCanvas';

const STTReportDetailView = ({ navigation, route, analysisVM, captureVM }) => {
  const reportId = route?.params?.reportId;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!reportId) {
        setError('No Report ID found. Check navigation params.');
        setLoading(false);
        return;
    }

    let cancelled = false;

    const loadData = async () => {
        try {
        console.log('Fetching STT Report:', reportId);
        const data = await analysisVM.loadSTTReport(reportId);

        if (cancelled) return;

        if (data) {
            setReport(data);
            if (data.drawing && captureVM?.loadSavedReport) {
            captureVM.loadSavedReport(data.drawing);
            }
        } else {
            setError(`Report ${reportId} not found in storage.`);
        }
        } catch (err) {
        if (!cancelled) {
            console.error('STT Load Error:', err);
            setError('Failed to load report data.');
        }
        } finally {
        if (!cancelled) {
            setLoading(false);
        }
        }
    };

    loadData();

    return () => {
        cancelled = true;
        if (captureVM?.resetVM) captureVM.resetVM();
    };
    }, [reportId]);  // <-- only reportId


  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Report not found'}</Text>
        </View>
      </View>
    );
  }

  const created =
    report.createdAtIso
      ? new Date(report.createdAtIso).toLocaleDateString()
      : '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{report.title || 'Analysis'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.meta}>
          {report.profileName} • {created}
        </Text>

        {report.drawing && captureVM && (
          <View style={styles.canvasCard}>
            <Text style={styles.sectionTitle}>Visual Analysis</Text>
            <View
              style={styles.pitchWrapper}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (captureVM.setCanvasSize) {
                  captureVM.setCanvasSize({ w: width, h: height });
                }
              }}
            >
              {report.drawing.activeImageSource && (
                <Image
                  source={report.drawing.activeImageSource}
                  style={styles.bgImage}
                  resizeMode="cover"
                />
              )}

              {(captureVM?.canvasSize?.w ?? 0) > 1 && (
                <AnalysisCanvas
                  allToRender={captureVM.allToRender || []}
                  canvasSize={captureVM.canvasSize}
                  getArrowHead={captureVM.getArrowHead}
                />
              )}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transcription</Text>
          <Text style={styles.transcription}>
            {report.transcription?.fullText || 'No text available.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16 },
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
  },
  bgImage: { ...StyleSheet.absoluteFillObject },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  transcription: { fontSize: 14, lineHeight: 20, color: '#495057' },
  errorText: { color: '#FF3B30', textAlign: 'center', fontSize: 16 },
});

export default STTReportDetailView;
