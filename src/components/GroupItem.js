import {
    TouchableOpacity,
    Text,
    StyleSheet
} from "react-native";

export default function GroupItem({
    group,
    selected,
    onPress
}) {

    return (

        <TouchableOpacity
            style={[
                styles.item,
                selected && styles.selected]}
            onPress={onPress}
        >

            <Text style={styles.text}>
                #{group.name}
            </Text>

        </TouchableOpacity>

    );
} const styles = StyleSheet.create({

    item: {
        backgroundColor: "#40444b",
        marginHorizontal: 15,
        marginBottom: 10,
        padding: 18,
        borderRadius: 14
    },

    selected: {
        backgroundColor: "#5865f2"
    }, text: {
        color: "white",
        fontSize: 16,
        fontWeight: "600"
    }

});