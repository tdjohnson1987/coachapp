import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useCaptureVM from "../../capture/ViewModel/useCaptureVM";
import AnalysisCanvas from "../../shared/AnalysisCanvas";

const ReportDetailView = ({ route, navigation }) => {
  const { playbackReport } = route.params;
  const vm = useCaptureVM();

  // Ladda in inspelningen direkt när vi öppnar skärmen
  useEffect(() => {
    if (playbackReport) {
      vm.loadSavedReport(playbackReport);
    }
    
    // Rensa när vi lämnar vyn
    return () => vm.resetVM();
  }, [playbackReport]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysuppspelning</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.dateText}>
          {playbackReport.date} • {playbackReport.time}
        </Text>
        
        {/* Video-ytan (Pitch Wrapper) */}
        <View 
          style={styles.pitchWrapperDetail}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            vm.setCanvasSize({ w: width, h: height });
          }}
        >
          {/* 1. Basbakgrund (Grön färg som i Capture) */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0B6E3A' }]} />

          {/* 2. Bakgrundsbilden - Fixad för att hindra zoom i hörnet */}
          {playbackReport.activeImageSource && (
            <Image 
              key={`bg-${playbackReport.id}`}
              source={playbackReport.activeImageSource} 
              style={styles.imageFix} 
              resizeMode="contain" 
            />
          )}
          
          {/* 3. Canvas-lagret för ritningarna */}
          {vm.canvasSize.w > 1 && (
            <AnalysisCanvas 
              allToRender={vm.allToRender} 
              canvasSize={vm.canvasSize} 
              getArrowHead={vm.getArrowHead}
            />
          )}
        </View>

        {/* Kontroller */}
        <TouchableOpacity 
          style={[styles.playButton, vm.isPlaying && styles.stopButton]} 
          onPress={vm.isPlaying ? vm.stopPlayback : vm.startPlayback}
        >
          <Ionicons name={vm.isPlaying ? "square" : "play"} size={24} color="#FFF" />
          <Text style={styles.playButtonText}>
            {vm.isPlaying ? "Stoppa" : "Spela upp video"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 20, 
    backgroundColor: '#FFF' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '800' 
  },
  card: { 
    margin: 20, 
    padding: 20, 
    backgroundColor: '#FFF', 
    borderRadius: 25, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5 
  },
  dateText: { 
    color: '#6C757D', 
    marginBottom: 15, 
    fontWeight: '600' 
  },
  pitchWrapperDetail: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0B6E3A',
    position: 'relative', // För att absolutplacerade barn ska hamna rätt
  },
  imageFix: {
    position: 'absolute',
    width: '100%', // Tvingar bilden att centrera inom hela boxen
    height: '100%',
    top: 0,
    left: 0,
  },
  playButton: { 
    flexDirection: 'row', 
    backgroundColor: '#007AFF', 
    marginTop: 20, 
    padding: 15, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 10 
  },
  stopButton: { 
    backgroundColor: '#FF3B30' 
  },
  playButtonText: { 
    color: '#FFF', 
    fontWeight: '800', 
    fontSize: 16 
  },
});

export default ReportDetailView;