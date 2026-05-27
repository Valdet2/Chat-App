// ProfileScreen.js

import { useState } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Platform
} from 'react-native';

import {
    updateProfile,
    updatePassword
} from 'firebase/auth';

import {
    doc,
    setDoc
} from 'firebase/firestore';

import { auth, db } from '../firebase';

import {
    useNavigation
} from '@react-navigation/native';

let LocalAuthentication = null;

if (Platform.OS !== 'web') {

    LocalAuthentication =
        require('expo-local-authentication');
}

export default function ProfileScreen() {

    const user =
        auth.currentUser;

    const navigation =
        useNavigation();

    const [username, setUsername] =
        useState(
            user?.displayName || ''
        );

    const [password, setPassword] =
        useState('');

    const [loading, setLoading] =
        useState(false);

    // 🔥 UPDATE PROFILE
    const handleUpdate = async () => {

        if (!user) return;

        setLoading(true);

        try {

            let changed = false;

            // 🔥 USERNAME
            if (
                username.trim() &&
                username !== user.displayName
            ) {

                await updateProfile(user, {
                    displayName: username
                });

                // 🔥 SAVE USERNAME TO FIRESTORE
                await setDoc(
                    doc(db, 'users', user.uid),
                    {
                        username:
                            username.trim()
                    },
                    { merge: true }
                );

                changed = true;
            }

            // 🔥 PASSWORD
            if (
                password.trim().length > 5
            ) {

                await updatePassword(
                    user,
                    password
                );

                changed = true;
            }

            await user.reload();

            if (changed) {

                alert(
                    '✅ Profile updated!'
                );

            } else {

                alert(
                    'No changes made.'
                );
            }

        } catch (error) {

            if (
                error.code ===
                'auth/requires-recent-login'
            ) {

                alert(
                    'Login again to change password'
                );

            } else {

                alert(error.message);
            }
        }

        setLoading(false);
    };

    // 🔥 BIOMETRIC TYPE
    const getBiometricType =
        async () => {

            const types =
                await LocalAuthentication.supportedAuthenticationTypesAsync();

            if (
                Platform.OS ===
                'android'
            ) {

                if (
                    types.includes(1)
                ) {

                    return 'Fingerprint';
                }

                return 'Biometric';
            }

            if (
                Platform.OS ===
                'ios'
            ) {

                if (
                    types.includes(2)
                ) {

                    return 'Face ID';
                }

                if (
                    types.includes(1)
                ) {

                    return 'Touch ID';
                }
            }

            return 'Biometric';
        };

    // 🔥 ENABLE BIOMETRIC
    const enableBiometric =
        async () => {

            if (
                Platform.OS ===
                'web'
            ) {

                alert(
                    'Biometric not supported on web'
                );

                return;
            }

            if (!user) return;

            const hasHardware =
                await LocalAuthentication.hasHardwareAsync();

            if (!hasHardware) {

                alert(
                    'Device does not support biometrics'
                );

                return;
            }

            const enrolled =
                await LocalAuthentication.isEnrolledAsync();

            if (!enrolled) {

                alert(
                    'No fingerprint / face id set in phone settings'
                );

                return;
            }

            const typeText =
                await getBiometricType();

            const result =
                await LocalAuthentication.authenticateAsync({
                    promptMessage:
                        `Enable ${typeText}`,

                    fallbackLabel:
                        'Use Passcode'
                });

            if (result.success) {

                await setDoc(
                    doc(
                        db,
                        'users',
                        user.uid
                    ),
                    {
                        biometricEnabled:
                            true
                    },
                    { merge: true }
                );

                alert(
                    `✅ ${typeText} enabled!`
                );

            } else {

                alert('Failed');
            }
        };

    return (

        <View
            style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#202225',
                padding: 20
            }}
        >

            {/* 🔥 PROFILE CARD */}
            <View
                style={{
                    width:
                        Platform.OS === 'web'
                            ? 420
                            : '100%',

                    maxWidth: '100%',

                    backgroundColor: '#2b2d31',

                    padding: 25,

                    borderRadius: 20
                }}
            >

                {/* 🔥 TITLE */}
                <Text
                    style={{
                        color: 'white',
                        fontSize: 28,
                        marginBottom: 25,
                        textAlign: 'center',
                        fontWeight: 'bold'
                    }}
                >
                    Profile Settings
                </Text>

                {/* 🔥 EMAIL */}
                <View
                    style={{
                        backgroundColor: '#111214',
                        padding: 14,
                        borderRadius: 12,
                        marginBottom: 14
                    }}
                >

                    <Text
                        style={{
                            color: '#8e9297',
                            marginBottom: 4,
                            fontSize: 12
                        }}
                    >
                        Email
                    </Text>

                    <Text
                        style={{
                            color: 'white',
                            fontSize: 15
                        }}
                    >
                        {user?.email}
                    </Text>

                </View>

                {/* 🔥 USERNAME */}
                <TextInput
                    placeholder="Username"
                    placeholderTextColor="gray"

                    value={username}

                    onChangeText={setUsername}

                    style={{
                        backgroundColor: '#111214',
                        color: 'white',
                        padding: 14,
                        borderRadius: 12,
                        marginBottom: 14
                    }}
                />

                {/* 🔥 PASSWORD */}
                <TextInput
                    placeholder="New Password"
                    placeholderTextColor="gray"

                    secureTextEntry

                    value={password}

                    onChangeText={setPassword}

                    style={{
                        backgroundColor: '#111214',
                        color: 'white',
                        padding: 14,
                        borderRadius: 12,
                        marginBottom: 20
                    }}
                />

                {/* 🔥 SAVE BUTTON */}
                <TouchableOpacity
                    onPress={handleUpdate}

                    disabled={loading}

                    style={{
                        backgroundColor: '#5865f2',

                        padding: 14,

                        borderRadius: 12,

                        opacity:
                            loading
                                ? 0.6
                                : 1,

                        marginBottom: 12
                    }}
                >

                    {loading ? (

                        <ActivityIndicator
                            color="white"
                        />

                    ) : (

                        <Text
                            style={{
                                color: 'white',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: 15
                            }}
                        >
                            Save Changes
                        </Text>
                    )}

                </TouchableOpacity>

                {/* 🔥 BIOMETRIC */}
                <TouchableOpacity
                    onPress={enableBiometric}

                    style={{
                        backgroundColor: '#111214',

                        padding: 14,

                        borderRadius: 12,

                        marginBottom: 12
                    }}
                >

                    <Text
                        style={{
                            color: 'white',
                            textAlign: 'center',
                            fontWeight: '600'
                        }}
                    >
                        🔒 Enable Biometric Login
                    </Text>

                </TouchableOpacity>

                {/* 🔥 CANCEL */}
                <TouchableOpacity
                    onPress={() =>
                        navigation.goBack()
                    }

                    style={{
                        backgroundColor: '#3a3c41',

                        padding: 14,

                        borderRadius: 12
                    }}
                >

                    <Text
                        style={{
                            color: 'white',
                            textAlign: 'center',
                            fontWeight: '600'
                        }}
                    >
                        Cancel
                    </Text>

                </TouchableOpacity>

            </View>

        </View>
    );
}