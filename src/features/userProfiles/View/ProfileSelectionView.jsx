import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, Image, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { User, Camera, Plus, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const ProfileSelectionView = ({ navigation, profiles, setProfiles }) => {
    const [isCreating, setIsCreating] = useState(false);
    // Uppdaterat formulär för att inkludera ålder och nivå direkt
    const [formData, setFormData] = useState({ 
        name: '', 
        fitnessLevel: 'Beginner', 
        age: '', 
        image: null 
    });

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setFormData({ ...formData, image: result.assets[0].uri });
        }
    };

    const addProfile = () => {
        if (!formData.name) return;
        setProfiles([...profiles, { ...formData, id: Date.now() }]);
        setIsCreating(false);
        // Återställ formuläret
        setFormData({ name: '', fitnessLevel: 'Beginner', age: '', image: null });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.headerRow}>
                <Text style={styles.header}>Mina Profiler</Text>
                <TouchableOpacity style={styles.iconAdd} onPress={() => setIsCreating(true)}>
                    <Plus color="#007AFF" size={28} />
                </TouchableOpacity>
            </View>

            <View style={styles.grid}>
                {profiles.map((profile) => (
                    <TouchableOpacity 
                        key={profile.id} 
                        style={styles.bigCard}
                        onPress={() => navigation.navigate('Profile', { 
                            profile: profile,
                            onUpdate: (updatedProfile) => {
                                setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
                            }
                        })}
                    >
                        <View style={styles.imageContainer}>
                            {profile.image ? (
                                <Image source={{ uri: profile.image }} style={styles.profileImg} />
                            ) : (
                                <View style={[styles.profileImg, styles.placeholderImg]}>
                                    <User color="#ADB5BD" size={40} />
                                </View>
                            )}
                        </View>
                        <Text style={styles.nameText}>{profile.name}</Text>
                        <Text style={styles.levelText}>{profile.fitnessLevel}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Modal för att skapa ny profil */}
            <Modal visible={isCreating} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Ny profil</Text>
                        <TouchableOpacity onPress={() => setIsCreating(false)}>
                            <X color="#000" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <TouchableOpacity style={styles.imagePickerCircle} onPress={pickImage}>
                            {formData.image ? (
                                <Image source={{ uri: formData.image }} style={styles.fullImg} />
                            ) : (
                                <View style={{ alignItems: 'center' }}>
                                    <Camera color="#007AFF" size={30} />
                                    <Text style={styles.imageText}>Lägg till bild</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.label}>Namn</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Namn på atleten" 
                            value={formData.name}
                            onChangeText={(t) => setFormData({...formData, name: t})}
                        />

                        <Text style={styles.label}>Ålder</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="T.ex. 25" 
                            keyboardType="numeric"
                            value={formData.age}
                            onChangeText={(t) => setFormData({...formData, age: t})}
                        />

                        <Text style={styles.label}>Träningsnivå</Text>
                        <View style={styles.levelContainer}>
                            {['Beginner', 'Intermediate', 'Pro', 'Elite'].map(level => (
                                <TouchableOpacity 
                                    key={level} 
                                    style={[styles.levelBtn, formData.fitnessLevel === level && styles.levelBtnActive]}
                                    onPress={() => setFormData({...formData, fitnessLevel: level})}
                                >
                                    <Text style={[styles.levelText, formData.fitnessLevel === level && styles.levelTextActive]}>{level}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <TouchableOpacity style={[styles.saveButton, { marginTop: 20 }]} onPress={addProfile}>
                            <Text style={styles.saveButtonText}>Spara profil</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    header: { fontSize: 32, fontWeight: '800', color: '#1A1A1A' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 15 },
    bigCard: { 
        backgroundColor: '#FFF', 
        width: (width / 2) - 22, 
        borderRadius: 20, 
        padding: 15, 
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3
    },
    imageContainer: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, overflow: 'hidden' },
    profileImg: { width: '100%', height: '100%' },
    placeholderImg: { backgroundColor: '#E9ECEF', justifyContent: 'center', alignItems: 'center' },
    nameText: { fontSize: 16, fontWeight: '700', color: '#333', textAlign: 'center' },
    levelText: { fontSize: 13, color: '#6C757D', marginTop: 4 },
    modalContent: { flex: 1, padding: 25, backgroundColor: '#FFF' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 24, fontWeight: '800' },
    imagePickerCircle: { 
        width: 120, height: 120, borderRadius: 60, backgroundColor: '#F0F7FF', 
        alignSelf: 'center', justifyContent: 'center', alignItems: 'center', 
        marginBottom: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#007AFF',
        overflow: 'hidden'
    },
    fullImg: { width: '100%', height: '100%' },
    imageText: { color: '#007AFF', fontSize: 12, marginTop: 5, fontWeight: '600' },
    label: { fontSize: 13, fontWeight: '700', color: '#6C757D', marginBottom: 8, textTransform: 'uppercase' },
    input: { backgroundColor: '#F1F3F5', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 20 },
    levelContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    levelBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F1F3F5' },
    levelBtnActive: { backgroundColor: '#007AFF' },
    levelText: { color: '#495057', fontWeight: '700', fontSize: 13 },
    levelTextActive: { color: '#FFF' },
    saveButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 15, alignItems: 'center' },
    saveButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});

export default ProfileSelectionView;