import { initializeApp } from "firebase/app";

import {
    initializeAuth,
    getReactNativePersistence,
    getAuth
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { getFirestore } from "firebase/firestore";

import { Platform } from "react-native";

const firebaseConfig = {
    apiKey: "AIzaSyCprcrrg_4vunVOVmu27oGW-QgcEePLlUY",
    authDomain: "chatapp-12d97.firebaseapp.com",
    projectId: "chatapp-12d97",
    storageBucket: "chatapp-12d97.firebasestorage.app",
    messagingSenderId: "184565126603",
    appId: "1:184565126603:web:0b58df9ac288bd8a67d24e"
};

const app = initializeApp(firebaseConfig);

let auth;

if (Platform.OS === "web") {
    auth = getAuth(app);
} else {
    try {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
    } catch {
        auth = getAuth(app);
    }
}

export { auth };

export const db = getFirestore(app);