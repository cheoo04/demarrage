// src/common/protocol.js

const ACTIONS = {
    // Actions envoyées par le Client
    CLIENT_HELLO: 'client-hello',
    CLIENT_SEND: 'client-send',
    CLIENT_BROADCAST: 'client-broadcast',
    CLIENT_LIST_CLIENTS: 'client-list-clients',
    CLIENT_QUIT: 'client-quit',

    // Actions envoyées par le Serveur
    SERVER_HELLO: 'server-hello',
    SERVER_MESSAGE: 'server-message',
    SERVER_BROADCAST: 'server-broadcast',
    SERVER_LIST_CLIENTS: 'server-list-clients',
    SERVER_QUIT: 'server-quit',
    SERVER_JOIN: 'server-join',
    SERVER_LEAVE: 'server-leave',
    SERVER_ERROR: 'server-error'
};

// On exporte l'objet pour qu'il soit utilisable ailleurs
module.exports = {
    ACTIONS
};