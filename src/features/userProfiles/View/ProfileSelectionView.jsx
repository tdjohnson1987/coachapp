import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useProfileVM } from '../ViewModel/useProfileVM';

const ProfileSelectionView = () => {
    const { profiles, inspectedProfile, loading, inspectProfile, closeInspection, addProfile } = useProfileVM();
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({ name: '', age: '', fitnessLevel: 'Beginner', role: 'athlete', bio: '' });

    const handleSubmit = async () => {
        await addProfile(formData);
        setIsCreating(false);
        setFormData({ name: '', age: '', fitnessLevel: 'Beginner', role: 'athlete', bio: '' });
    };

    if (loading && profiles.length === 0) return <Text>Laddar profiler...</Text>;

    return (
        <ScrollView style={styles.container}>
            <TouchableOpacity onPress={() => setIsCreating(!isCreating)} style={styles.button}>
                <Text style={styles.buttonText}>{isCreating ? 'Avbryt' : '+ Skapa ny profil'}</Text>
            </TouchableOpacity>

            {isCreating && (
                <View style={styles.form}>
                    <Text style={styles.label}>Ny profil</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Namn" 
                        value={formData.name} 
                        onChangeText={text => setFormData({...formData, name: text})} 
                    />
                    <TextInput 
                        style={styles.input} 
                        placeholder="Ålder" 
                        keyboardType="numeric"
                        value={formData.age} 
                        onChangeText={text => setFormData({...formData, age: text})} 
                    />
                    {/* För enkelhets skull använder vi TextInput här, i RN använder man ofta en Picker-modul för dropdowns */}
                    <TouchableOpacity onPress={handleSubmit} style={styles.saveButton}>
                        <Text style={styles.buttonText}>Spara profil</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Lista på profiler */}
            {profiles.map(profile => (
                <TouchableOpacity key={profile.id} onPress={() => inspectProfile(profile.id)} style={styles.profileCard}>
                    <Text>{profile.name} ({profile.fitnessLevel})</Text>
                </TouchableOpacity>
            ))}

            {/* Detaljvy */}
            {inspectedProfile && (
                <View style={styles.modal}>
                    <TouchableOpacity onPress={closeInspection}><Text>Stäng X</Text></TouchableOpacity>
                    <Text style={styles.title}>{inspectedProfile.name}</Text>
                    <Text>Ålder: {inspectedProfile.age}</Text>
                    <Text>Nivå: {inspectedProfile.fitnessLevel}</Text>
                    <Text>{inspectedProfile.bio}</Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 20, paddingTop: 50 },
    button: { backgroundColor: '#007bff', padding: 10, borderRadius: 5, marginBottom: 10 },
    saveButton: { backgroundColor: 'green', padding: 10, borderRadius: 5, marginTop: 10 },
    buttonText: { color: 'white', textAlign: 'center' },
    input: { borderBottomWidth: 1, marginBottom: 15, padding: 5 },
    profileCard: { padding: 15, backgroundColor: '#f9f9f9', marginBottom: 5, borderRadius: 5 },
    form: { padding: 15, borderColor: '#007bff', borderWidth: 1, borderRadius: 10, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold' }
});

export default ProfileSelectionView;