// ========================= CHATSCREEN =========================

import { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    FlatList,
    Modal,
    ScrollView,
    InteractionManager,
    Platform
} from 'react-native';

import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    doc,
    updateDoc,
    setDoc,
    deleteDoc,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen({
    selectedUser,
    selectedGroup,
    goBack,
    isWeb
}) {

    const flatListRef = useRef(null);
    const typingTimeout = useRef(null);

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);

    // 🔥 REPLY
    const [replyingTo, setReplyingTo] = useState(null);

    const [groupData, setGroupData] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [settingsOpen, setSettingsOpen] = useState(false);

    const [users, setUsers] = useState([]);
    const [friends, setFriends] = useState([]);

    const currentUser = auth.currentUser;

    const chatId = selectedUser
        ? [currentUser.uid, selectedUser.uid].sort().join('_')
        : selectedGroup?.id;

    const groupMembers = groupData?.members || [];

    // ---------------- USERS ----------------
    useEffect(() => {

        const unsub = onSnapshot(collection(db, 'users'), snap => {

            setUsers(
                snap.docs.map(d => ({
                    uid: d.id,
                    ...d.data()
                }))
            );
        });

        return unsub;

    }, []);

    // ---------------- FRIENDS ----------------
    useEffect(() => {

        const unsub = onSnapshot(collection(db, 'friends'), snap => {

            const data = snap.docs.map(d => d.data());

            const myFriends = data
                .filter(f =>
                    f.user1 === currentUser.uid ||
                    f.user2 === currentUser.uid
                )
                .map(f =>
                    f.user1 === currentUser.uid
                        ? f.user2
                        : f.user1
                );

            setFriends(myFriends);
        });

        return unsub;

    }, []);

    // ---------------- GROUP ----------------
    useEffect(() => {

        if (!selectedGroup) return;

        const unsub = onSnapshot(
            doc(db, 'groups', selectedGroup.id),
            snap => {

                const data = snap.data();

                setGroupData(data);
                setGroupName(data?.name || '');
            }
        );

        return unsub;

    }, [selectedGroup]);

    // ---------------- REALTIME MESSAGES ----------------
    useEffect(() => {

        if (!chatId) return;

        const q = query(
            collection(db, 'messages'),
            where('chatId', '==', chatId)
        );

        const unsub = onSnapshot(q, snapshot => {

            const msgs = snapshot.docs
                .map(d => ({
                    id: d.id,
                    ...d.data()
                }))
                .sort((a, b) => {

                    const aTime =
                        a.createdAt?.seconds ||
                        a.createdAt?.toMillis?.() ||
                        0;

                    const bTime =
                        b.createdAt?.seconds ||
                        b.createdAt?.toMillis?.() ||
                        0;

                    return bTime - aTime;
                });

            setMessages(msgs);

            // 🔥 AUTO SEEN
            const unseen = msgs.filter(
                m =>
                    m.sender !== currentUser.uid &&
                    !m.seen
            );

            unseen.forEach(m => {

                if (
                    m.sender !== currentUser.uid &&
                    !m.seen
                ) {

                    updateDoc(
                        doc(db, 'messages', m.id),
                        {
                            seen: true
                        }
                    ).catch(() => { });
                }
            });

        });

        return unsub;

    }, [chatId]);

    // ---------------- TYPING ----------------
    useEffect(() => {

        if (!chatId) return;

        const q = query(
            collection(db, 'typing'),
            where('chatId', '==', chatId)
        );

        const unsub = onSnapshot(q, snap => {

            const typing = snap.docs
                .map(d => d.data())
                .filter(d => d.uid !== currentUser.uid)
                .map(d => d.username);

            setTypingUsers(typing);
        });

        return unsub;

    }, [chatId]);

    // ---------------- SEND MESSAGE ----------------
    const sendMessage = async () => {

        if (!message.trim()) return;

        const text = message.trim();

        setMessage('');

        await addDoc(collection(db, 'messages'), {
            text,
            sender: currentUser.uid,
            senderName:
                currentUser.displayName ||
                currentUser.email,

            chatId,

            createdAt:
                serverTimestamp(),

            seen: false,
            delivered: true,

            replyTo: replyingTo
                ? {
                    id: replyingTo.id,
                    text: replyingTo.text,
                    senderName:
                        replyingTo.senderName
                }
                : null
        });

        // 🔥 PRIVATE CHAT ONLY
        if (selectedUser) {

            try {

                const receiverDoc =
                    await getDoc(
                        doc(
                            db,
                            'users',
                            selectedUser.uid
                        )
                    );

                const oneSignalId =
                    receiverDoc.data()
                        ?.oneSignalId;

                if (oneSignalId && oneSignalId.length > 5) {

                    await fetch(
                        'https://onesignal.com/api/v1/notifications',
                        {
                            method: 'POST',

                            headers: {
                                'Content-Type':
                                    'application/json',

                                Authorization:
                                    'os_v2_app_3se2qekfffbe7juvznejkar2c7mgjfamzcwe73nmefktmfm2gd2p2d7jt7psggfi6gfah4d6cmhfiv3fi4lxlo7mvisgocly3ys6w2q'
                            },

                            body: JSON.stringify({

                                app_id:
                                    'dc89a811-4529-424f-a695-cb4895023a17',

                                include_subscription_ids: [
                                    oneSignalId
                                ],

                                headings: {
                                    en:
                                        currentUser.displayName ||
                                        'New Message'
                                },

                                contents: {
                                    en: text
                                }
                            })
                        }
                    );
                }

            } catch (e) {

                console.log(e);
            }
        }

        setReplyingTo(null);

        await deleteDoc(
            doc(
                db,
                'typing',
                `${chatId}_${currentUser.uid}`
            )
        ).catch(() => { });
    };


    // ---------------- HANDLE TYPING ----------------
    const handleTyping = async (text) => {

        setMessage(text);

        if (!chatId) return;

        const typingRef = doc(
            db,
            'typing',
            `${chatId}_${currentUser.uid}`
        );

        // REMOVE TYPING
        if (!text.trim()) {

            await deleteDoc(typingRef)
                .catch(() => { });

            return;
        }

        // SET TYPING
        await setDoc(typingRef, {
            uid: currentUser.uid,
            username:
                currentUser.displayName ||
                currentUser.email.split('@')[0],
            chatId,
            typing: true,
            updatedAt: Date.now()
        });

        // 🔥 AUTO REMOVE
        if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
        }

        typingTimeout.current = setTimeout(() => {

            deleteDoc(typingRef)
                .catch(() => { });

        }, 1000);
    };

    // ---------------- HELPERS ----------------
    const getUsername = uid =>
        users.find(u => u.uid === uid)?.username || 'User';

    const availableToAdd = friends.filter(uid =>
        !groupMembers.includes(uid)
    );

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

    // ---------------- GROUP ACTIONS ----------------
    const addUser = async uid => {

        await updateDoc(
            doc(db, 'groups', selectedGroup.id),
            {
                members: [...groupMembers, uid]
            }
        );
    };

    const removeUser = async uid => {

        await updateDoc(
            doc(db, 'groups', selectedGroup.id),
            {
                members: groupMembers.filter(
                    id => id !== uid
                )
            }
        );
    };

    const renameGroup = async () => {

        await updateDoc(
            doc(db, 'groups', selectedGroup.id),
            {
                name: groupName
            }
        );
    };

    // ---------------- BACK ----------------
    const handleBack = () => {

        InteractionManager.runAfterInteractions(() => {

            if (goBack) {
                goBack();
            }

        });
    };

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: '#1e1f22'
            }}
        >

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >

                {/* HEADER */}
                {!isWeb && (
                    <TouchableOpacity
                        onPress={handleBack}
                        style={{
                            padding: 15
                        }}
                    >
                        <Text
                            style={{
                                color: 'white'
                            }}
                        >
                            ← Back
                        </Text>
                    </TouchableOpacity>
                )}

                <View
                    style={{
                        padding: 15,
                        borderBottomWidth: 1,
                        borderBottomColor: '#2b2d31',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >

                    <Text
                        style={{
                            color: 'white',
                            fontSize: 18,
                            fontWeight: 'bold'
                        }}
                    >
                        {selectedUser
                            ? selectedUser.username
                            : `#${groupData?.name}`}
                    </Text>

                    {selectedGroup && (
                        <TouchableOpacity
                            onPress={() =>
                                setSettingsOpen(true)
                            }
                        >
                            <Text
                                style={{
                                    color: 'white',
                                    fontSize: 18
                                }}
                            >
                                ⚙️
                            </Text>
                        </TouchableOpacity>
                    )}

                </View>

                {/* MESSAGES */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    inverted={true}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}

                    contentContainerStyle={{
                        padding: 15,
                        paddingTop: 20,
                        paddingBottom: 10
                    }}

                    initialNumToRender={50}
                    maxToRenderPerBatch={50}
                    windowSize={50}
                    removeClippedSubviews={false}

                    renderItem={({ item, index }) => {

                        const isMe =
                            item.sender === currentUser.uid;

                        const messageDate =
                            item.createdAt?.toDate
                                ? item.createdAt.toDate()
                                : new Date();

                        const time =
                            messageDate.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            });

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

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onLongPress={() =>
                                        setReplyingTo(item)
                                    }
                                    style={{
                                        alignSelf: isMe
                                            ? 'flex-end'
                                            : 'flex-start',

                                        marginBottom: 10,
                                        maxWidth: '50%',
                                        minWidth: 40,

                                    }}
                                >

                                    {!isMe && selectedGroup && (
                                        <Text
                                            style={{
                                                color: '#8e9297',
                                                marginBottom: 4,
                                                marginLeft: 8,
                                                fontSize: 12
                                            }}
                                        >
                                            {item.senderName}
                                        </Text>
                                    )}

                                    <View
                                        style={{
                                            backgroundColor: isMe
                                                ? '#5865f2'
                                                : '#2b2d31',

                                            padding: 10,
                                            borderRadius: 18
                                        }}
                                    >

                                        {/* REPLY */}
                                        {item.replyTo && (

                                            <View
                                                style={{
                                                    borderLeftWidth: 3,
                                                    borderLeftColor: '#99aab5',
                                                    paddingLeft: 8,
                                                    marginBottom: 8,
                                                    opacity: 0.85
                                                }}
                                            >

                                                <Text
                                                    style={{
                                                        color: '#99aab5',
                                                        fontSize: 12,
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    {item.replyTo.senderName}
                                                </Text>

                                                <Text
                                                    numberOfLines={1}
                                                    style={{
                                                        color: 'white',
                                                        fontSize: 12
                                                    }}
                                                >
                                                    {item.replyTo.text}
                                                </Text>

                                            </View>
                                        )}

                                        <Text
                                            style={{
                                                color: 'white'
                                            }}
                                        >
                                            {item.text}
                                        </Text>

                                    </View>

                                    {/* TIME + SEEN */}
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginTop: 2
                                        }}
                                    >

                                        <Text
                                            style={{
                                                color: '#8e9297',
                                                fontSize: 10
                                            }}
                                        >
                                            {time}
                                        </Text>

                                        {/* 🔥 SHOW SEEN ONLY FOR LAST MY MESSAGE */}
                                        {isMe &&
                                            index === 0 && (
                                                <Text
                                                    style={{
                                                        color: '#8e9297',
                                                        fontSize: 10,
                                                        marginLeft: 6
                                                    }}
                                                >
                                                    {item.seen
                                                        ? 'Seen 👁️'
                                                        : 'Delivered ✓'}
                                                </Text>
                                            )}

                                    </View>

                                </TouchableOpacity>

                            </View>
                        );
                    }}
                />

                {/* TYPING */}
                {typingUsers.length > 0 && (
                    <Text
                        style={{
                            color: '#8e9297',
                            paddingHorizontal: 15,
                            paddingBottom: 8
                        }}
                    >
                        {typingUsers.join(', ')}
                        {' '}is typing...
                    </Text>
                )}

                {/* REPLY BAR */}
                {replyingTo && (

                    <View
                        style={{
                            paddingHorizontal: 15,
                            paddingVertical: 10,
                            backgroundColor: '#2b2d31',
                            borderTopWidth: 1,
                            borderTopColor: '#3a3c41'
                        }}
                    >

                        <Text
                            style={{
                                color: '#5865f2',
                                fontWeight: 'bold',
                                marginBottom: 3
                            }}
                        >
                            Replying to {replyingTo.senderName}
                        </Text>

                        <Text
                            numberOfLines={1}
                            style={{
                                color: 'white'
                            }}
                        >
                            {replyingTo.text}
                        </Text>

                        <TouchableOpacity
                            onPress={() =>
                                setReplyingTo(null)
                            }
                        >
                            <Text
                                style={{
                                    color: 'red',
                                    marginTop: 5
                                }}
                            >
                                Cancel
                            </Text>
                        </TouchableOpacity>

                    </View>
                )}

                {/* INPUT */}
                <View
                    style={{
                        flexDirection: 'row',
                        padding: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#2b2d31'
                    }}
                >

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
                            borderRadius: 18,
                            padding: 12,
                            maxHeight: 120
                        }}
                    />

                    <TouchableOpacity
                        onPress={sendMessage}
                    >
                        <Text
                            style={{
                                backgroundColor: '#5865f2',
                                color: 'white',
                                padding: 12,
                                marginLeft: 10,
                                borderRadius: 12
                            }}
                        >
                            Send
                        </Text>
                    </TouchableOpacity>

                </View>

                {/* 🔥 GROUP SETTINGS MODAL */}
                <Modal
                    visible={settingsOpen}
                    animationType="slide"
                    transparent
                    onRequestClose={() =>
                        setSettingsOpen(false)
                    }
                >

                    <View
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            justifyContent: 'center',
                            alignItems: 'center', // 🔥 KJO E QET NË MES
                            padding: 20
                        }}
                    >

                        <View
                            style={{
                                backgroundColor: '#1e1f22',
                                borderRadius: 20,
                                padding: 20,

                                width: Platform.OS === 'web' ? 420 : '100%', // 🔥 WEB SMALL BOX
                                maxHeight: '85%',

                                shadowColor: '#000',
                                shadowOpacity: 0.5,
                                shadowRadius: 20,
                                elevation: 10
                            }}
                        >

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                            >

                                {/* TITLE */}
                                <Text
                                    style={{
                                        color: 'white',
                                        fontSize: 22,
                                        fontWeight: 'bold',
                                        marginBottom: 20
                                    }}
                                >
                                    Group Settings
                                </Text>

                                {/* RENAME */}
                                <Text
                                    style={{
                                        color: '#b5bac1',
                                        marginBottom: 8
                                    }}
                                >
                                    Rename Group
                                </Text>

                                <View
                                    style={{
                                        flexDirection: 'row',
                                        marginBottom: 25
                                    }}
                                >

                                    <TextInput
                                        value={groupName}
                                        onChangeText={setGroupName}
                                        placeholder="Group name"
                                        placeholderTextColor="gray"
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#2b2d31',
                                            color: 'white',
                                            padding: 12,
                                            borderRadius: 12
                                        }}
                                    />

                                    <TouchableOpacity
                                        onPress={renameGroup}
                                        style={{
                                            marginLeft: 10,
                                            backgroundColor: '#5865f2',
                                            paddingHorizontal: 16,
                                            justifyContent: 'center',
                                            borderRadius: 12
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: 'white',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Save
                                        </Text>
                                    </TouchableOpacity>

                                </View>

                                {/* MEMBERS */}
                                <Text
                                    style={{
                                        color: 'white',
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        marginBottom: 15
                                    }}
                                >
                                    Members
                                </Text>

                                {groupMembers.map(uid => (

                                    <View
                                        key={uid}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: '#2b2d31',
                                            padding: 12,
                                            borderRadius: 12,
                                            marginBottom: 10
                                        }}
                                    >

                                        <Text
                                            style={{
                                                color: 'white'
                                            }}
                                        >
                                            {getUsername(uid)}
                                        </Text>

                                        {uid !== currentUser.uid && (
                                            <TouchableOpacity
                                                onPress={() =>
                                                    removeUser(uid)
                                                }
                                            >
                                                <Text
                                                    style={{
                                                        color: 'red',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    Remove
                                                </Text>
                                            </TouchableOpacity>
                                        )}

                                    </View>

                                ))}

                                {/* ADD FRIENDS */}
                                <Text
                                    style={{
                                        color: 'white',
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        marginTop: 25,
                                        marginBottom: 15
                                    }}
                                >
                                    Add Friends
                                </Text>

                                {availableToAdd.length === 0 && (
                                    <Text
                                        style={{
                                            color: '#8e9297'
                                        }}
                                    >
                                        No friends available
                                    </Text>
                                )}

                                {availableToAdd.map(uid => (

                                    <View
                                        key={uid}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: '#2b2d31',
                                            padding: 12,
                                            borderRadius: 12,
                                            marginBottom: 10
                                        }}
                                    >

                                        <Text
                                            style={{
                                                color: 'white'
                                            }}
                                        >
                                            {getUsername(uid)}
                                        </Text>

                                        <TouchableOpacity
                                            onPress={() =>
                                                addUser(uid)
                                            }
                                        >
                                            <Text
                                                style={{
                                                    color: '#57f287',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                Add
                                            </Text>
                                        </TouchableOpacity>

                                    </View>

                                ))}

                                {/* CLOSE */}
                                <TouchableOpacity
                                    onPress={() =>
                                        setSettingsOpen(false)
                                    }
                                    style={{
                                        backgroundColor: '#5865f2',
                                        padding: 14,
                                        borderRadius: 14,
                                        marginTop: 25,
                                        alignItems: 'center'
                                    }}
                                >

                                    <Text
                                        style={{
                                            color: 'white',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Close
                                    </Text>

                                </TouchableOpacity>

                            </ScrollView>

                        </View>

                    </View>

                </Modal>

            </KeyboardAvoidingView>

        </SafeAreaView>
    );
}