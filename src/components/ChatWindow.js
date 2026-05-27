// ========================= CHATWINDOW =========================

import { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    FlatList
} from 'react-native';

import {
    addDoc,
    collection,
    onSnapshot,
    query,
    where,
    serverTimestamp,
    doc,
    setDoc,
    deleteDoc
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatWindow({
    selectedUser,
    goBack
}) {

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [typingUser, setTypingUser] = useState(null);

    const flatListRef = useRef(null);

    const currentUser = auth.currentUser;

    const currentUserId = currentUser.uid;

    const currentUsername =
        currentUser.displayName ||
        currentUser.email.split('@')[0];

    const roomId = useRef(
        [currentUserId, selectedUser.uid]
            .sort()
            .join('_')
    ).current;

    const formatDateLabel = (date) => {

        const today = new Date();

        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const msgDate = new Date(date);

        const isToday =
            msgDate.toDateString() === today.toDateString();

        const isYesterday =
            msgDate.toDateString() === yesterday.toDateString();

        if (isToday) return 'Today';

        if (isYesterday) return 'Yesterday';

        return msgDate.toLocaleDateString();
    };

    // 🔥 LOAD MESSAGES
    useEffect(() => {

        const q = query(
            collection(db, 'messages'),
            where('roomId', '==', roomId)
        );

        const unsubscribe = onSnapshot(q, snapshot => {

            const msgs = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => {

                    const aTime =
                        a.createdAt?.seconds ||
                        a.createdAt ||
                        0;

                    const bTime =
                        b.createdAt?.seconds ||
                        b.createdAt ||
                        0;

                    return bTime - aTime;
                });

            setMessages(msgs);

        });

        return unsubscribe;

    }, []);

    // 🔥 TYPING
    useEffect(() => {

        const unsubscribe = onSnapshot(
            doc(db, 'typing', roomId),
            snap => {

                if (!snap.exists()) {
                    setTypingUser(null);
                    return;
                }

                const data = snap.data();

                if (
                    data.uid !== currentUserId &&
                    data.typing === true
                ) {
                    setTypingUser(data.username);
                } else {
                    setTypingUser(null);
                }

            }
        );

        return unsubscribe;

    }, []);

    // 🔥 SEND MESSAGE
    const sendMessage = async () => {

        if (!message.trim()) return;

        const msgText = message.trim();

        setMessage('');

        await addDoc(collection(db, 'messages'), {

            roomId,

            senderId: currentUserId,
            sender: currentUsername,

            text: msgText,

            createdAt: serverTimestamp()
        });

        try {
            await deleteDoc(doc(db, 'typing', roomId));
        } catch { }

    };

    // 🔥 HANDLE TYPING
    const handleTyping = async (text) => {

        setMessage(text);

        const typingRef =
            doc(db, 'typing', roomId);

        if (!text.trim()) {

            try {
                await deleteDoc(typingRef);
            } catch { }

            return;
        }

        await setDoc(typingRef, {
            uid: currentUserId,
            username: currentUsername,
            typing: true
        });

        clearTimeout(global.typingTimeout);

        global.typingTimeout = setTimeout(async () => {

            try {
                await deleteDoc(typingRef);
            } catch { }

        }, 1200);

    };

    // 🔥 MESSAGE ITEM
    const renderItem = useCallback(({ item, index }) => {

        const isMine =
            item.senderId === currentUserId;

        const messageDate =
            item.createdAt?.toDate
                ? item.createdAt.toDate()
                : new Date();

        const currentDate =
            messageDate.toDateString();

        const nextItem = messages[index + 1];

        const nextDate =
            nextItem?.createdAt?.toDate
                ? nextItem.createdAt.toDate().toDateString()
                : null;

        const showDate =
            currentDate !== nextDate;

        return (
            <View>

                {/* DATE */}
                {showDate && (
                    <View
                        style={{
                            alignItems: 'center',
                            marginVertical: 15
                        }}
                    >
                        <View
                            style={{
                                backgroundColor: '#2b2d31',
                                paddingHorizontal: 14,
                                paddingVertical: 6,
                                borderRadius: 20
                            }}
                        >
                            <Text
                                style={{
                                    color: '#b5bac1',
                                    fontSize: 12,
                                    fontWeight: '600'
                                }}
                            >
                                {formatDateLabel(messageDate)}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={{
                    alignSelf: isMine
                        ? 'flex-end'
                        : 'flex-start',

                    marginBottom: 10,
                    maxWidth: '75%'
                }}>

                    <View style={{
                        backgroundColor: isMine
                            ? '#5865f2'
                            : '#2b2d31',

                        paddingVertical: 10,
                        paddingHorizontal: 14,

                        borderRadius: 16
                    }}>

                        <Text style={{
                            color: 'white',
                            fontSize: 15,
                            lineHeight: 22
                        }}>
                            {item.text}
                        </Text>

                    </View>

                </View>

            </View>
        );

    }, [messages]);

    return (
        <SafeAreaView style={{
            flex: 1,
            backgroundColor: '#1e1f22'
        }}>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={
                    Platform.OS === 'ios'
                        ? 'padding'
                        : 'height'
                }
                keyboardVerticalOffset={0}
            >

                {/* HEADER */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: '#2b2d31'
                }}>

                    <TouchableOpacity
                        onPress={goBack}
                    >
                        <Text style={{
                            color: '#5865f2',
                            marginRight: 12
                        }}>
                            ← Back
                        </Text>
                    </TouchableOpacity>

                    <Text style={{
                        color: 'white',
                        fontSize: 18,
                        fontWeight: 'bold'
                    }}>
                        {selectedUser.username}
                    </Text>

                </View>

                {/* MESSAGES */}
                <FlatList
                    ref={flatListRef}

                    data={messages}

                    keyExtractor={item => item.id}

                    renderItem={renderItem}

                    inverted={true}

                    showsVerticalScrollIndicator={false}

                    style={{
                        flex: 1
                    }}

                    contentContainerStyle={{
                        padding: 15,
                        paddingBottom: 20
                    }}

                    removeClippedSubviews={false}

                    initialNumToRender={30}
                    maxToRenderPerBatch={30}
                    windowSize={21}
                />

                {/* TYPING */}
                {typingUser && (
                    <Text style={{
                        color: '#8e9297',
                        paddingLeft: 15,
                        paddingBottom: 5
                    }}>
                        {typingUser} is typing...
                    </Text>
                )}

                {/* INPUT */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    padding: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#2b2d31'
                }}>

                    <TextInput
                        value={message}
                        onChangeText={handleTyping}

                        placeholder="Type message..."
                        placeholderTextColor="gray"

                        multiline

                        style={{
                            flex: 1,

                            backgroundColor: '#2b2d31',
                            color: 'white',

                            paddingHorizontal: 14,
                            paddingVertical: 12,

                            borderRadius: 18,

                            maxHeight: 120,
                            minHeight: 48,

                            fontSize: 15
                        }}
                    />

                    <TouchableOpacity
                        onPress={sendMessage}
                        style={{
                            backgroundColor: '#5865f2',

                            marginLeft: 10,

                            height: 48,
                            minWidth: 70,

                            justifyContent: 'center',
                            alignItems: 'center',

                            borderRadius: 16
                        }}
                    >

                        <Text style={{
                            color: 'white',
                            fontWeight: 'bold'
                        }}>
                            Send
                        </Text>

                    </TouchableOpacity>

                </View>

            </KeyboardAvoidingView>

        </SafeAreaView>
    );
}