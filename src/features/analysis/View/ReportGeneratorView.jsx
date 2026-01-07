// src/features/analysis/View/ReportGeneratorView.jsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
// src/features/analysis/View/ReportGeneratorView.jsx
import AnalysisService from '../Model/AnalysisService';

const ReportGeneratorView = ({ navigation, route }) => {
  const profile = route?.params?.profile;
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (!profile) return;
    AnalysisService.getReportsForAthlete(profile.id).then(setReports);
  }, [profile]);

  const openReport = (report) => {
    navigation.navigate('ReportDetail', { report, profile });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openReport(item)}>
      <Text style={styles.title}>
        Rapport {new Date(item.createdAt).toLocaleString()}
      </Text>
      <Text style={styles.meta}>
        Video: {item.videoMeta?.name || 'Okänd'} ·
        Anteckningar: {item.captureNotes?.length || 0} ·
        Frames: {item.keyFrames?.length || 0}
      </Text>
    </TouchableOpacity>
  );


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile', { profile })}>
          <Text style={styles.link}>Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Rapporter {profile ? `– ${profile.name}` : ''}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {reports.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Inga rapporter ännu för denna profil.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
          )}
          keyExtractor={(item) => item.reportId}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  link: { color: '#007AFF', fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  meta: { fontSize: 13, color: '#6C757D' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#6C757D', fontSize: 14 },
});

export default ReportGeneratorView;
