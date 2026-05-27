import 'react-native-gesture-handler';

import React, {
  useEffect,
  useState
} from 'react';

import {
  View,
  ActivityIndicator,
  Platform
} from 'react-native';

import {
  NavigationContainer
} from '@react-navigation/native';

import {
  createNativeStackNavigator
} from '@react-navigation/native-stack';

import Toast from 'react-native-toast-message';

import {
  onAuthStateChanged,
  signOut
} from 'firebase/auth';

import {
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';

import {
  auth,
  db
} from './src/firebase';

import OneSignal from 'react-native-onesignal';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AIScreen from './src/screens/AIScreen';

// 🔥 BIOMETRIC
let LocalAuthentication = null;

if (Platform.OS !== 'web') {

  LocalAuthentication =
    require('expo-local-authentication');
}

const Stack =
  createNativeStackNavigator();

export default function App() {

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    biometricVerified,
    setBiometricVerified
  ] = useState(false);

  useEffect(() => {

    // 🔥 ONESIGNAL
    if (Platform.OS !== 'web') {

      try {

        OneSignal.initialize(
          'dc89a811-4529-424f-a695-cb4895023a17'
        );

        console.log(
          'ONESIGNAL INIT'
        );

        // 🔥 REQUEST NOTIFICATION PERMISSION
        OneSignal.Notifications.requestPermission(
          true
        );

        // 🔥 FOREGROUND NOTIFICATION
        OneSignal.Notifications.addEventListener(
          'foregroundWillDisplay',
          event => {

            event.preventDefault();

            event.notification.display();
          }
        );

        // 🔥 CLICK NOTIFICATION
        OneSignal.Notifications.addEventListener(
          'click',
          event => {

            console.log(
              'NOTIFICATION CLICKED:',
              event
            );
          }
        );

        // 🔥 GET PLAYER ID
        setTimeout(async () => {

          try {

            const pushId =
              OneSignal.User
                .pushSubscription.id;

            const token =
              OneSignal.User
                .pushSubscription.token;

            console.log(
              'SUB ID:',
              pushId
            );

            console.log(
              'TOKEN:',
              token
            );

            if (
              auth.currentUser &&
              pushId
            ) {

              await updateDoc(
                doc(
                  db,
                  'users',
                  auth.currentUser.uid
                ),
                {
                  oneSignalId:
                    pushId
                }
              );

              console.log(
                'ONESIGNAL ID SAVED'
              );
            }

          } catch (e) {

            console.log(
              'ONESIGNAL SAVE ERROR:',
              e
            );
          }

        }, 5000);

      } catch (e) {

        console.log(
          'ONESIGNAL INIT ERROR:',
          e
        );
      }
    }

    // 🔥 AUTH
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (u) => {

          if (!u) {

            setUser(null);

            setBiometricVerified(
              false
            );

            setLoading(false);

            return;
          }

          // 🔥 WEB
          if (Platform.OS === 'web') {

            setUser(u);

            setBiometricVerified(
              true
            );

            setLoading(false);

            return;
          }

          try {

            const userDoc =
              await getDoc(
                doc(
                  db,
                  'users',
                  u.uid
                )
              );

            const biometricEnabled =
              userDoc.data()
                ?.biometricEnabled;

            // 🔥 BIOMETRIC OFF
            if (!biometricEnabled) {

              setUser(u);

              setBiometricVerified(
                true
              );

              setLoading(false);

              return;
            }

            // 🔥 CHECK HARDWARE
            const hasHardware =
              await LocalAuthentication
                .hasHardwareAsync();

            const enrolled =
              await LocalAuthentication
                .isEnrolledAsync();

            if (
              !hasHardware ||
              !enrolled
            ) {

              await signOut(auth);

              setLoading(false);

              return;
            }

            // 🔥 AUTHENTICATE
            const result =
              await LocalAuthentication
                .authenticateAsync({
                  promptMessage:
                    'Verify fingerprint',

                  cancelLabel:
                    'Cancel',

                  disableDeviceFallback:
                    false
                });

            if (result.success) {

              setUser(u);

              setBiometricVerified(
                true
              );

            } else {

              await signOut(auth);

              setUser(null);

              setBiometricVerified(
                false
              );
            }

          } catch (e) {

            console.log(
              'AUTH ERROR:',
              e
            );

            await signOut(auth);
          }

          setLoading(false);
        }
      );

    return unsubscribe;

  }, []);

  // 🔥 LOADING
  if (loading) {

    return (

      <View
        style={{
          flex: 1,
          justifyContent:
            'center',

          alignItems:
            'center',

          backgroundColor:
            '#1e1f22'
        }}
      >

        <ActivityIndicator
          size="large"
          color="#5865f2"
        />

      </View>
    );
  }

  return (
    <>
      <NavigationContainer>

        <Stack.Navigator
          screenOptions={{
            headerShown: false
          }}
        >

          {user &&
            biometricVerified ? (

            <>
              <Stack.Screen
                name="Home"
                component={HomeScreen}
              />

              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
              />

              <Stack.Screen
                name="AI"
                component={AIScreen}
              />
            </>

          ) : (

            <>
              <Stack.Screen
                name="Login"
                component={LoginScreen}
              />

              <Stack.Screen
                name="Register"
                component={RegisterScreen}
              />
            </>
          )}

        </Stack.Navigator>

      </NavigationContainer>

      <Toast />
    </>
  );
}