// src/common/protocol.js

const ACTIONS = {
    // Actions envoyées par le Client
    CLIENT_HELLO: 'client-hello',
    CLIENT_SEND: 'client-send',
    CLIENT_BROADCAST: 'client-broadcast',
    CLIENT_LIST_CLIENTS: 'client-list-clients',
    CLIENT_QUIT: 'client-quit',
    // Action de Groupe
    CGROUPE: 'cgroupe',
    GROUPS: 'groups',
    JOIN: 'join',
    MEMBERS: 'members',
    LEAVE: 'leave',
    GBROADCAST: 'gbroadcast',
    MSGS: 'msgs',
    INVITE: 'invite',
    KICK: 'kick',
    BAN: 'ban',
    UNBAN: 'unban',
    STATES: 'states',


    // Actions envoyées par le Serveur
    SERVER_HELLO: 'server-hello',
    SERVER_MESSAGE: 'server-message',
    SERVER_BROADCAST: 'server-broadcast',
    SERVER_LIST_CLIENTS: 'server-list-clients',
    SERVER_QUIT: 'server-quit',
    SERVER_JOIN: 'server-join',
    SERVER_LEAVE: 'server-leave',
    SERVER_ERROR: 'server-error',
    //action de groupe
    SERVER_GROUPS_LIST: 'server-groups-list',
    SERVER_GROUP_MEMBERS: 'server-group-members',
    SERVER_GROUP_MSGS: 'server-group-msgs',
    SERVER_GROUP_STATES: 'server-group-states',
    SERVER_GROUP_MESSAGE: 'server-group-message'
};

function sendJson(socket, obj) {
    if (socket.writable) {
        socket.write(JSON.stringify(obj) + '\n');
    }
}

// On exporte l'objet pour qu'il soit utilisable ailleurs
module.exports = {
    ACTIONS, sendJson
};