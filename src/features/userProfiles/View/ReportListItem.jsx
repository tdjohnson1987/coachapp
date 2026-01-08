import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ReportListItem = ({ report, onPress, onLongPress }) => {
    // Priority: 1. Custom Title, 2. Type, 3. Fallback string
    const displayTitle = report?.title || report?.type || "Untitled Analysis";
    const isVideo = report.type === "Video Drawing Analysis";
    const isDrawing = report?.type?.toLowerCase().includes("drawing");

    return (
        <TouchableOpacity 
            style={styles.reportCard} 
            onPress={() => onPress(report)}
            onLongPress={() => onLongPress(report.id)}
            delayLongPress={600}
        >
            <View style={styles.reportIconWrapper}>
                <Ionicons 
                    name={isVideo ? "videocam" : (isDrawing ? "brush" : "analytics")} 
                    size={20} 
                    color={isVideo ? "#5856D6" : "#007AFF"} 
                />
            </View>
            
            <View style={styles.reportInfo}>
                {/* Now displaying the custom name saved during capture */}
                <Text style={styles.reportTitle} numberOfLines={1}>
                    {displayTitle}
                </Text>
                <Text style={styles.reportDate}>
                    {report?.date || "No date"} • {report?.time || ""}
                </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#ADB5BD" />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    marginBottom: 12,
  },
  reportIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  reportInfo: { flex: 1 },
  reportTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  reportDate: { fontSize: 12, color: '#ADB5BD', marginTop: 2 },
});

export default ReportListItem;