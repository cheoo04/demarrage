// Fragment pédagogique : ne pas exposer sur Internet.
var net = require('net');
const debug = require('debug')('server')
const { ACTIONS, sendJson } = require('../common/protocol');



const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const clients = new Map();

var server = net.createServer((socket) => {
    debug(`CONNECTED from ${socket.remoteAddress}:${socket.remotePort}`);
    
    let buffer = '';
    socket.on('data', function (data) {

        buffer += data.toString();
        const messages = buffer.split('\n');
        buffer = messages.pop();

        for (const ligne of messages){
            if (!ligne.trim()) continue;
                try {
                    const msg = JSON.parse(ligne);


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
                        case 'client-hello':
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


                        case 'client-send':
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
                        
                        case 'client-broadcast':
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
                        
                        case 'client-list-clients':
                            const list_u = Array.from(clients.values());
                            sendJson(socket, {
                                sender: clients.get(socket),
                                clients: list_u,
                                action: ACTIONS.SERVER_LIST_CLIENTS
                            });
                            break;

                        case 'client-quit' :
                            sendJson(socket, {
                                sender: clients.get(socket),
                                msg: 'Vous êtes deconnecté !',
                                action: ACTIONS.SERVER_QUIT
                            });
                            socket.end();
                            break;   
                    };   
                } catch (err) {
                    debug(`Erreur lors de la lecture du JSON : ${err.message}`);
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

