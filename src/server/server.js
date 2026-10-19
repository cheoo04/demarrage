// Fragment pédagogique : ne pas exposer sur Internet.
var net = require('net');
const debug = require('debug')('server')
const { ACTIONS, sendJson } = require('../common/protocol');



const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const clients = new Map();
const groupes = new Map();

var server = net.createServer((socket) => {
    debug(`CONNECTED from ${socket.remoteAddress}:${socket.remotePort}`);
    
    let buffer = '';
    socket.on('data', function (data) {

        buffer += data.toString();
        const messages = buffer.split('\n');
        buffer = messages.pop();

        for (const ligne of messages){
            if (!ligne.trim()) continue;

                let msg;

                try {
                    msg = JSON.parse(ligne);
                 
                } catch (err) {
                    debug(`Erreur lors de la lecture du JSON : ${err.message}`);
                    continue;
                };


                debug(`DATA received from  ${socket.remoteAddress}(${socket.remotePort}) : ${data}`);

                // commande sans presentation
                if (!clients.has(socket) && msg.action != "client-hello") {
                    sendJson(socket, {
                        action: ACTIONS.SERVER_ERROR,
                        msg: 'Veillez vous presenter !'
                    })
                    socket.end();
                    return;
                };


                switch (msg.action) {
                    case ACTIONS.CLIENT_HELLO:
                        //nom d'utilisateur vide
                        const pseudo = msg.sender ? msg.sender.trim() : "";
                        if (!pseudo) {
                            sendJson(socket, {
                                action: ACTIONS.SERVER_ERROR,
                                msg: 'Veuillez renseigner un nom d"tilisateur'
                            });
                            socket.end();
                            break;
                        };

                        //non d'utilisateur deja existant
                        const nom = Array.from(clients.values()).includes(pseudo);
                        if (nom) {
                            sendJson(socket, {
                                action: ACTIONS.SERVER_ERROR,
                                msg: 'Cet utilisateur est deja connecté'
                            })
                            socket.end();
                            break;
                        };
                        
                        clients.set(socket, pseudo);
                        sendJson(socket, {
                            sender: pseudo,
                            action: ACTIONS.SERVER_HELLO,
                            msg: `Bienvenue ${pseudo}`
                        });
                        
                        for (const sock of clients.keys()) {
                            if (sock !== socket) {
                                sendJson(sock, {
                                    sender: clients.get(socket),
                                    action: ACTIONS.SERVER_JOIN,
                                    msg: `${clients.get(socket)} est connecté`
                                });
                            };
                        };
                        break;


                    case ACTIONS.CLIENT_SEND :
                        //nom d'utilisateur vide
                        let destsocket = null;
                        for (const [sock, pers] of clients.entries()){
                            if (pers===msg.dest){
                                destsocket = sock;
                                break;
                            }   
                        };
                        
                        if (!destsocket){
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
                    
                    case ACTIONS.CLIENT_BROADCAST :
                        for (const sock of clients.keys()) {
                            if (sock !== socket) {
                                sendJson(sock, {
                                    sender: clients.get(socket),
                                    msg: msg.msg,
                                    action: ACTIONS.SERVER_BROADCAST
                                });
                            };
                        };
                        break;
                    
                    case ACTIONS.CLIENT_LIST_CLIENTS :
                        const list_u = Array.from(clients.values());
                        sendJson(socket, {
                            sender: clients.get(socket),
                            clients: list_u,
                            action: ACTIONS.SERVER_LIST_CLIENTS
                        });
                        break;

                    case ACTIONS.CLIENT_QUIT :
                        sendJson(socket, {
                            sender: clients.get(socket),
                            msg: 'Vous êtes deconnecté !',
                            action: ACTIONS.SERVER_QUIT
                        });
                        socket.end();
                        break;   

                    case ACTIONS.CGROUPE :
                        const groupName = msg.group ? msg.group.trim() : "";
                        if (!groupName) {
                            sendJson(socket, {
                                msg: `Veillez renseigner un nom de groupe`,
                                action: ACTIONS.SERVER_ERROR
                            })
                            break;
                        }

                        const grpPresent = groupes.has(groupName);
                        const createur = clients.get(socket); 
                        if (grpPresent) {
                            sendJson(socket, {
                                msg: `Ce nom de groupe existe deja. Veillez le changer`,
                                action: ACTIONS.SERVER_ERROR
                            })
                            break;
                        }
                        groupes.set(groupName, {
                            name: groupName,
                            creator: createur,
                            members: new Set([createur]),      // Le créateur est automatiquement le 1er membre
                            messages: [],                    // Historique des messages vide au départ
                            banned: new Set(),               // Personne n'est banni au début
                            invitations: new Set(),          // Pas d'invitations au début
                            states: [                        // 1er événement enregistré !
                                { type: 'created', user: createur, date: new Date().toISOString() }
                            ]
                        })
                        sendJson(socket, {
                            sender: createur,
                            msg: `Le groupe ${groupName} a été crée avec succès`,
                            action: ACTIONS.SERVER_HELLO
                        })
                        break;

                    case ACTIONS.GROUPS :
                        sendJson(socket, {
                            groups: Array.from(groupes.keys()),
                            action: ACTIONS.SERVER_GROUPS_LIST
                        });
                        break;
                    
                    case ACTIONS.JOIN :
                        const groupRequest = (msg.group || "").trim();
                        const requester = clients.get(socket);
                        const grpJoin = groupes.get(groupRequest);
                        if (!groupes.has(groupRequest)){
                            sendJson(socket, {
                                msg: `Le groupe ${groupRequest} n'existe pas.`,
                                action: ACTIONS.SERVER_ERROR
                            })
                            break;
                        } else if (grpJoin.banned.has(requester)) {
                            sendJson(socket, {
                                msg: 'Vous êtes banni de ce groupe',
                                action: ACTIONS.SERVER_ERROR
                            })
                            break;
                        }  else if (grpJoin.members.has(requester)) {
                            sendJson(socket, {
                                msg: 'Vous êtes déjà membre',
                                action: ACTIONS.SERVER_ERROR
                            });
                            break;
                        }
                        grpJoin.members.add(requester);
                        grpJoin.states.push({ type: 'join', user: requester, date: new Date().toISOString() });
                        sendJson(socket, { 
                            action: ACTIONS.SERVER_HELLO, 
                            msg: `Vous avez rejoint ${groupRequest}`
                        });
                        break;
                    
                    case ACTIONS.MEMBERS : 
                        const membersGroup = (msg.group || '').trim();
                        if (!groupes.has(membersGroup)){
                            sendJson(socket, {
                                msg: `Le groupe ${groupRequest} n'existe pas.`,
                                action: ACTIONS.SERVER_ERROR
                            })
                            break;
                        }
                        sendJson(socket, {
                                group: membersGroup,
                                members: Array.from(grp.members),
                                action: ACTIONS.SERVER_GROUP_MEMBERS
                            })
                        break;
                    
                    case ACTIONS.LEAVE :
                        const groupLeave = (msg.group || '').trim();
                        const quitter = clients.get(socket);
                        const grpLeave = groupes.get(groupLeave);
                        if (!groupes.has(groupLeave)){
                            sendJson(socket, {
                                msg: `Le groupe ${groupLeave} n'existe pas.`,
                                action: ACTIONS.SERVER_ERROR
                            })
                            break;
                        } else if (!grpLeave.members.has(quitter)) {
                            sendJson(socket, {
                                msg: `Vous n'êtes pas membre de ce groupe`,
                                action: ACTIONS.SERVER_ERROR
                            })
                            break;
                        }
                        grpLeave.members.delete(quitter);
                        grpLeave.states.push({ type: 'leave', user: quitter, date: new Date().toISOString() });
                        
                        sendJson(socket, {
                            action: ACTIONS.SERVER_HELLO, 
                            msg: `Vous avez quitté ${groupLeave}`
                        });
                        break;
                };  
               
            };
    });

    socket.on('close', () => {
        const pseudo = clients.get(socket);
        clients.delete(socket);
        if (pseudo) {
            for (const sock of clients.keys()) {
                sendJson(sock, {
                        sender: pseudo,
                        msg: `${pseudo} est deconnecté`,
                        action: ACTIONS.SERVER_LEAVE,
                });
            };
        };
        debug(`connexionn close from ${socket.remoteAddress} : ${socket.remotePort}`)

    });

    socket.on('error', (err) => {
        debug(`Error socket from ${socket.remoteAddress} : ${socket.remotePort} : ${err.message}`)
    });

}).listen(PORT, HOST, () => {
    debug(`Server listening on ${HOST} : ${PORT}`);
});

