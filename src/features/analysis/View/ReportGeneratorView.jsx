// src/features/analysis/View/ReportGeneratorView.jsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const ReportGeneratorView = ({ navigation, vm }) => {
  const {
    videoMeta,
    frames,
    transcription,
    report,
    loading,
    error,
    runTranscription,
    generateReport,
  } = vm;

  const handleGenerate = async () => {
    await generateReport();
  };

  return (
    <View style={styles.container}>
      {/* Simple header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.link}>Hem</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Rapport</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Video</Text>
        <Text style={styles.value}>
          {videoMeta ? videoMeta.name : 'Ingen video vald'}
        </Text>

        <Text style={styles.label}>Transkription</Text>
        <Text style={styles.value}>
          {transcription ? transcription.fullText : 'Ingen transkription ännu'}
        </Text>

        <Text style={styles.label}>Antal markerade frames</Text>
        <Text style={styles.value}>{frames.length}</Text>

        {report && (
          <>
            <Text style={styles.label}>Rapport ID</Text>
            <Text style={styles.value}>{report.id}</Text>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Skapar rapport...' : 'Skapa rapport'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 20,
  },
  link: { color: '#007AFF', fontWeight: '700', fontSize: 16 },
  title: { fontSize: 22, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  label: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '700',
    color: '#6C757D',
    textTransform: 'uppercase',
  },
  value: { marginTop: 4, fontSize: 15, color: '#212529' },
  error: { marginTop: 8, color: 'red' },
  button: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default ReportGeneratorView;
