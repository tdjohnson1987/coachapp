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
  }, [playbackReport]);

  return (
    <View style={styles.container}>
      {/* Header med bara tillbaka-knapp */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysuppspelning</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.dateText}>{playbackReport.date} • {playbackReport.time}</Text>
        
        {/* Själva "Video"-ytan */}
        <View style={styles.videoArea}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            console.log("Mäter upp ytan till:", width, height); 
            vm.setCanvasSize({ w: width, h: height });
          }}
        >
          {/* 1. Bakgrundsbilden */}
          {vm.activeImageSource && (
            <Image 
              source={vm.activeImageSource} 
              style={StyleSheet.absoluteFill} 
              resizeMode="contain" 
            />
          )}
          
          {/* 2. Rita bara ut canvasen om bredden är större än 1 (alltså efter mätning) */}
          {vm.canvasSize.w > 1 ? (
            <AnalysisCanvas 
              allToRender={vm.allToRender} 
              canvasSize={vm.canvasSize} 
              getArrowHead={vm.getArrowHead}
              activeImageSource={vm.activeImageSource}
            />
          ) : (
            <View style={StyleSheet.absoluteFill} /> // Tom yta under millisekunden det tar att mäta
          )}
        </View>

        {/* Kontroll för att spela/stoppa ljud och animation */}
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  card: { margin: 20, padding: 20, backgroundColor: '#FFF', borderRadius: 25, elevation: 5 },
  dateText: { color: '#6C757D', marginBottom: 15, fontWeight: '600' },
  videoArea: { width: '100%', aspectRatio: 16/9, backgroundColor: '#000', borderRadius: 15, overflow: 'hidden' },
  playButton: { flexDirection: 'row', backgroundColor: '#007AFF', marginTop: 20, padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 10 },
  stopButton: { backgroundColor: '#FF3B30' },
  playButtonText: { color: '#FFF', fontWeight: '800', fontSize: 16 }
});

export default ReportDetailView;