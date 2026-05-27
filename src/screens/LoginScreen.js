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
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile
} from 'firebase/auth';

import { auth } from '../firebase';

export default function LoginScreen() {

    const [isRegister, setIsRegister] =
        useState(false);

    const [username, setUsername] =
        useState('');

    const [email, setEmail] =
        useState('');

    const [password, setPassword] =
        useState('');

    const [loading, setLoading] =
        useState(false);

    const [googleLoading, setGoogleLoading] =
        useState(false);

    // 🔥 LOGIN
    const handleLogin = async () => {

        if (!email || !password) {

            alert('Fill all fields');
            return;
        }

        setLoading(true);

        try {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        } catch (error) {

            alert(error.message);
        }

        setLoading(false);
    };

    // 🔥 REGISTER
    const handleRegister = async () => {

        if (
            !username ||
            !email ||
            !password
        ) {

            alert('Fill all fields');
            return;
        }

        if (password.length < 6) {

            alert(
                'Password must be at least 6 characters'
            );

            return;
        }

        setLoading(true);

        try {

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            // 🔥 SET USERNAME
            await updateProfile(
                userCredential.user,
                {
                    displayName: username
                }
            );

        } catch (error) {

            alert(error.message);
        }

        setLoading(false);
    };

    // 🔥 GOOGLE LOGIN
    const handleGoogleLogin = async () => {

        try {

            setGoogleLoading(true);

            const provider =
                new GoogleAuthProvider();

            if (Platform.OS === 'web') {

                await signInWithPopup(
                    auth,
                    provider
                );

            } else {

                alert(
                    'Google login on mobile needs Expo AuthSession.'
                );
            }

        } catch (e) {

            alert(e.message);
        }

        setGoogleLoading(false);
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

            {/* 🔥 CARD */}
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
                    {isRegister
                        ? 'Create Account'
                        : 'Login'}
                </Text>

                {/* 🔥 USERNAME */}
                {isRegister && (

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
                            marginBottom: 12
                        }}
                    />
                )}

                {/* 🔥 EMAIL */}
                <TextInput
                    placeholder="Email"
                    placeholderTextColor="gray"

                    value={email}
                    onChangeText={setEmail}

                    autoCapitalize="none"

                    style={{
                        backgroundColor: '#111214',
                        color: 'white',
                        padding: 14,
                        borderRadius: 12,
                        marginBottom: 12
                    }}
                />

                {/* 🔥 PASSWORD */}
                <TextInput
                    placeholder="Password"
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

                {/* 🔥 LOGIN / REGISTER BUTTON */}
                <TouchableOpacity
                    onPress={
                        isRegister
                            ? handleRegister
                            : handleLogin
                    }

                    disabled={loading}

                    style={{
                        backgroundColor: '#5865f2',
                        padding: 14,
                        borderRadius: 12,

                        opacity:
                            loading
                                ? 0.6
                                : 1
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
                            {isRegister
                                ? 'Create Account'
                                : 'Login'}
                        </Text>
                    )}

                </TouchableOpacity>

                {/* 🔥 SWITCH */}
                <TouchableOpacity
                    onPress={() =>
                        setIsRegister(
                            !isRegister
                        )
                    }

                    style={{
                        marginTop: 18
                    }}
                >

                    <Text
                        style={{
                            color: '#5865f2',
                            textAlign: 'center',
                            fontWeight: '600'
                        }}
                    >
                        {isRegister
                            ? 'Already have an account? Login'
                            : "Don't have an account? Register"}
                    </Text>

                </TouchableOpacity>

                {/* 🔥 OR */}
                <Text
                    style={{
                        color: '#8e9297',
                        textAlign: 'center',
                        marginVertical: 18
                    }}
                >
                    OR
                </Text>

                {/* 🔥 GOOGLE */}
                <TouchableOpacity
                    onPress={handleGoogleLogin}

                    disabled={googleLoading}

                    style={{
                        backgroundColor: '#ffffff',

                        padding: 14,

                        borderRadius: 12,

                        opacity:
                            googleLoading
                                ? 0.6
                                : 1
                    }}
                >

                    {googleLoading ? (

                        <ActivityIndicator
                            color="#000"
                        />

                    ) : (

                        <Text
                            style={{
                                color: '#000',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: 15
                            }}
                        >
                            Continue with Google
                        </Text>
                    )}

                </TouchableOpacity>

            </View>

        </View>
    );
}