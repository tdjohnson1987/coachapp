import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert, // FIX 1: Lagt till Alert här
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import ReportListItem from '../Model/ReportListItem';

const ProfileView = ({ route, navigation }) => {
  const { profile, onUpdate } = route.params;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(profile);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Uppdaterat för nyare Expo
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
    setIsEditing(false);
  };
  useEffect(() => {
    setEditData(profile);
  }, [profile]);
  
  const handleDeleteReport = (reportId) => {
    Alert.alert(
      "Radera analys",
      "Är du säker? Detta går inte att ångra.",
      [
        { text: "Avbryt", style: "cancel" },
        { 
          text: "Radera", 
          style: "destructive",
          onPress: () => {
            // Filtrera bort rapporten från editData
            const updatedReports = editData.reports.filter(r => r.id !== reportId);
            const updatedProfile = { ...editData, reports: updatedReports };
            
            setEditData(updatedProfile); // Uppdatera lokalt state
            onUpdate(updatedProfile);    // Skicka till App.js så det sparas globalt
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* --- PROFILSEKTION --- */}
        <View style={styles.profileSection}>
          <TouchableOpacity 
            onPress={isEditing ? pickImage : null} 
            activeOpacity={isEditing ? 0.7 : 1}
            style={styles.imageWrapper}
          >
            {editData.image ? (
              <Image source={{ uri: editData.image }} style={styles.avatar} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Ionicons name="person-circle" size={100} color="#ADB5BD" />
              </View>
            )}
            {isEditing && (
              <View style={styles.cameraIconBadge}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          {!isEditing ? (
            <View style={styles.staticInfoWrapper}>
              <Text style={styles.mainName}>{editData.name || 'Namn saknas'}</Text>
              {/* FIX 2: Textsträngar måste vara rena. Undvik lösa pipes | utanför Text om möjligt */}
              <Text style={styles.staticSubInfo}>
                Ålder: {editData.age || '--'}  •  Nivå: {editData.fitnessLevel}
              </Text>
              
              <TouchableOpacity 
                style={styles.editToggleBtn} 
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.editToggleBtnText}>Ändra information</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.mainName}>Redigera profil</Text>
          )}
        </View>

        {/* --- REDIGERINGSLÄGE --- */}
        {isEditing && (
          <View style={styles.form}>
            <Text style={styles.label}>Namn</Text>
            <TextInput
              style={styles.input}
              value={editData.name}
              onChangeText={(t) => setEditData({ ...editData, name: t })}
            />
            <Text style={styles.label}>Ålder</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={editData.age}
              onChangeText={(t) => setEditData({ ...editData, age: t })}
            />
            
            <TouchableOpacity style={styles.fullSaveBtn} onPress={handleSave}>
              <Text style={styles.fullSaveBtnText}>Spara ändringar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- NYA SEKTIONER --- */}
        {!isEditing && (
          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={styles.createBtn}
              onPress={() => {
                Alert.alert(
                  "New Analysis",
                  "Would you like to use a picture or a video?",
                  [
                    {
                      text: "Picture",
                      onPress: () => navigation.navigate('Capture', { returnToProfile: editData }),
                    },
                    {
                      text: "Video",
                      onPress: () => navigation.navigate('VideoAnalysis', { returnToProfile: editData }),
                    },
                    {
                      text: "Cancel",
                      style: "cancel",
                    },
                  ]
                );
              }}
            >
              <Ionicons name="add-circle" size={24} color="#FFF" />
              <Text style={styles.createBtnText}>Create new analysis</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.sectionHeader}>Previous Videos/Reports</Text>
            
            {/* Här kan du mappa din historik senare */}
            <View style={styles.reportsList}>
              {editData.reports && editData.reports.length > 0 ? (
                editData.reports.map((report) => (
                  <ReportListItem 
                      key={report.id}
                      report={report}
                      onPress={(r) => navigation.navigate('ReportDetail', { playbackReport: r })}
                      onLongPress={handleDeleteReport} // Anropar din Alert-popup
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={40} color="#E9ECEF" />
                  <Text style={styles.emptyStateText}>Inga sparade analyser ännu.</Text>
                </View>
              )}
            </View>
          </View>
        )}
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
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  backBtn: { padding: 5 },

  profileSection: { alignItems: 'center', marginVertical: 20 },
  imageWrapper: { width: 120, height: 120, borderRadius: 60, marginBottom: 10 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  placeholderAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  
  staticInfoWrapper: { alignItems: 'center' },
  mainName: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  staticSubInfo: { fontSize: 14, color: '#6C757D', marginTop: 4 },
  editToggleBtn: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
  },
  editToggleBtnText: { fontSize: 13, fontWeight: '700', color: '#007AFF' },

  form: { padding: 25, backgroundColor: '#F8F9FA', marginHorizontal: 20, borderRadius: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#ADB5BD', marginBottom: 5, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 15,
  },
  fullSaveBtn: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  fullSaveBtnText: { color: '#FFF', fontWeight: '800' },

  actionSection: { paddingHorizontal: 25, marginTop: 10 },
  createBtn: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  
  divider: { height: 1, backgroundColor: '#F1F3F5', marginVertical: 30 },
  
  sectionHeader: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 15 },
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
  reportsList: {
    paddingBottom: 40, // Ger lite andrum längst ner i ScrollViewn
  },
  
  // Styla Empty State (när inga rapporter finns)
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ADB5BD',
  },
  emptyStateText: {
    marginTop: 10,
    color: '#ADB5BD',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProfileView;