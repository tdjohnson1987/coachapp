import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const ProfileView = ({ route, navigation }) => {
  const { profile, onUpdate } = route.params;
  const [editData, setEditData] = useState(profile);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setEditData({ ...editData, image: result.assets[0].uri });
    }
  };

  const handleSave = () => {
    onUpdate(editData);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profil</Text>

        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Ionicons name="checkmark" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Avatar section */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
            {editData.image ? (
              <Image source={{ uri: editData.image }} style={styles.avatar} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Ionicons name="person-circle" size={80} color="#ADB5BD" />
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.mainName}>{editData.name || 'Ny profil'}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Namn</Text>
          <TextInput
            style={styles.input}
            placeholder="Ange namn"
            value={editData.name}
            onChangeText={(t) => setEditData({ ...editData, name: t })}
          />

          <Text style={styles.label}>Ålder</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 24"
            keyboardType="numeric"
            value={editData.age}
            onChangeText={(t) => setEditData({ ...editData, age: t })}
          />

          <Text style={styles.label}>Träningsnivå</Text>
          <View style={styles.levelContainer}>
            {['Beginner', 'Intermediate', 'Pro', 'Elite'].map((level) => {
              const active = editData.fitnessLevel === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[styles.levelBtn, active && styles.levelBtnActive]}
                  onPress={() => setEditData({ ...editData, fitnessLevel: level })}
                >
                  <Text style={[styles.levelText, active && styles.levelTextActive]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
  backBtn: { padding: 5 },
  saveBtn: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },

  profileSection: { alignItems: 'center', marginVertical: 10 },
  imageWrapper: { width: 140, height: 140, borderRadius: 70 },
  avatar: { width: 140, height: 140, borderRadius: 70 },
  placeholderAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  mainName: { fontSize: 26, fontWeight: '800', marginTop: 15, color: '#1A1A1A' },

  form: { padding: 25 },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C757D',
    marginBottom: 8,
    marginTop: 20,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    color: '#1A1A1A',
  },

  levelContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  levelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F3F5',
  },
  levelBtnActive: { backgroundColor: '#007AFF' },
  levelText: { color: '#495057', fontWeight: '700' },
  levelTextActive: { color: '#FFF' },
});

export default ProfileView;
