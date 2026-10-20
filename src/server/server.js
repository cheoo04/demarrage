// Fragment pédagogique : ne pas exposer sur Internet.
var net = require('net');
const debug = require('debug')('server');
const { ACTIONS, sendJson } = require('../common/protocol');
const gestionnaireGroupe = require('./gestionnaireGroupe');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const clients = new Map();


// Trouve la socket d'un utilisateur par son pseudo
function getSocketByPseudo(pseudo) {
    for (const [sock, pers] of clients.entries()) {
        if (pers === pseudo) return sock;
    }
    return null;
}

// Diffuse un message à tout le monde (sauf à une socket si précisé)
function broadcast(payload, saufSocket = null) {
    for (const sock of clients.keys()) {
        if (sock !== saufSocket) {
            sendJson(sock, payload);
        }
    }
}


function traiterAction(socket, msg) {
    // Commande sans présentation
    if (!clients.has(socket) && msg.action !== ACTIONS.CLIENT_HELLO) {
        sendJson(socket, {
            action: ACTIONS.SERVER_ERROR,
            msg: 'Veillez vous presenter !'
        });
        socket.end();
        return;
    }

    switch (msg.action) {
        case ACTIONS.CLIENT_HELLO: {
            const pseudo = msg.sender ? msg.sender.trim() : "";
            if (!pseudo) {
                sendJson(socket, {
                    action: ACTIONS.SERVER_ERROR,
                    msg: 'Veuillez renseigner un nom d"utilisateur'
                });
                socket.end();
                break;
            }

            const nomExiste = Array.from(clients.values()).includes(pseudo);
            if (nomExiste) {
                sendJson(socket, {
                    action: ACTIONS.SERVER_ERROR,
                    msg: 'Cet utilisateur est deja connecté'
                });
                socket.end();
                break;
            }
            
            clients.set(socket, pseudo);
            sendJson(socket, {
                sender: pseudo,
                action: ACTIONS.SERVER_HELLO,
                msg: `Bienvenue ${pseudo}`
            });
            
            broadcast({
                sender: pseudo,
                action: ACTIONS.SERVER_JOIN,
                msg: `${pseudo} est connecté`
            }, socket);
            break;
        }

        case ACTIONS.CLIENT_SEND: {
            const destsocket = getSocketByPseudo(msg.dest);
            
            if (!destsocket) {
                sendJson(socket, {
                    action: ACTIONS.SERVER_ERROR,
                    msg: `L'utilisateur ${msg.dest} est introuvable ou n'est pas connecté`
                });
                break;
            }

            sendJson(destsocket, {
                sender: clients.get(socket),
                msg: msg.msg,
                action: ACTIONS.SERVER_MESSAGE,
            });
            break;
        }
        
        case ACTIONS.CLIENT_BROADCAST: {
            // Diffusion générale simplifiée
            broadcast({
                sender: clients.get(socket),
                msg: msg.msg,
                action: ACTIONS.SERVER_BROADCAST
            }, socket);
            break;
        }
        
        case ACTIONS.CLIENT_LIST_CLIENTS: {
            sendJson(socket, {
                sender: clients.get(socket),
                clients: Array.from(clients.values()),
                action: ACTIONS.SERVER_LIST_CLIENTS
            });
            break;
        }

        case ACTIONS.CLIENT_QUIT: {
            sendJson(socket, {
                sender: clients.get(socket),
                msg: 'Vous êtes deconnecté !',
                action: ACTIONS.SERVER_QUIT
            });
            socket.end();
            break;
        }


        case ACTIONS.CGROUPE: {
            const groupName = msg.group ? msg.group.trim() : "";
            const createur = clients.get(socket);
            const res = gestionnaireGroupe.create(groupName, createur);

            if (res.error) {
                sendJson(socket, { 
                    action: ACTIONS.SERVER_ERROR, 
                    msg: res.error 
                });
            } else {
                sendJson(socket, {
                    action: ACTIONS.SERVER_HELLO, 
                    sender: res.sender, 
                    msg: res.msg 
                });
            }
            break;
        }

        case ACTIONS.GROUPS: {
            sendJson(socket, {
                groups: gestionnaireGroupe.list(),
                action: ACTIONS.SERVER_GROUPS_LIST
            });
            break;
        }
        
        case ACTIONS.JOIN: {
            const groupRequest = (msg.group || "").trim();
            const requester = clients.get(socket);
            const res = gestionnaireGroupe.join(groupRequest, requester);

            if (res.error) {
                sendJson(socket, { action: ACTIONS.SERVER_ERROR, msg: res.error });
            } else {
                sendJson(socket, { action: ACTIONS.SERVER_HELLO, msg: res.msg });
            }
            break;
        }
        
        case ACTIONS.MEMBERS: {
            const membersGroup = (msg.group || '').trim();
            const res = gestionnaireGroupe.getMembers(membersGroup);

            if (res.error) {
                sendJson(socket, { action: ACTIONS.SERVER_ERROR, msg: res.error });
            } else {
                sendJson(socket, {
                    group: res.group,
                    members: res.members,
                    action: ACTIONS.SERVER_GROUP_MEMBERS
                });
            }
            break;
        }
        
        case ACTIONS.LEAVE: {
            const groupLeave = (msg.group || '').trim();
            const quitter = clients.get(socket);
            const res = gestionnaireGroupe.leave(groupLeave, quitter);

            if (res.error) {
                sendJson(socket, { action: ACTIONS.SERVER_ERROR, msg: res.error });
            } else {
                sendJson(socket, { action: ACTIONS.SERVER_HELLO, msg: res.msg });
            }
            break;
        }

        case ACTIONS.GBROADCAST: {
            const sender = clients.get(socket);
            const res = gestionnaireGroupe.addMessage(msg.group, sender, msg.msg);
            if(res.error){
                sendJson(socket, {action: ACTIONS.SERVER_ERROR, msg: res.error});
            } else {
                for (const membre of res.members) {
                    if (membre !== sender) {
                        const sock = getSocketByPseudo(membre);
                        if (sock) {
                            sendJson(sock, {action: ACTIONS.SERVER_GROUP_MESSAGE, group: msg.group, sender: sender, msg:msg.msg});
                        }
                    }
                }
            }
            break;
        }

        case ACTIONS.MSGS: {
            const sender = clients.get(socket);
            const res = gestionnaireGroupe.getMessages(msg.group, sender);
            if (res.error){
                sendJson(socket, {action: ACTIONS.SERVER_ERROR, msg: res.error});
            } else {
                sendJson(socket, {action:ACTIONS.SERVER_GROUP_MSGS, group: res.group, messages: res.messages});
            }
            break;
        }

        case ACTIONS.INVITE: {
            const sender = clients.get(socket);
            const res = gestionnaireGroupe.inviteUser(msg.group, sender, msg.dest);
            if (res.error){
                sendJson(socket, {action: ACTIONS.SERVER_ERROR, msg: res.error});
            } else {
                sendJson(socket, {action: ACTIONS.SERVER_HELLO, msg: `Invitation envoyée à ${msg.dest}`});
                const destsocket = getSocketByPseudo(res.dest);
                if (destsocket){
                    sendJson(destsocket, {action: ACTIONS.SERVER_INVITED, msg: `${sender} vous invite à rejoindre le groupe ${res.group}`});
                }
            }
            break;
        }

        case ACTIONS.KICK: {
            const sender = clients.get(socket);
            const res = gestionnaireGroupe.kickUser(msg.group, sender, msg.dest, msg.reason);
            if(res.error){
                sendJson(socket, {action: ACTIONS.SERVER_ERROR, msg: res.error});
            } else {
                sendJson(socket, {action: ACTIONS.SERVER_HELLO, msg: `${res.dest} a été exclu`});
                const destsocket = getSocketByPseudo(res.dest);
                if (destsocket){
                    sendJson(destsocket, { action: ACTIONS.SERVER_HELLO, msg:`Vous avez été exclu de ${res.group} par ${sender}. Raison : ${res.reason}`});
                }
            }
            break;
        }

        case ACTIONS.BAN: {
            const sender = clients.get(socket);
            const res = gestionnaireGroupe.banUser(msg.group, sender, msg.dest, msg.reason);
            if(res.error){
                sendJson(socket, {action: ACTIONS.SERVER_ERROR, msg: res.error});
            } else {
                sendJson(socket, {action: ACTIONS.SERVER_HELLO, msg: `${res.dest} a été banni`});
                const destsocket = getSocketByPseudo(res.dest);
                if (destsocket){
                    sendJson(destsocket, { action: ACTIONS.SERVER_HELLO, msg:`Vous avez été banni de ${res.group} par ${sender}. Raison : ${res.reason}`});
                }
            }
            break;
        }

        case ACTIONS.UNBAN: {
            const sender = clients.get(socket);
            const res = gestionnaireGroupe.unbanUser(msg.group, sender, msg.dest);
            if(res.error){
                sendJson(socket, {action: ACTIONS.SERVER_ERROR, msg: res.error});
            } else {
                sendJson(socket, {action: ACTIONS.SERVER_HELLO, msg: `${res.dest} n'est plus banni`});
                const destsocket = getSocketByPseudo(res.dest);
                if (destsocket){
                    sendJson(destsocket, { action: ACTIONS.SERVER_HELLO, msg:`Vous n'êtes plus sur la liste des bannis de ${res.group}`});
                }
            }
            break;
        }

        case ACTIONS.STATES: {
            const sender = clients.get(socket);
            const res = gestionnaireGroupe.getStates(msg.group, sender);
            if (res.error) {
                sendJson(socket, { action: ACTIONS.SERVER_ERROR, msg: res.error });
            } else {
                sendJson(socket, {
                    action: ACTIONS.SERVER_GROUP_STATES,
                    group: res.group,
                    states: res.states
                });
            }
            break;
        }
    }
}


var server = net.createServer((socket) => {
    debug(`CONNECTED from ${socket.remoteAddress}:${socket.remotePort}`);
    
    let buffer = '';
    socket.on('data', function (data) {
        buffer += data.toString();
        const messages = buffer.split('\n');
        buffer = messages.pop();

        for (const ligne of messages) {
            if (!ligne.trim()) continue;

            let msg;
            try {
                msg = JSON.parse(ligne);
            } catch (err) {
                debug(`Erreur lors de la lecture du JSON : ${err.message}`);
                continue;
            }

            debug(`DATA received from ${socket.remoteAddress}(${socket.remotePort}) : ${ligne}`);
            traiterAction(socket, msg);
        }
    });

    socket.on('close', () => {
        const pseudo = clients.get(socket);
        clients.delete(socket);
        if (pseudo) {
            gestionnaireGroupe.removeUser(pseudo);

            broadcast({
                sender: pseudo,
                msg: `${pseudo} est deconnecté`,
                action: ACTIONS.SERVER_LEAVE,
            });
        }
        debug(`connexion close from ${socket.remoteAddress} : ${socket.remotePort}`);
    });

    socket.on('error', (err) => {
        debug(`Error socket from ${socket.remoteAddress} : ${socket.remotePort} : ${err.message}`);
    });

}).listen(PORT, HOST, () => {
    debug(`Server listening on ${HOST} : ${PORT}`);
});