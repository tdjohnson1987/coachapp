// src/features/analysis/View/VideoAnalyzerView.jsx
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  PanResponder,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

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
  } = vm;

  const videoRef = useRef(null);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [strokes, setStrokes] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);


  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!videoFile,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const stroke = {
          id: Date.now(),
          points: [{ x: locationX, y: locationY }],
        };
        setCurrentStroke(stroke);
      },
      onPanResponderMove: (evt) => {
        if (!currentStroke) return;
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke((prev) => ({
          ...prev,
          points: [...prev.points, { x: locationX, y: locationY }],
        }));
      },
      onPanResponderRelease: () => {
        if (!currentStroke) return;
        setStrokes((prev) => [...prev, currentStroke]);
        setCurrentStroke(null);
      },
    })
  ).current;

  const handlePickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];

    // Stoppa tidigare video och rensa ritning när ny video väljs
    try {
      await videoRef.current?.stopAsync?.();
    } catch (e) {
      // ignoreras om ingen video körs
    }
    setStrokes([]);
    setCurrentStroke(null);

    await loadVideo({
      uri: file.uri,
      name: file.name,
      size: file.size,
      type: file.mimeType || 'video/mp4',
    });
  };

  const handleClearDrawing = () => {
    setStrokes([]);
    setCurrentStroke(null);
  };

  const renderFrameItem = ({ item }) => {
    const isSelected = selectedFrames.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.tag, isSelected && styles.tagActive]}
        onPress={() => toggleFrameSelection(item.id)}
      >
        <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
          t={item.time}s
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={styles.iconButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Videoanalys</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('ReportGenerator')}
          style={styles.saveBtn}
        >
          <Ionicons name="document-text-outline" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Video card */}
        <View style={styles.card}>
          <Text style={styles.label}>Videokälla</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handlePickVideo}>
            <Text style={styles.primaryButtonText}>
              {videoMeta ? 'Byt video' : 'Välj video'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            {videoMeta ? videoMeta.name : 'Ingen video vald ännu'}
          </Text>

          <View style={styles.videoWrapper}>
            {videoFile ? (
              <>
                {Platform.OS === 'web' ? (
                  <View style={{ flex: 1 }}>
                    {!isPlaying ? (
                      <>
                        <video
                          src={videoFile.uri}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          preload="metadata"
                        />
                        <TouchableOpacity
                          style={styles.playOverlay}
                          onPress={() => setIsPlaying(true)}
                        >
                          <Ionicons name="play-circle" size={72} color="#FFFFFF" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <video
                        src={videoFile.uri}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        controls
                        autoPlay
                      />
                    )}
                  </View>
                ) : (
                  <>
                    <Video
                      ref={videoRef}
                      source={{ uri: videoFile.uri }}
                      style={styles.video}
                      resizeMode="contain"
                      useNativeControls={isPlaying}
                      shouldPlay={isPlaying}
                    />
                    {!isPlaying && (
                      <TouchableOpacity
                        style={styles.playOverlay}
                        onPress={() => setIsPlaying(true)}
                      >
                        <Ionicons name="play-circle" size={72} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <View style={styles.drawingOverlay} {...panResponder.panHandlers}>
                  <Text style={styles.overlayInfo}>Linjer: {strokes.length}</Text>
                </View>
              </>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="videocam-outline" size={40} color="#ADB5BD" />
                <Text style={styles.placeholderText}>
                  Välj en video för att börja analysera
                </Text>
              </View>
            )}
          </View>




          <View style={styles.inlineRow}>
            <Text style={styles.metaText}>
              {videoMeta ? `${Math.round(videoMeta.size / 1024 / 1024)} MB` : ''}
            </Text>
            <TouchableOpacity onPress={handleClearDrawing} disabled={!videoFile}>
              <Text style={[styles.clearText, !videoFile && styles.clearTextDisabled]}>
                Rensa ritning
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Key frames + status */}
        <View style={styles.card}>
          <Text style={styles.label}>Nyckelframes</Text>
          {frames.length === 0 ? (
            <Text style={styles.helperText}>
              Inga frames ännu (kommer från analys‑steget).
            </Text>
          ) : (
            <FlatList
              horizontal
              data={frames}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderFrameItem}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4 }}
            />
          )}

          <View style={styles.divider} />

          <Text style={styles.label}>Status</Text>
          <Text style={styles.statusText}>
            Transkription: {transcription ? 'Klar' : 'Ej påbörjad'}
          </Text>
          <Text style={styles.statusText}>
            Rapport: {report ? 'Skapad' : 'Ej skapad'}
          </Text>
          {loading && <Text style={styles.statusText}>Bearbetar...</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  iconButton: { padding: 5 },
  saveBtn: {
    backgroundColor: '#34C759',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },

  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C757D',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  helperText: { fontSize: 13, color: '#6C757D', marginBottom: 8 },

  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: { width: '100%', height: '100%' },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  placeholderText: { color: '#CED4DA', fontSize: 14, textAlign: 'center', marginTop: 8 },

  drawingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 6,
  },
  overlayInfo: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    color: '#FFF',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  inlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  metaText: { fontSize: 12, color: '#868E96' },
  clearText: { fontSize: 13, color: '#DC3545', fontWeight: '600' },
  clearTextDisabled: { color: '#CED4DA' },

  tag: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#F1F3F5',
    marginRight: 8,
  },
  tagActive: { backgroundColor: '#007AFF' },
  tagText: { fontSize: 12, color: '#495057', fontWeight: '600' },
  tagTextActive: { color: '#FFF' },

  divider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 10,
  },
  statusText: { fontSize: 14, color: '#343A40', marginTop: 2 },

  errorText: { fontSize: 14, color: '#DC3545', marginTop: 4 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

});

export default VideoAnalyzerView;
