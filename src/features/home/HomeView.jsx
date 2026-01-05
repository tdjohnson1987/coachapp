// src/features/home/HomeView.jsx
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const HomeView = ({ navigate }) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>RapportApp</Text>
        <Text style={styles.subtitle}>Välj vad du vill göra</Text>
      </View>

      <View style={styles.buttonBlock}>
        <Button
          title="Profiler"
          onPress={() => navigate('Selection')}
          color="#007AFF"
        />
        <View style={styles.spacer} />
        <Button
          title="Videoanalys"
          onPress={() => navigate('VideoAnalysis')}
          color="#007AFF"
        />
        <View style={styles.spacer} />
        <Button
          title="Rita på plan/stillbild"
          onPress={() => navigate('Capture')}
          color="#007AFF"
        />
        <View style={styles.spacer} />

        <Button
          title="Rapportgenerator"
          onPress={() => navigate('ReportGenerator')}
          color="#007AFF"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
  },
  headerBlock: { marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonBlock: { width: '80%' },
  spacer: { height: 16 },
});

export default HomeView;
