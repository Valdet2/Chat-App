import {
    View,
    Text,
    StyleSheet
} from "react-native";

export default function MessageBubble({
    sender,
    text,
    mine
}) {

    return (<View
        style={[
            styles.container,
            mine
                ? styles.myContainer
                : styles.theirContainer
        ]}
    >

        <Text style={styles.sender}>
            {sender}
        </Text><View
            style={[
                styles.bubble,
                mine
                    ? styles.myBubble
                    : styles.theirBubble
            ]}
        >

            <Text style={styles.message}>
                {text}
            </Text>

        </View></View>

    );
}

const styles = StyleSheet.create({

    container: {
        maxWidth: "75%",
        marginBottom: 14
    },

    myContainer: {
        alignSelf: "flex-end"
    }, theirContainer: {
        alignSelf: "flex-start"
    },

    sender: {
        color: "#aaa",
        fontSize: 12,
        marginBottom: 5,
        paddingHorizontal: 5
    },

    bubble: {
        padding: 12,
        borderRadius: 16
    },

    myBubble: {
        backgroundColor: "#5865f2"
    }, theirBubble: {
        backgroundColor: "#2f3136"
    },

    message: {
        color: "white",
        fontSize: 15,
        lineHeight: 20
    }

});