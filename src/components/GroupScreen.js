// screens/GroupScreen.js

import GroupChat from '../components/GroupChat';

export default function GroupScreen({

    route

}) {

    return (

        <GroupChat

            group={
                route.params.group
            }

        />

    );

}