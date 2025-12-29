import React from 'react';
import { StyleSheet, SafeAreaView, View, StatusBar } from 'react-native';
// Kontrollera att sökvägen stämmer med din mappstruktur
import ProfileSelectionView from './src/features/userProfiles/View/ProfileSelectionView';

export default function App() {
  return (
    // SafeAreaView ser till att appen inte hamnar under klockan/batteri-ikonen på din iPhone
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1 }}>
        <ProfileSelectionView />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
