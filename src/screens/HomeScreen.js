import { useState, useEffect } from 'react';

import {
  View,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Text
} from 'react-native';

import { useRoute } from '@react-navigation/native';

import Sidebar from '../components/Sidebar';
import ChatScreen from './ChatScreen';
import AIScreen from './AIScreen';

export default function HomeScreen() {

  const { width } = useWindowDimensions();

  const route = useRoute();

  const isWeb = width > 768;

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // 🔥 AI
  const [aiOpen, setAiOpen] = useState(false);

  const [toast, setToast] = useState('');

  // 🔥 SHOW MESSAGE FROM PROFILE
  useEffect(() => {

    if (route.params?.message) {

      setToast(route.params.message);

      setTimeout(() => {
        setToast('');
      }, 2500);

    }

  }, [route.params]);

  const isChatOpen =
    !!selectedUser ||
    !!selectedGroup ||
    aiOpen;

  return (

    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >

      <View
        style={{
          flex: 1,

          flexDirection:
            isWeb
              ? 'row'
              : 'column',

          backgroundColor: '#1e1f22'
        }}
      >

        {/* 🔥 TOAST */}
        {toast !== '' && (

          <View
            style={{
              position: 'absolute',
              top: 50,
              left: 20,
              right: 20,
              backgroundColor: '#5865f2',
              padding: 12,
              borderRadius: 12,
              zIndex: 999
            }}
          >

            <Text
              style={{
                color: 'white',
                textAlign: 'center'
              }}
            >
              {toast}
            </Text>

          </View>

        )}

        {/* 🔥 MOBILE SIDEBAR */}
        {!isWeb && (

          <View
            style={{
              flex: 1,

              display:
                isChatOpen
                  ? 'none'
                  : 'flex'
            }}
          >

            <Sidebar

              setSelectedUser={(user) => {

                setAiOpen(false);

                setSelectedGroup(null);
                setSelectedUser(user);

              }}

              setSelectedGroup={(group) => {

                setAiOpen(false);

                setSelectedUser(null);
                setSelectedGroup(group);

              }}

              setAiOpen={setAiOpen}

              selectedGroup={selectedGroup}
            />

          </View>

        )}

        {/* 🔥 WEB SIDEBAR */}
        {isWeb && (

          <View
            style={{
              width: 320,
              borderRightWidth: 1,
              borderColor: '#2b2d31'
            }}
          >

            <Sidebar

              setSelectedUser={(user) => {

                setAiOpen(false);

                setSelectedGroup(null);
                setSelectedUser(user);

              }}

              setSelectedGroup={(group) => {

                setAiOpen(false);

                setSelectedUser(null);
                setSelectedGroup(group);

              }}

              setAiOpen={setAiOpen}

              selectedGroup={selectedGroup}
            />

          </View>

        )}

        {/* 🔥 CHAT / AI */}
        <View
          style={{
            flex: 1,
            overflow: 'hidden',

            display:
              (!isWeb && !isChatOpen)
                ? 'none'
                : 'flex'
          }}
        >

          {aiOpen ? (

            <AIScreen
              isWeb={isWeb}

              goBack={() => {

                setAiOpen(false);

              }}
            />

          ) : (selectedUser || selectedGroup) ? (

            <ChatScreen
              selectedUser={selectedUser}
              selectedGroup={selectedGroup}

              goBack={() => {

                setSelectedUser(null);
                setSelectedGroup(null);

              }}

              isWeb={isWeb}
            />

          ) : null}

        </View>

      </View>

    </KeyboardAvoidingView>
  );
}