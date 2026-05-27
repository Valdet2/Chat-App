import { useEffect, useMemo, useRef, useState } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';

import Toast from 'react-native-toast-message';

import {
    collection,
    onSnapshot,
    addDoc,
    doc,
    deleteDoc,
    getDocs,
    query,
    where,
    getDocs as firestoreGetDocs
} from 'firebase/firestore';

import { signOut } from 'firebase/auth';

import {
    auth,
    db
} from '../firebase';

import {
    useNavigation
} from '@react-navigation/native';

export default function Sidebar({
    setSelectedUser,
    setAiOpen,
    setSelectedGroup
}) {

    const navigation = useNavigation();

    const [search, setSearch] = useState('');

    const [friends, setFriends] = useState([]);
    const [groups, setGroups] = useState([]);
    const [requests, setRequests] = useState([]);
    const [messages, setMessages] = useState([]);

    const [allUsers, setAllUsers] = useState([]);

    const [createOpen, setCreateOpen] = useState(false);

    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    const [unread, setUnread] = useState({});

    const notifiedMessages = useRef(new Set());

    const currentUser = auth.currentUser;

    const currentUsername =
        currentUser?.displayName ||
        currentUser?.email?.split('@')[0];

    // 🔥 FRIENDS
    useEffect(() => {

        const unsub = onSnapshot(
            collection(db, 'friends'),
            snap => {

                const data = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setFriends(
                    data.filter(f =>
                        f.user1 === currentUser.uid ||
                        f.user2 === currentUser.uid
                    )
                );
            }
        );

        return unsub;

    }, []);

    // 🔥 GROUPS
    useEffect(() => {

        const unsub = onSnapshot(
            collection(db, 'groups'),
            snap => {

                const data = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setGroups(
                    data.filter(g =>
                        Array.isArray(g.members) &&
                        g.members.includes(currentUser.uid)
                    )
                );
            }
        );

        return unsub;

    }, []);

    // 🔥 REQUESTS
    useEffect(() => {

        const unsub = onSnapshot(
            collection(db, 'friendRequests'),
            snap => {

                const data = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setRequests(
                    data
                        .filter(r => r.to === currentUser.uid)
                        .reverse()
                );
            }
        );

        return unsub;

    }, []);

    // 🔥 LOAD USERS
    useEffect(() => {

        const loadUsers = async () => {

            const snap = await getDocs(
                collection(db, 'users')
            );

            const data = snap.docs
                .map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                }))
                .filter(
                    u => u.uid !== currentUser.uid
                );

            setAllUsers(data);
        };

        loadUsers();

    }, []);

    // 🔥 MESSAGES
    useEffect(() => {

        const unsub = onSnapshot(
            collection(db, 'messages'),
            snap => {

                const data = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setMessages(data);

                const counts = {};

                data.forEach(m => {

                    if (
                        m.sender !== currentUser.uid &&
                        !m.seen
                    ) {

                        counts[m.chatId] =
                            (counts[m.chatId] || 0) + 1;
                    }
                });

                setUnread(counts);
            }
        );

        return unsub;

    }, []);

    // 🔥 TOAST
    useEffect(() => {

        let firstLoad = true;

        const unsub = onSnapshot(
            collection(db, 'messages'),
            snap => {

                if (firstLoad) {

                    snap.docs.forEach(d => {
                        notifiedMessages.current.add(d.id);
                    });

                    firstLoad = false;

                    return;
                }

                snap.docChanges().forEach(change => {

                    if (change.type !== 'added') return;

                    const m = change.doc.data();

                    if (m.sender === currentUser.uid) return;

                    if (m.seen) return;

                    if (
                        notifiedMessages.current.has(
                            change.doc.id
                        )
                    ) return;

                    notifiedMessages.current.add(
                        change.doc.id
                    );

                    Toast.show({
                        type: 'success',
                        text1: m.senderName,
                        text2: m.text,
                        position: 'top',
                        visibilityTime: 3000,
                        topOffset: 50
                    });

                });

            }
        );

        return unsub;

    }, []);

    // 🔥 SEND FRIEND REQUEST
    const sendFriendRequest = async user => {

        try {

            // CHECK IF ALREADY FRIENDS
            const alreadyFriend = friends.some(f =>

                (
                    f.user1 === currentUser.uid &&
                    f.user2 === user.uid
                ) ||

                (
                    f.user2 === currentUser.uid &&
                    f.user1 === user.uid
                )
            );

            if (alreadyFriend) {

                Toast.show({
                    type: 'info',
                    text1: 'Already friends'
                });

                return;
            }

            // CHECK IF REQUEST EXISTS
            const requestQuery = query(
                collection(db, 'friendRequests'),
                where('from', '==', currentUser.uid),
                where('to', '==', user.uid)
            );

            const requestSnap =
                await firestoreGetDocs(requestQuery);

            if (!requestSnap.empty) {

                Toast.show({
                    type: 'info',
                    text1: 'Request already sent'
                });

                return;
            }

            await addDoc(
                collection(db, 'friendRequests'),
                {
                    from: currentUser.uid,
                    to: user.uid,
                    fromUsername: currentUsername
                }
            );

            Toast.show({
                type: 'success',
                text1: 'Friend request sent'
            });

            setSearch('');

        } catch (e) {

            Toast.show({
                type: 'error',
                text1: 'Failed'
            });
        }
    };

    // 🔥 ACCEPT FRIEND
    const acceptFriend = async req => {

        await addDoc(collection(db, 'friends'), {

            user1: req.from,
            user2: currentUser.uid,

            user1Name: req.fromUsername,
            user2Name: currentUsername

        });

        await deleteDoc(
            doc(db, 'friendRequests', req.id)
        );

        Toast.show({
            type: 'success',
            text1: 'Friend added'
        });
    };

    // 🔥 DELETE REQUEST
    const deleteRequest = async req => {

        await deleteDoc(
            doc(db, 'friendRequests', req.id)
        );

        Toast.show({
            type: 'success',
            text1: 'Request deleted'
        });
    };

    // 🔥 TOGGLE MEMBER
    const toggleMember = uid => {

        setSelectedMembers(prev =>

            prev.includes(uid)
                ? prev.filter(id => id !== uid)
                : [...prev, uid]
        );
    };

    // 🔥 CREATE GROUP
    const createGroup = async () => {

        if (!groupName.trim()) {

            Toast.show({
                type: 'error',
                text1: 'Write group name'
            });

            return;
        }

        await addDoc(
            collection(db, 'groups'),
            {
                name: groupName,
                members: [
                    currentUser.uid,
                    ...selectedMembers
                ]
            }
        );

        setCreateOpen(false);

        setGroupName('');
        setSelectedMembers([]);

        Toast.show({
            type: 'success',
            text1: 'Group created'
        });
    };

    // 🔥 DELETE CHAT / GROUP
    const deleteChat = async chat => {

        Alert.alert(
            'Delete',
            'Delete this chat from list?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },

                {
                    text: 'Delete',

                    style: 'destructive',

                    onPress: async () => {

                        try {

                            // 🔥 GROUP
                            if (chat.type === 'group') {

                                await deleteDoc(
                                    doc(
                                        db,
                                        'groups',
                                        chat.data.id
                                    )
                                );

                                const messagesQuery = query(
                                    collection(db, 'messages'),
                                    where(
                                        'chatId',
                                        '==',
                                        chat.data.id
                                    )
                                );

                                const snap =
                                    await firestoreGetDocs(
                                        messagesQuery
                                    );

                                for (const d of snap.docs) {

                                    await deleteDoc(
                                        doc(
                                            db,
                                            'messages',
                                            d.id
                                        )
                                    );
                                }

                            } else {

                                // 🔥 FRIEND CHAT
                                const friendDoc =
                                    friends.find(f => {

                                        return (
                                            (
                                                f.user1 === currentUser.uid &&
                                                f.user2 === chat.data.uid
                                            ) ||

                                            (
                                                f.user2 === currentUser.uid &&
                                                f.user1 === chat.data.uid
                                            )
                                        );
                                    });

                                if (friendDoc) {

                                    await deleteDoc(
                                        doc(
                                            db,
                                            'friends',
                                            friendDoc.id
                                        )
                                    );
                                }

                                const messagesQuery = query(
                                    collection(db, 'messages'),
                                    where(
                                        'chatId',
                                        '==',
                                        chat.chatId
                                    )
                                );

                                const snap =
                                    await firestoreGetDocs(
                                        messagesQuery
                                    );

                                for (const d of snap.docs) {

                                    await deleteDoc(
                                        doc(
                                            db,
                                            'messages',
                                            d.id
                                        )
                                    );
                                }
                            }

                            Toast.show({
                                type: 'success',
                                text1: 'Deleted'
                            });

                        } catch (e) {

                            Toast.show({
                                type: 'error',
                                text1: 'Delete failed'
                            });
                        }
                    }
                }
            ]
        );
    };

    // 🔥 LOGOUT
    const handleLogout = async () => {

        await signOut(auth);

        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    };

    // 🔥 CHAT LIST
    const chatList = useMemo(() => {

        const friendChats = friends.map(friend => {

            const other =
                friend.user1 === currentUser.uid
                    ? {
                        uid: friend.user2,
                        username: friend.user2Name
                    }
                    : {
                        uid: friend.user1,
                        username: friend.user1Name
                    };

            const chatId =
                [currentUser.uid, other.uid]
                    .sort()
                    .join('_');

            const lastMessage = messages
                .filter(m => m.chatId === chatId)
                .sort((a, b) =>
                    (b.createdAt?.seconds || 0) -
                    (a.createdAt?.seconds || 0)
                )[0];

            return {
                type: 'friend',
                data: other,
                chatId,
                lastMessage
            };

        });

        const groupChats = groups.map(group => {

            const lastMessage = messages
                .filter(m => m.chatId === group.id)
                .sort((a, b) =>
                    (b.createdAt?.seconds || 0) -
                    (a.createdAt?.seconds || 0)
                )[0];

            return {
                type: 'group',
                data: group,
                chatId: group.id,
                lastMessage
            };

        });

        return [...friendChats, ...groupChats]
            .sort((a, b) =>
                (b.lastMessage?.createdAt?.seconds || 0) -
                (a.lastMessage?.createdAt?.seconds || 0)
            );

    }, [friends, groups, messages]);

    // 🔥 SEARCH USERS
    const searchResults =
        search.trim().length > 0
            ? allUsers.filter(user =>

                user.username
                    ?.toLowerCase()
                    .includes(
                        search.toLowerCase()
                    )
            )
            : [];

    return (

        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={
                Platform.OS === 'ios'
                    ? 'padding'
                    : undefined
            }
        >

            <ScrollView
                style={{
                    flex: 1,
                    backgroundColor: '#202225'
                }}

                contentContainerStyle={{
                    paddingTop: 40,
                    paddingHorizontal: 15,
                    paddingBottom: 40
                }}

                keyboardShouldPersistTaps="handled"

                showsVerticalScrollIndicator={false}
            >

                {/* HEADER */}
                <View style={{
                    backgroundColor: '#2b2d31',
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 15
                }}>

                    <Text style={{
                        color: 'white',
                        fontSize: 20,
                        fontWeight: 'bold'
                    }}>
                        {currentUsername}
                    </Text>

                    <TouchableOpacity
                        onPress={() =>
                            navigation.navigate('Profile')
                        }
                        style={{
                            backgroundColor: '#5865f2',
                            marginTop: 10,
                            padding: 10,
                            borderRadius: 12
                        }}
                    >

                        <Text style={{
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            Profile
                        </Text>

                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleLogout}
                        style={{
                            backgroundColor: '#ed4245',
                            marginTop: 10,
                            padding: 10,
                            borderRadius: 12
                        }}
                    >

                        <Text style={{
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            Logout
                        </Text>

                    </TouchableOpacity>

                </View>

                {/* SEARCH */}
                <TextInput
                    placeholder="Search users..."
                    placeholderTextColor="gray"

                    value={search}

                    onChangeText={setSearch}

                    style={{
                        backgroundColor: '#111214',
                        color: 'white',
                        padding: 14,
                        borderRadius: 14
                    }}
                />

                {/* SEARCH RESULTS */}
                {search.trim() !== '' && (

                    <View style={{
                        marginTop: 10
                    }}>

                        {searchResults.map(user => (

                            <View
                                key={user.uid}

                                style={{
                                    backgroundColor: '#2b2d31',
                                    padding: 14,
                                    borderRadius: 14,
                                    marginTop: 8,

                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >

                                <Text style={{
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}>
                                    {user.username}
                                </Text>

                                <TouchableOpacity
                                    onPress={() =>
                                        sendFriendRequest(user)
                                    }

                                    style={{
                                        backgroundColor: '#5865f2',
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 10
                                    }}
                                >

                                    <Text style={{
                                        color: 'white',
                                        fontWeight: 'bold'
                                    }}>
                                        Add
                                    </Text>

                                </TouchableOpacity>

                            </View>

                        ))}

                    </View>

                )}

                {/* REQUESTS */}
                <Text style={{
                    color: '#8e9297',
                    marginTop: 14
                }}>
                    Requests
                </Text>

                {requests.map(req => (

                    <View
                        key={req.id}

                        style={{
                            backgroundColor: '#2b2d31',
                            padding: 12,
                            borderRadius: 12,
                            marginTop: 8,

                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >

                        <Text style={{
                            color: 'white'
                        }}>
                            {req.fromUsername}
                        </Text>

                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 14
                        }}>

                            <TouchableOpacity
                                onPress={() =>
                                    acceptFriend(req)
                                }
                            >

                                <Text style={{
                                    color: '#5865f2',
                                    fontWeight: 'bold'
                                }}>
                                    Accept
                                </Text>

                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() =>
                                    deleteRequest(req)
                                }
                            >

                                <Text style={{
                                    color: '#ed4245',
                                    fontWeight: 'bold'
                                }}>
                                    Delete
                                </Text>

                            </TouchableOpacity>

                        </View>

                    </View>

                ))}

                {/* CREATE GROUP */}
                <TouchableOpacity
                    onPress={() =>
                        setCreateOpen(true)
                    }

                    style={{
                        backgroundColor: '#5865f2',
                        padding: 13,
                        borderRadius: 14,
                        marginTop: 14
                    }}
                >

                    <Text style={{
                        color: 'white',
                        textAlign: 'center',
                        fontWeight: 'bold'
                    }}>
                        + Create Group
                    </Text>

                </TouchableOpacity>

                {/* CHATS */}
                <Text style={{
                    color: '#8e9297',
                    marginTop: 18
                }}>
                    Chats
                </Text>

                {/* AI */}
                <TouchableOpacity
                    onPress={() => {

                        setSelectedUser(null);

                        setSelectedGroup(null);

                        setAiOpen(true);

                    }}

                    style={{
                        backgroundColor: '#2b2d31',
                        padding: 14,
                        borderRadius: 14,
                        marginTop: 10
                    }}
                >

                    <Text style={{
                        color: 'white',
                        fontWeight: 'bold'
                    }}>
                        🤖 AI Assistant
                    </Text>

                </TouchableOpacity>

                <Text style={{
                    color: '#8e9297',
                    marginTop: 18
                }}>
                    Messages
                </Text>

                {/* CHAT LIST */}
                {chatList.map(chat => {

                    const isGroup =
                        chat.type === 'group';

                    const name =
                        isGroup
                            ? `#${chat.data.name}`
                            : chat.data.username;

                    const lastMessage =
                        chat.lastMessage;

                    const lastText =
                        lastMessage?.text ||
                        'No messages yet';

                    const sender =
                        lastMessage?.senderName || '';

                    return (

                        <TouchableOpacity
                            key={chat.chatId}

                            onPress={() => {

                                setAiOpen(false);

                                if (isGroup) {

                                    setSelectedUser(null);

                                    setSelectedGroup(
                                        chat.data
                                    );

                                } else {

                                    setSelectedGroup(null);

                                    setSelectedUser(
                                        chat.data
                                    );
                                }
                            }}

                            onLongPress={() =>
                                deleteChat(chat)
                            }

                            delayLongPress={400}

                            style={{
                                backgroundColor: '#2b2d31',

                                padding: 14,

                                borderRadius: 14,

                                marginTop: 10,

                                flexDirection: 'row',

                                justifyContent: 'space-between',

                                alignItems: 'center'
                            }}
                        >

                            <View style={{
                                flex: 1,
                                marginRight: 10
                            }}>

                                <Text style={{
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: 15
                                }}>
                                    {name}
                                </Text>

                                <Text
                                    numberOfLines={1}

                                    style={{
                                        color: '#b5bac1',
                                        marginTop: 4,
                                        fontSize: 12
                                    }}
                                >

                                    {isGroup && sender
                                        ? `${sender}: ${lastText}`
                                        : lastText}

                                </Text>

                            </View>

                            {unread[chat.chatId] > 0 && (

                                <View style={{
                                    backgroundColor: 'red',
                                    borderRadius: 99,

                                    minWidth: 22,
                                    height: 22,

                                    justifyContent: 'center',
                                    alignItems: 'center',

                                    paddingHorizontal: 6
                                }}>

                                    <Text style={{
                                        color: 'white',
                                        fontSize: 12,
                                        fontWeight: 'bold'
                                    }}>
                                        {unread[chat.chatId]}
                                    </Text>

                                </View>

                            )}

                        </TouchableOpacity>

                    );
                })}

                <Toast />

            </ScrollView>

            {/* CREATE GROUP MODAL */}
            <Modal
                visible={createOpen}
                transparent
                animationType="fade"
            >

                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20
                }}>

                    <View style={{
                        width: '100%',
                        maxWidth: 420,
                        backgroundColor: '#2b2d31',
                        borderRadius: 24,
                        padding: 20
                    }}>

                        <Text style={{
                            color: 'white',
                            fontSize: 22,
                            fontWeight: 'bold',
                            marginBottom: 15,
                            textAlign: 'center'
                        }}>
                            Create Group
                        </Text>

                        <TextInput
                            placeholder="Group name"
                            placeholderTextColor="gray"

                            value={groupName}

                            onChangeText={setGroupName}

                            style={{
                                backgroundColor: '#111214',
                                color: 'white',
                                padding: 14,
                                borderRadius: 14,
                                marginBottom: 15
                            }}
                        />

                        <ScrollView
                            style={{
                                maxHeight: 250
                            }}
                        >

                            {friends.map(friend => {

                                const other =
                                    friend.user1 === currentUser.uid
                                        ? {
                                            uid: friend.user2,
                                            username: friend.user2Name
                                        }
                                        : {
                                            uid: friend.user1,
                                            username: friend.user1Name
                                        };

                                const selected =
                                    selectedMembers.includes(other.uid);

                                return (

                                    <TouchableOpacity
                                        key={other.uid}

                                        onPress={() =>
                                            toggleMember(other.uid)
                                        }

                                        style={{
                                            backgroundColor:
                                                selected
                                                    ? '#5865f2'
                                                    : '#1e1f22',

                                            padding: 14,
                                            borderRadius: 14,
                                            marginBottom: 10
                                        }}
                                    >

                                        <Text style={{
                                            color: 'white'
                                        }}>
                                            {other.username}
                                        </Text>

                                    </TouchableOpacity>

                                );
                            })}

                        </ScrollView>

                        <TouchableOpacity
                            onPress={createGroup}

                            style={{
                                backgroundColor: '#5865f2',
                                padding: 14,
                                borderRadius: 14,
                                marginTop: 15
                            }}
                        >

                            <Text style={{
                                color: 'white',
                                textAlign: 'center',
                                fontWeight: 'bold'
                            }}>
                                Create
                            </Text>

                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() =>
                                setCreateOpen(false)
                            }

                            style={{
                                backgroundColor: '#1e1f22',
                                padding: 14,
                                borderRadius: 14,
                                marginTop: 10
                            }}
                        >

                            <Text style={{
                                color: 'white',
                                textAlign: 'center'
                            }}>
                                Cancel
                            </Text>

                        </TouchableOpacity>

                    </View>

                </View>

            </Modal>

        </KeyboardAvoidingView>
    );
}