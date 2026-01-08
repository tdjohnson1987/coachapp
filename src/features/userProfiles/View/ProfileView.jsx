// src/features/profile/View/ProfileView.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import ReportListItem from './ReportListItem';
import { useProfileVM } from '../ViewModel/useProfileVM';
import { useAnalysisVM } from '../../analysis/ViewModel/useAnalysisVM';
import { useAuth } from '../../../context/AuthContext';

const ProfileView = ({ route, navigation, profiles, setProfiles }) => {
  const { profile, onUpdate } = route.params;

  const vm = useProfileVM();
  const analysisVM = useAnalysisVM();
  const { user } = useAuth();
  const coachId = user?.id;

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(profile || {});

  useEffect(() => {
    setEditData(profile || {});
  }, [profile]);

  useEffect(() => {
    if (!editData?.id || !coachId) return;
    analysisVM.useProfileForAnalysis(coachId, editData.id);
  }, [analysisVM, coachId, editData?.id]);

  const handleOpenReports = () => {
    navigation.navigate('ReportGenerator', { profile: editData });
  };

  const handlePickImage = async () => {
    const uri = await vm.pickImage();
    if (uri) {
      setEditData({ ...editData, image: uri });
    }
  };

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleDeleteReport = (reportId) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'No' },
      {
        text: 'Yes',
        onPress: () => {
          const updated = vm.deleteReport(editData, reportId);
          setEditData(updated);
          onUpdate(updated);
        },
      },
    ]);
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete this profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedList = await vm.deleteProfile(editData.id, profiles);
            if (updatedList) {
              setProfiles(updatedList);
              navigation.goBack();
            }
          },
        },
      ],
    );
  };

  const handleCreateAnalysis = () => {
    Alert.alert(
      'New Analysis',
      'Would you like to use a picture or a video?',
      [
        {
          text: 'Picture',
          onPress: () =>
            navigation.navigate('Capture', {
              returnToProfile: editData,
              onSaveAnalysis: async (profileId, snapshot) => {
                // 1) Attach snapshot to profile (local profile reports)
                const updatedProfile = vm.addReportToProfile
                  ? vm.addReportToProfile(profileId, snapshot)
                  : {
                      ...editData,
                      reports: [...(editData.reports || []), snapshot],
                    };

                setEditData(updatedProfile);
                onUpdate(updatedProfile);

                // 2) Generate STT report
                try {
                 const sttReport = await analysisVM.generateSTTFromSnapshot({
                  profile: updatedProfile,
                  snapshot,
                });

                if (!sttReport || !sttReport.id) {
                  return; // don’t try to use id when STT failed
                }
                const realId = sttReport.reportId || sttReport.id;
                if (!realId) {
                  console.warn('No realId from STT, skipping summary');
                  return;
                }

                const sttSummary = {
                  id: `stt-${realId}-${Date.now()}`,
                  sttReportId: realId,
                  title: sttReport.title || snapshot.title,
                  type: 'Drawing+STT',
                  date: snapshot.date,
                  time: snapshot.time,
                  preview: sttReport.transcription?.fullText?.slice(0, 80) || '',
                };

                const updatedWithSTT = {
                  ...updatedProfile,
                  reports: [...(updatedProfile.reports || []), sttSummary],
                };

                setEditData(updatedWithSTT);
                onUpdate(updatedWithSTT);


              } catch (e) {
                console.warn('Failed to generate STT report', e);
              }
              },
            }),
        },
        {
          text: 'Video',
          onPress: () =>
            navigation.navigate('VideoAnalysis', {
              returnToProfile: editData,
            }),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile section */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            onPress={isEditing ? handlePickImage : null}
            activeOpacity={isEditing ? 0.7 : 1}
            style={styles.imageWrapper}
          >
            {editData?.image ? (
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
              <Text style={styles.mainName}>
                {editData?.name || 'Namn saknas'}
              </Text>
              <Text style={styles.staticSubInfo}>
                Age: {editData?.age || '--'}  •  Level:{' '}
                {editData?.fitnessLevel || '--'}
              </Text>

              <TouchableOpacity
                style={styles.editToggleBtn}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.editToggleBtnText}>Change information</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.mainName}>Edit profile</Text>
          )}
        </View>

        {/* Edit mode */}
        {isEditing && (
          <View style={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={editData?.name || ''}
              onChangeText={(t) => setEditData({ ...editData, name: t })}
            />

            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={editData?.age || ''}
              onChangeText={(t) => setEditData({ ...editData, age: t })}
            />

            <TouchableOpacity style={styles.fullSaveBtn} onPress={handleSave}>
              <Text style={styles.fullSaveBtnText}>Save changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        {!isEditing && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={handleCreateAnalysis}
            >
              <Ionicons name="add-circle" size={24} color="#FFF" />
              <Text style={styles.createBtnText}>Create new analysis</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 15,
              }}
            >
              <Text style={styles.sectionHeader}>Previous Videos/Reports</Text>
              <TouchableOpacity onPress={handleOpenReports}>
                <Text style={{ color: '#007AFF', fontWeight: '600' }}>
                  View all
                </Text>
              </TouchableOpacity>
            </View>

            {console.log('REPORTS FOR PROFILE', editData.id, editData.reports)}

            <View style={styles.reportsList}>
              {editData?.reports && editData.reports.length > 0 ? (
                editData.reports.map((report) => (
                 <ReportListItem
                    key={report.id}
                    report={report}
                    onPress={(r) => {
                      if (!r) return;

                      if (r.type === 'Drawing+STT') {
                        const targetId = r.sttReportId || r.id;
                        if (!targetId) return;

                        navigation.navigate('STTReportDetail', {
                          reportId: targetId,
                        });
                      } else {
                        navigation.navigate('ReportDetail', {
                          playbackReport: r,
                        });
                      }
                    }}
                    onLongPress={handleDeleteReport}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="document-text-outline"
                    size={40}
                    color="#E9ECEF"
                  />
                  <Text style={styles.emptyStateText}>No analysis saved.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={{ marginTop: 40, marginBottom: 20, alignItems: 'center' }}
          onPress={handleDeleteProfile}
        >
          <Text style={{ color: '#FF3B30', fontWeight: '600' }}>
            Delete Profile
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  backBtn: { padding: 5 },

  profileSection: { alignItems: 'center', marginVertical: 20 },
  imageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
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
  staticSubInfo: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
  },
  editToggleBtn: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
  },
  editToggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
  },

  form: {
    padding: 25,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    borderRadius: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ADB5BD',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
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
  createBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },

  divider: { height: 1, backgroundColor: '#F1F3F5', marginVertical: 30 },

  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  reportsList: { paddingBottom: 40 },

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
