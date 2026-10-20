const net = require('net');
const readline = require('readline');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const debug = require('debug')('client');
const { ACTIONS, sendJson } = require('../common/protocol');
const { parseCommand } = require('./gestionnairecommandes');

// 1. On récupère les options tapées dans la commande (ex: --name david)
const argv = yargs(hideBin(process.argv))
    .option('name', {
        type: 'string',
        description: "Nom de l'utilisateur",
        demandOption: true
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
        
        let msg;
        try {
            msg = JSON.parse(ligne);
        } catch (err) {
            debug(`Erreur lors de la lecture du JSON : ${err.message}`);
            continue;
        }

        switch (msg.action) {
            case ACTIONS.SERVER_HELLO:
                console.log(`[+] ${msg.msg}`);
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
                console.log(msg.msg);
                process.exit(0);
                break;
            
            case ACTIONS.SERVER_GROUPS_LIST:
                console.log(`Liste des groupes (${msg.groups.length}) : ${msg.groups.join(', ')} `);
                break;

            case ACTIONS.SERVER_GROUP_MEMBERS:
                console.log(`Membre de ${msg.group} (${msg.members.length}) : ${msg.members.join(', ')}`);
                break;

            case ACTIONS.SERVER_GROUP_MESSAGE:
                console.log(`GROUPE${msg.group} - ${msg.sender} : ${msg.msg}`);
                break;

            case ACTIONS.SERVER_GROUP_MSGS:
                console.log(`Historique des messages du groupe ${msg.group} :`);
                for (const m of msg.messages){
                    console.log(`[${m.sender}] : ${m.msg}`);
                }
                break;

            case ACTIONS.SERVER_INVITED:
                console.log(`[invitation] : ${msg.msg}`);
                break;

            case ACTIONS.SERVER_GROUP_STATES:
                console.log(`Événements du groupe ${msg.group} (${msg.states.length})`);
                for (const e of msg.states) {
                    let details = `[${e.type.toUpperCase()}] par ${e.user}`;
                    if (e.dest) details += ` -> cible : ${e.dest}`;
                    if (e.reason) details += ` (Raison : ${e.reason})`;
                    console.log(`  ${details}`);
                }
                break;
        }
    }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (line) => {
    const payload = parseCommand(line, username);
    if (payload) {
        sendJson(client, payload);
    }
});

client.on('close', () => {
    debug(`Server down`);
    process.exit(0);
});