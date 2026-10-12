const net = require('net');
const readline = require('readline');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const debug = require('debug')('client');
const { ACTIONS, sendJson } = require('../common/protocol');

// 1. On récupère les options tapées dans la commande (ex: --name david)
const argv = yargs(hideBin(process.argv))
    .option('name', {
        type: 'string',
        description: "Nom de l'utilisateur",
        demandOption: true // Rend l'option obligatoire !
    })
    .help()
    .argv;

const username = argv.name;

// 2. On prépare la socket de connexion
const client = new net.Socket();

client.connect(8080, '127.0.0.1', function () {
    console.log('Connexion au server...');
    sendJson(client, {
        sender: username,
        action: ACTIONS.CLIENT_HELLO
    });
});

let buffer = '';
// 3. Quand le serveur nous répond
client.on('data', function (data) {

    buffer += data.toString();
    const messages = buffer.split('\n');
    buffer = messages.pop();
    for (const ligne of messages) {
        if (!ligne.trim()) continue; // On ignore les lignes vides

        try {
            const msg = JSON.parse(ligne);

            switch (msg.action){
                case ACTIONS.SERVER_HELLO:
                    console.log(msg.msg);
                    break;

                case ACTIONS.SERVER_MESSAGE:
                    console.log(`[Message de ${msg.sender}] : ${msg.msg}`);
                    break;

                case ACTIONS.SERVER_BROADCAST:
                    console.log(`[GÉNÉRAL - ${msg.sender}] : ${msg.msg}`);
                    break;

                case ACTIONS.SERVER_LIST_CLIENTS:
                    console.log(`Utilisateurs en ligne (${msg.clients.length}) : ${msg.clients.join(', ')}`);
                    break;

                case ACTIONS.SERVER_JOIN:
                    console.log(`[+] ${msg.msg}`);
                    break;

                case ACTIONS.SERVER_LEAVE:
                    console.log(`[-] ${msg.msg}`);
                    break;

                case ACTIONS.SERVER_ERROR:
                    console.error(`[ERREUR] ${msg.msg}`);
                    break;

                case ACTIONS.SERVER_QUIT:
                    console.log(msg.msg)
                    process.exit(0);
                    break;
            };
        } catch (err) {
            debug(`Erreur lors de la lecture du JSON : ${err.message}`);
        };
    };
});


// 4. On écoute ce que l'utilisateur tape au clavier avec readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


rl.on('line', (line) => {
    if (line.startsWith('s;')) {
        const cmd_mp = line.split(';');

        if (cmd_mp.length >= 3){
            const dest = cmd_mp[1];
            const msg = cmd_mp.slice(2).join(';');
            sendJson(client, {
                sender: username,
                dest: dest,
                msg: msg,
                action: ACTIONS.CLIENT_SEND
            });           
        } else {
            console.log('format invalide, veillez ecrire: s;destinataire;message')
        }
    } else if (line.startsWith('b;')) {
        const msg = line.slice(2).trim();
        if (msg) {
            sendJson(client, {
                sender: username,
                msg: msg,
                action: ACTIONS.CLIENT_BROADCAST
            })
        } else {
            console.log('Veillez envoyer un message valide')
        };   
    } else if (line.trim() === 'ls;'){
        sendJson(client, {
            sender: username,
            action: ACTIONS.CLIENT_LIST_CLIENTS
        });
    } else if (line.trim() === 'q;'){
        sendJson(client, {
            sender: username,
            action: ACTIONS.CLIENT_QUIT
        })
    };
});

// À RETIRER APRÈS
client.on('close', () => {
    debug(`Server down`);
    process.exit(0);
});
