const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendNotification =
    functions.firestore
        .onDocumentCreated(
            'messages/{messageId}',
            async (event) => {

                const message = event.data.data();

                const usersRef = admin
                    .firestore()
                    .collection('users');

                const snapshot =
                    await usersRef.get();

                snapshot.forEach(async docSnap => {

                    const user = docSnap.data();

                    if (
                        user.uid !== message.sender &&
                        user.pushToken
                    ) {

                        await fetch(
                            'https://exp.host/--/api/v2/push/send',
                            {
                                method: 'POST',
                                headers: {
                                    Accept: 'application/json',
                                    'Content-Type':
                                        'application/json',
                                },
                                body: JSON.stringify({
                                    to: user.pushToken,
                                    sound: 'default',
                                    title:
                                        message.senderName,
                                    body: message.text,
                                }),
                            }
                        );
                    }
                });

            });