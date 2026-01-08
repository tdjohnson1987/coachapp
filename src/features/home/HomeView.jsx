// src/features/home/HomeView.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HomeView = ({ navigate }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        
        {/* Titel-block med ikon bredvid Welcome */}
        <View style={styles.headerBlock}>
          <View style={styles.welcomeRow}>
            <Ionicons 
              name="fitness" 
              size={44} 
              color="#007AFF" 
              style={styles.titleIcon} 
            />
            <Text style={styles.welcomeText}>Welcome</Text>
          </View>
          <Text style={styles.appText}>to the Coach athlete report app</Text>
        </View>

        {/* Centrerad knapp */}
        <TouchableOpacity 
          style={styles.getStartedButton} 
          onPress={() => navigate('Selection')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: -50, // Justera denna för att flytta hela paketet upp/ner
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 50,
  },
  welcomeRow: {
    flexDirection: 'row', // Lägger ikon och text på samma rad
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleIcon: {
    marginRight: 10, // Avstånd mellan ikon och text
    marginTop: 5,    // Finjustering för att ikonen ska linjera med texten
  },
  welcomeText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: -1,
  },
  appText: {
    fontSize: 22,
    fontWeight: '400',
    color: '#6C757D',
    marginTop: 0,
    lineHeight: 30,
    textAlign: 'center',
  },
  getStartedButton: {
    backgroundColor: '#007AFF',
    width: '65%', 
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default HomeView;