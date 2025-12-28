// src/features/userProfiles/View/ProfileSelectionView.jsx
import React, { useState } from 'react';
import { useProfileVM } from '../ViewModel/useProfileVM';

const ProfileSelectionView = () => {
    const { profiles, inspectedProfile, loading, inspectProfile, closeInspection, addProfile } = useProfileVM();
    const [isCreating, setIsCreating] = useState(false);

    // Lokalt state för formuläret
    const [formData, setFormData] = useState({ name: '', age: '', fitnessLevel: 'Beginner', role: 'athlete', bio: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addProfile(formData);
        setIsCreating(false);
        setFormData({ name: '', age: '', fitnessLevel: 'Beginner', role: 'athlete', bio: '' });
    };

    if (loading) return <div>Loading profiles...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <button onClick={() => setIsCreating(!isCreating)} style={{ marginBottom: '20px' }}>
                {isCreating ? 'Avbryt' : '+ Skapa ny profil'}
            </button>

            {isCreating && (
                <form onSubmit={handleSubmit} style={{ marginBottom: '30px', padding: '20px', border: '2px solid #007bff', borderRadius: '8px' }}>
                    <h3>Ny profil</h3>
                    <input placeholder="Namn" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /><br/>
                    <input placeholder="Ålder" type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} required /><br/>
                    <select value={formData.fitnessLevel} onChange={e => setFormData({...formData, fitnessLevel: e.target.value})}>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Elite">Elite</option>
                    </select><br/>
                    <textarea placeholder="Kort biografi" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} /><br/>
                    <button type="submit">Spara profil</button>
                </form>
            )}

            <div style={{ display: 'flex', gap: '20px' }}>
                {/* DETALJERAD INSPEKTION */}
                <div style={{ flex: 2, border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
                    {inspectedProfile ? (
                    <div>
                        <button onClick={closeInspection}>Stäng x</button>
                        <h1>{inspectedProfile.name}</h1>
                        <hr />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <p><strong>Age:</strong> {inspectedProfile.age}</p>
                        <p><strong>Level:</strong> {inspectedProfile.fitnessLevel}</p>
                        <p><strong>Role:</strong> {inspectedProfile.role}</p>
                        </div>
                        <h3>Biography</h3>
                        <p>{inspectedProfile.bio}</p>
                    </div>
                    ) : (
                    <div style={{ color: '#999', textAlign: 'center', marginTop: '50px' }}>
                        Click on the profile to see more info
                    </div>
                    )}
                </div>
            </div>
        </div>
    );
};