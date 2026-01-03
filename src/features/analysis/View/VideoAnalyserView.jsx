// src/features/analysis/View/VideoAnalyzerView.jsx
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const VideoAnalyzerView = ({ navigation, vm }) => {
  const {
    videoFile,
    videoMeta,
    frames,
    selectedFrames,
    transcription,
    report,
    loading,
    error,
    loadVideo,
    toggleFrameSelection,
    runTranscription,
    generateReport,
  } = vm;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Button title="Hem" onPress={() => navigation.navigate('Home')} />
        <Text style={styles.title}>Videoanalys</Text>
        {/* filler to balance layout */}
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>
          Video: {videoMeta ? videoMeta.name : 'Ingen video vald'}
        </Text>
        <Text style={styles.label}>Number of frames: {frames.length}</Text>
        <Text style={styles.label}>Selected frames: {selectedFrames.length}</Text>
        <Text style={styles.label}>
          Transcription: {transcription ? 'OK' : 'Ingen ännu'}
        </Text>
        <Text style={styles.label}>
          Report: {report ? 'Skapad' : 'Ingen rapport'}
        </Text>

        {loading && <Text style={styles.info}>Loading...</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20, backgroundColor: '#FFF' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '800' },
  content: { gap: 8 },
  label: { fontSize: 16, color: '#1A1A1A' },
  info: { marginTop: 12, color: '#6C757D' },
  error: { marginTop: 12, color: 'red' },
});

export default VideoAnalyzerView;
