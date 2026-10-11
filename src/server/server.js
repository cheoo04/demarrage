// Fragment pédagogique : ne pas exposer sur Internet.
var net = require('net');
const debug = require('debug')('server')


const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const clients = new Map();

var server = net.createServer((socket) => {
    debug(`CONNECTED from ${socket.remoteAddress}:${socket.remotePort}`);
    socket.on('data', function (data) {
        const msg = JSON.parse(data);
        debug(`DATA received from  ${socket.remoteAddress}(${socket.remotePort}) : ${data}`);

        // commande sans presentation
        if (!clients.has(socket) && msg.action != "client-hello") {
            socket.write(JSON.stringify({
                action: 'server-error',
                msg: 'Veillez vous presenter !'
            }))
            socket.end();
            return;
        };

        switch (msg.action) {
            case 'client-hello':
                //nom d'utilisateur vide
                const pseudo = msg.sender ? msg.sender.trim() : "";
                if (!pseudo) {
                    socket.write(JSON.stringify({
                        action: 'server-error',
                        msg: 'Veuillez renseigner un nom d"tilisateur'
                    }))
                    socket.end();
                    break;
                };

                //non d'utilisateur deja existant
                const nom = Array.from(clients.values()).includes(pseudo);
                if (nom) {
                    socket.write(JSON.stringify({
                        action: 'server-error',
                        msg: 'Cet utilisateur est deja connecté'
                    }))
                    socket.end();
                    break;
                };
                
                clients.set(socket, pseudo);
                socket.write(JSON.stringify({
                    sender: msg.sender,
                    action: 'server-hello',
                    msg: `Bienvenue ${msg.sender}`
                }));
                break;

        }
    });

    socket.on('close', () => {
        debug(`connexionn close from ${socket.remoteAddress} : ${socket.remotePort}`)
        clients.delete(socket);
    });

    socket.on('error', (err) => {
        debug(`Error socket from ${socket.remoteAddress} : ${socket.remotePort} : ${err.message}`)
    });

}).listen(PORT, HOST, () => {
    debug(`Server listening on ${HOST} : ${PORT}`);
});

