import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Platform
} from 'react-native';

import {
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';

import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function RegisterScreen({ navigation }) {

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const register = async () => {
        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);

            await updateProfile(userCred.user, {
                displayName: username
            });

            await setDoc(doc(db, 'users', userCred.user.uid), {
                username,
                email,
                online: true
            });

            navigation.navigate('Login');

        } catch (e) {
            alert(e.message);
        }
    };

    return (
        <View style={{
            flex: 1,
            backgroundColor: '#1e1f22',
            justifyContent: 'center',
            alignItems: 'center'
        }}>

            <View style={{
                width: Platform.OS === 'web' ? 400 : '100%',
                padding: 20,
                backgroundColor: Platform.OS === 'web' ? '#2b2d31' : 'transparent',
                borderRadius: Platform.OS === 'web' ? 15 : 0,
            }}>

                <Text style={{
                    color: 'white',
                    fontSize: 30,
                    marginBottom: 20,
                    textAlign: 'center'
                }}>
                    Register
                </Text>

                <TextInput
                    placeholder='Username'
                    placeholderTextColor='gray'
                    value={username}
                    onChangeText={setUsername}
                    style={{
                        backgroundColor: '#3a3c41',
                        color: 'white',
                        padding: 15,
                        borderRadius: 10,
                        marginBottom: 10
                    }}
                />

                <TextInput
                    placeholder='Email'
                    placeholderTextColor='gray'
                    value={email}
                    onChangeText={setEmail}
                    style={{
                        backgroundColor: '#3a3c41',
                        color: 'white',
                        padding: 15,
                        borderRadius: 10,
                        marginBottom: 10
                    }}
                />

                <TextInput
                    placeholder='Password'
                    placeholderTextColor='gray'
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    style={{
                        backgroundColor: '#3a3c41',
                        color: 'white',
                        padding: 15,
                        borderRadius: 10
                    }}
                />

                <TouchableOpacity
                    onPress={register}
                    style={{
                        backgroundColor: '#5865f2',
                        padding: 15,
                        borderRadius: 10,
                        marginTop: 20
                    }}
                >
                    <Text style={{
                        color: 'white',
                        textAlign: 'center',
                        fontWeight: 'bold'
                    }}>
                        Register
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={{
                        color: '#5865f2',
                        marginTop: 20,
                        textAlign: 'center'
                    }}>
                        Already have account?
                    </Text>
                </TouchableOpacity>

            </View>

        </View>
    );
}