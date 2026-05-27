import { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
    addDoc,
    collection,
    onSnapshot,
    query,
    where,
    updateDoc,
    doc,
    setDoc,
    deleteDoc
} from 'firebase/firestore';

import { auth, db } from '../firebase';

export default function GroupChat({ group, goBack }) {

    const [groupData, setGroupData] = useState(group);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [showMembers, setShowMembers] = useState(false);
    const [friends, setFriends] = useState([]);
    const [typingUser, setTypingUser] = useState(null);

    const currentUserId = auth.currentUser.uid;

    const currentUsername =
        auth.currentUser?.displayName ||
        auth.currentUser?.email?.split('@')[0];

    // 🔥 REALTIME GROUP + AUTO EXIT IF REMOVED
    useEffect(() => {
        if (!group?.id) return;

        const unsub = onSnapshot(doc(db, 'groups', group.id), (snap) => {
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() };

                setGroupData(data);

                // ✅ FIX: DEL MENJEHER NQS HIQET NGA GRUPI
                if (!data.members.includes(currentUserId)) {
                    goBack();
                }
            }
        });

        return unsub;
    }, [group]);

    // 🔥 MESSAGES
    useEffect(() => {
        if (!groupData?.id) return;

        const q = query(
            collection(db, 'messages'),
            where('groupId', '==', groupData.id)
        );

        const unsubscribe = onSnapshot(q, snapshot => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            setMessages(msgs);
        });

        return unsubscribe;
    }, [groupData]);

    // 🔥 TYPING
    useEffect(() => {
        if (!groupData?.id) return;

        const unsubscribe = onSnapshot(
            doc(db, 'typing', groupData.id),
            docSnap => {
                if (docSnap.exists()) {
                    const data = docSnap.data();

                    if (data.uid !== currentUserId) {
                        setTypingUser(data.username);
                    } else {
                        setTypingUser(null);
                    }
                } else {
                    setTypingUser(null);
                }
            }
        );

        return unsubscribe;
    }, [groupData]);

    // 🔥 FRIENDS
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'friends'),
            snapshot => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setFriends(
                    data.filter(
                        friend =>
                            friend.user1 === currentUserId ||
                            friend.user2 === currentUserId
                    )
                );
            }
        );

        return unsubscribe;
    }, []);

    // ✅ SEND
    const sendMessage = async () => {
        if (!message.trim()) return;

        // 🔒 MOS LEJO NQS NUK ESHTE MA MEMBER
        if (!groupData.members.includes(currentUserId)) return;

        await addDoc(collection(db, 'messages'), {
            groupId: groupData.id,
            senderId: currentUserId,
            sender: currentUsername,
            text: message,
            createdAt: Date.now()
        });

        await deleteDoc(doc(db, 'typing', groupData.id));
        setMessage('');
    };

    // ✅ TYPING
    const handleTyping = async text => {
        setMessage(text);

        await setDoc(doc(db, 'typing', groupData.id), {
            uid: currentUserId,
            username: currentUsername
        });

        clearTimeout(global.groupTypingTimeout);

        global.groupTypingTimeout = setTimeout(async () => {
            await deleteDoc(doc(db, 'typing', groupData.id));
        }, 1500);
    };

    // ✅ ADD MEMBER
    const addMember = async uid => {
        if (groupData.members.includes(uid)) return;

        await updateDoc(doc(db, 'groups', groupData.id), {
            members: [...groupData.members, uid]
        });
    };

    // ✅ REMOVE MEMBER
    const removeMember = async uid => {
        await updateDoc(doc(db, 'groups', groupData.id), {
            members: groupData.members.filter(id => id !== uid)
        });
    };

    if (!groupData) return null;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#313338' }}>

            {/* HEADER */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 15,
                backgroundColor: '#2b2d31'
            }}>
                <TouchableOpacity onPress={goBack}>
                    <Text style={{ color: '#5865f2' }}>← Back</Text>
                </TouchableOpacity>

                <Text style={{
                    color: 'white',
                    fontSize: 18,
                    fontWeight: 'bold'
                }}>
                    #{groupData.name}
                </Text>

                <TouchableOpacity onPress={() => setShowMembers(true)}>
                    <Text style={{ color: '#5865f2' }}>⚙️</Text>
                </TouchableOpacity>
            </View>

            {/* MESSAGES */}
            <ScrollView style={{ flex: 1, padding: 15 }}>
                {messages.map(msg => {
                    const isMine = msg.senderId === currentUserId;

                    return (
                        <View
                            key={msg.id}
                            style={{
                                alignSelf: isMine ? 'flex-end' : 'flex-start',
                                backgroundColor: isMine ? '#5865f2' : '#2b2d31',
                                padding: 12,
                                borderRadius: 14,
                                marginBottom: 10,
                                maxWidth: '75%'
                            }}
                        >
                            <Text style={{
                                color: 'white',
                                fontWeight: 'bold',
                                marginBottom: 4
                            }}>
                                {msg.sender}
                            </Text>

                            <Text style={{ color: 'white' }}>
                                {msg.text}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>

            {/* TYPING */}
            {typingUser && (
                <Text style={{
                    color: 'gray',
                    paddingLeft: 15,
                    marginBottom: 5
                }}>
                    {typingUser} is typing...
                </Text>
            )}

            {/* INPUT */}
            <View style={{
                flexDirection: 'row',
                padding: 15
            }}>
                <TextInput
                    value={message}
                    onChangeText={handleTyping}
                    placeholder="Type message..."
                    placeholderTextColor="gray"
                    style={{
                        flex: 1,
                        backgroundColor: '#2b2d31',
                        color: 'white',
                        padding: 14,
                        borderRadius: 12
                    }}
                />

                <TouchableOpacity
                    onPress={sendMessage}
                    style={{
                        backgroundColor: '#5865f2',
                        padding: 14,
                        marginLeft: 10,
                        borderRadius: 12
                    }}
                >
                    <Text style={{ color: 'white' }}>Send</Text>
                </TouchableOpacity>
            </View>

            {/* MEMBERS */}
            <Modal visible={showMembers} transparent animationType="slide">
                <View style={{
                    flex: 1,
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: 20
                }}>
                    <View style={{
                        backgroundColor: '#2b2d31',
                        borderRadius: 20,
                        padding: 20
                    }}>

                        <Text style={{
                            color: 'white',
                            fontSize: 20,
                            marginBottom: 10
                        }}>
                            Manage Members
                        </Text>

                        <ScrollView style={{ maxHeight: 300 }}>
                            {friends.map(friend => {

                                const uid =
                                    friend.user1 === currentUserId
                                        ? friend.user2
                                        : friend.user1;

                                const username =
                                    friend.user1 === currentUserId
                                        ? friend.user2Name
                                        : friend.user1Name;

                                const isMember =
                                    groupData.members.includes(uid);

                                return (
                                    <View
                                        key={uid}
                                        style={{
                                            backgroundColor: '#111214',
                                            padding: 12,
                                            borderRadius: 12,
                                            marginBottom: 8,
                                            flexDirection: 'row',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Text style={{ color: 'white' }}>
                                            {username}
                                        </Text>

                                        <TouchableOpacity
                                            onPress={() =>
                                                isMember
                                                    ? removeMember(uid)
                                                    : addMember(uid)
                                            }
                                            style={{
                                                backgroundColor:
                                                    isMember
                                                        ? '#ed4245'
                                                        : '#5865f2',
                                                paddingHorizontal: 14,
                                                paddingVertical: 8,
                                                borderRadius: 10
                                            }}
                                        >
                                            <Text style={{ color: 'white' }}>
                                                {isMember ? 'Remove' : 'Add'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setShowMembers(false)}
                            style={{ marginTop: 10, alignSelf: 'center' }}
                        >
                            <Text style={{ color: '#ed4245' }}>Close</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}