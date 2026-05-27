import { useEffect, useRef, useState } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Dimensions
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { SafeAreaView } from 'react-native-safe-area-context';

import Markdown from 'react-native-markdown-display';

import { useNavigation } from '@react-navigation/native';

import { auth } from '../firebase';

const OPENROUTER_API_KEY =
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

// 🔥 EACH USER HAS OWN STORAGE
const getStorageKey = uid =>
    `AI_CHAT_MESSAGES_${uid}`;

const EXPIRE_TIME =
    24 * 60 * 60 * 1000;

export default function AIScreen({
    goBack
}) {

    const navigation = useNavigation();

    const flatListRef = useRef(null);

    const currentUser =
        auth.currentUser;

    const STORAGE_KEY =
        getStorageKey(
            currentUser?.uid || 'guest'
        );

    const screenWidth =
        Dimensions.get('window').width;

    const isWeb =
        Platform.OS === 'web' &&
        screenWidth >= 900;

    const [messages, setMessages] =
        useState([]);

    const [input, setInput] =
        useState('');

    const [loading, setLoading] =
        useState(false);

    // 🔥 LOAD MESSAGES
    useEffect(() => {

        loadMessages();

    }, []);

    // 🔥 SAVE MESSAGES
    useEffect(() => {

        if (messages.length > 0) {

            AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(messages)
            );
        }

    }, [messages]);

    // 🔥 LOAD + DELETE OLD
    const loadMessages = async () => {

        try {

            const saved =
                await AsyncStorage.getItem(
                    STORAGE_KEY
                );

            if (saved) {

                const parsed =
                    JSON.parse(saved);

                const now =
                    Date.now();

                // 🔥 DELETE AFTER 24H
                const filtered =
                    parsed.filter(
                        m =>
                            now -
                            (m.createdAt || now)
                            <
                            EXPIRE_TIME
                    );

                if (
                    filtered.length > 0
                ) {

                    setMessages(filtered);

                } else {

                    const starter = [
                        {
                            id: '1',
                            role:
                                'assistant',
                            text:
                                'Hello 👋\nHow can I help you today?',
                            createdAt:
                                Date.now()
                        }
                    ];

                    setMessages(starter);

                    await AsyncStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(starter)
                    );
                }

            } else {

                const starter = [
                    {
                        id: '1',
                        role:
                            'assistant',
                        text:
                            'Hello 👋\nHow can I help you today?',
                        createdAt:
                            Date.now()
                    }
                ];

                setMessages(starter);

                await AsyncStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(starter)
                );
            }

        } catch (e) {

            console.log(e);

            setMessages([
                {
                    id: '1',
                    role:
                        'assistant',
                    text:
                        'Hello 👋\nHow can I help you today?',
                    createdAt:
                        Date.now()
                }
            ]);
        }
    };

    // 🔥 WORD BY WORD EFFECT
    const typeMessage = (
        fullText
    ) => {

        const aiId =
            Date.now().toString();

        const words =
            fullText.split(' ');

        let currentText = '';

        const aiMessage = {
            id: aiId,
            role: 'assistant',
            text: '',
            createdAt:
                Date.now()
        };

        setMessages(prev => [
            aiMessage,
            ...prev
        ]);

        let index = 0;

        const interval =
            setInterval(() => {

                if (
                    index >=
                    words.length
                ) {

                    clearInterval(
                        interval
                    );

                    return;
                }

                currentText +=
                    (index === 0
                        ? ''
                        : ' ') +
                    words[index];

                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === aiId
                            ? {
                                ...msg,
                                text:
                                    currentText
                            }
                            : msg
                    )
                );

                index++;

            }, 35);
    };

    // 🔥 SEND MESSAGE
    const sendMessage =
        async () => {

            if (
                !input.trim() ||
                loading
            ) return;

            const userText =
                input.trim();

            const userMessage = {
                id:
                    Date.now().toString(),

                role: 'user',

                text: userText,

                createdAt:
                    Date.now()
            };

            const updatedMessages =
                [
                    userMessage,
                    ...messages
                ];

            setMessages(
                updatedMessages
            );

            setInput('');

            setLoading(true);

            try {

                // 🔥 SEND OLDEST -> NEWEST
                const history =
                    [...updatedMessages]
                        .reverse()
                        .map(
                            msg => ({
                                role:
                                    msg.role,

                                content:
                                    msg.text
                            })
                        );

                const response =
                    await fetch(
                        'https://openrouter.ai/api/v1/chat/completions',
                        {
                            method:
                                'POST',

                            headers: {
                                Authorization:
                                    `Bearer ${OPENROUTER_API_KEY}`,

                                'Content-Type':
                                    'application/json'
                            },

                            body: JSON.stringify(
                                {

                                    model:
                                        'openai/gpt-4o-mini',

                                    messages: [
                                        {
                                            role:
                                                'system',

                                            content:
                                                'You are a helpful AI assistant.'
                                        },

                                        ...history
                                    ]
                                }
                            )
                        }
                    );

                const data =
                    await response.json();

                const aiText =
                    data?.choices?.[0]
                        ?.message
                        ?.content;

                if (!aiText) {

                    setMessages(
                        prev => [
                            {
                                id:
                                    Date.now().toString(),

                                role:
                                    'assistant',

                                text:
                                    'No response from AI.',

                                createdAt:
                                    Date.now()
                            },
                            ...prev
                        ]
                    );

                    setLoading(false);

                    return;
                }

                typeMessage(aiText);

            } catch (e) {

                console.log(e);

                setMessages(prev => [
                    {
                        id:
                            Date.now().toString(),

                        role:
                            'assistant',

                        text:
                            'Error getting AI response.',

                        createdAt:
                            Date.now()
                    },
                    ...prev
                ]);
            }

            setLoading(false);
        };

    // 🔥 BACK
    const handleBack = () => {

        if (goBack) {

            goBack();

        } else {

            navigation.goBack();
        }
    };

    return (

        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor:
                    '#1e1f22'
            }}
            edges={['top']}
        >

            <KeyboardAvoidingView
                style={{
                    flex: 1,
                    backgroundColor:
                        '#1e1f22'
                }}

                behavior={
                    Platform.OS ===
                        'ios'
                        ? 'padding'
                        : 'height'
                }

                keyboardVerticalOffset={
                    0
                }
            >

                {/* 🔥 HEADER */}
                <View
                    style={{
                        paddingHorizontal:
                            15,

                        paddingTop: 10,

                        paddingBottom:
                            15,

                        borderBottomWidth:
                            1,

                        borderBottomColor:
                            '#2b2d31',

                        flexDirection:
                            'row',

                        alignItems:
                            'center'
                    }}
                >

                    {!isWeb && (
                        <TouchableOpacity
                            onPress={
                                handleBack
                            }

                            style={{
                                marginRight:
                                    14
                            }}
                        >

                            <Text
                                style={{
                                    color:
                                        'white',

                                    fontSize:
                                        16,

                                    fontWeight:
                                        '600'
                                }}
                            >
                                ← Back
                            </Text>

                        </TouchableOpacity>
                    )}

                    <Text
                        style={{
                            color:
                                'white',

                            fontSize: 20,

                            fontWeight:
                                'bold'
                        }}
                    >
                        🤖 AI Assistant
                    </Text>

                </View>

                {/* 🔥 CHAT */}
                <FlatList
                    ref={flatListRef}

                    data={messages}

                    inverted={true}

                    keyExtractor={
                        item => item.id
                    }

                    showsVerticalScrollIndicator={
                        false
                    }

                    initialNumToRender={50}
                    maxToRenderPerBatch={50}
                    windowSize={50}
                    removeClippedSubviews={false}

                    contentContainerStyle={{
                        padding: 15,
                        paddingTop: 20,
                        paddingBottom: 10
                    }}

                    renderItem={({
                        item
                    }) => {

                        const isUser =
                            item.role ===
                            'user';

                        return (

                            <View
                                style={{
                                    width:
                                        '100%',

                                    marginBottom:
                                        12,

                                    alignItems:
                                        isUser
                                            ? 'flex-end'
                                            : 'flex-start'
                                }}
                            >

                                <View
                                    style={{
                                        width:
                                            'auto',

                                        maxWidth:
                                            '50%',

                                        backgroundColor:
                                            isUser
                                                ? '#5865f2'
                                                : '#2b2d31',

                                        padding:
                                            14,

                                        borderRadius:
                                            18
                                    }}
                                >

                                    {isUser ? (

                                        <Text
                                            style={{
                                                color:
                                                    'white',

                                                fontSize:
                                                    15,

                                                lineHeight:
                                                    22
                                            }}
                                        >
                                            {item.text}
                                        </Text>

                                    ) : (

                                        <Markdown
                                            style={{
                                                body: {
                                                    color:
                                                        'white',

                                                    fontSize:
                                                        15,

                                                    lineHeight:
                                                        22
                                                },

                                                paragraph:
                                                {
                                                    color:
                                                        'white'
                                                },

                                                heading1:
                                                {
                                                    color:
                                                        'white'
                                                },

                                                heading2:
                                                {
                                                    color:
                                                        'white'
                                                },

                                                heading3:
                                                {
                                                    color:
                                                        'white'
                                                },

                                                strong:
                                                {
                                                    color:
                                                        'white'
                                                },

                                                em: {
                                                    color:
                                                        'white'
                                                },

                                                code_inline:
                                                {
                                                    backgroundColor:
                                                        '#111214',

                                                    color:
                                                        '#57f287',

                                                    paddingHorizontal:
                                                        6,

                                                    paddingVertical:
                                                        2,

                                                    borderRadius:
                                                        6
                                                },

                                                code_block:
                                                {
                                                    backgroundColor:
                                                        '#111214',

                                                    color:
                                                        '#57f287',

                                                    padding:
                                                        12,

                                                    borderRadius:
                                                        12,

                                                    fontSize:
                                                        13
                                                },

                                                fence:
                                                {
                                                    backgroundColor:
                                                        '#111214',

                                                    color:
                                                        '#57f287',

                                                    padding:
                                                        12,

                                                    borderRadius:
                                                        12,

                                                    fontSize:
                                                        13
                                                }
                                            }}
                                        >
                                            {item.text}
                                        </Markdown>

                                    )}

                                </View>

                            </View>
                        );
                    }}
                />

                {/* 🔥 LOADING */}
                {loading && (

                    <View
                        style={{
                            flexDirection:
                                'row',

                            alignItems:
                                'center',

                            paddingHorizontal:
                                15,

                            paddingBottom:
                                10
                        }}
                    >

                        <ActivityIndicator
                            size="small"
                            color="#5865f2"
                        />

                        <Text
                            style={{
                                color:
                                    '#8e9297',

                                marginLeft:
                                    10
                            }}
                        >
                            AI is thinking...
                        </Text>

                    </View>
                )}

                {/* 🔥 INPUT */}
                <View
                    style={{
                        flexDirection:
                            'row',

                        padding: 12,

                        borderTopWidth:
                            1,

                        borderTopColor:
                            '#2b2d31',

                        backgroundColor:
                            '#1e1f22'
                    }}
                >

                    <TextInput
                        value={input}

                        onChangeText={
                            setInput
                        }

                        placeholder="Ask AI..."

                        placeholderTextColor="gray"

                        multiline

                        style={{
                            flex: 1,

                            backgroundColor:
                                '#2b2d31',

                            color:
                                'white',

                            borderRadius:
                                18,

                            padding: 12,

                            maxHeight:
                                120
                        }}
                    />

                    <TouchableOpacity
                        onPress={
                            sendMessage
                        }

                        disabled={
                            loading
                        }

                        style={{
                            backgroundColor:
                                loading
                                    ? '#444'
                                    : '#5865f2',

                            marginLeft:
                                10,

                            borderRadius:
                                14,

                            justifyContent:
                                'center',

                            paddingHorizontal:
                                18
                        }}
                    >

                        <Text
                            style={{
                                color:
                                    'white',

                                fontWeight:
                                    'bold'
                            }}
                        >
                            Send
                        </Text>

                    </TouchableOpacity>

                </View>

            </KeyboardAvoidingView>

        </SafeAreaView>
    );
}