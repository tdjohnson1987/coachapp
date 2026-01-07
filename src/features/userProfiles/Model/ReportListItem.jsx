import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ReportListItem = ({ report, onPress, onLongPress }) => {
    const reportType = report?.type || "Okänd analys";
    const isDrawing = reportType.toLowerCase().includes("drawing");
    return (
        <TouchableOpacity 
            style={styles.reportCard} 
            onPress={() => onPress(report)}
            onLongPress={() => onLongPress(report.id)}
            delayLongPress={600}
        >
            <View style={styles.reportIconWrapper}>
                <Ionicons 
                    name={isDrawing ? "brush" : "videocam"} 
                    size={20} 
                    color="#007AFF" 
                />
            </View>
            
            <View style={styles.reportInfo}>
                <Text style={styles.reportTitle}>{reportType}</Text>
                <Text style={styles.reportDate}>
                    {report?.date || "Inget datum"} • {report?.time || ""}
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