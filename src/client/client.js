const net = require('net');
const readline = require('readline');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const debug = require('debug')('client');

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
console.log(`Bienvenue, vous êtes connecté sous le nom de : ${username}`);

// 2. On prépare la socket de connexion
const client = new net.Socket();

client.connect(8080, '127.0.0.1', function () {
    console.log('Connexion au server...');
    client.write(JSON.stringify({
        sender: username,
        action: 'client-hello'
    }));
});

// 3. Quand le serveur nous répond
client.on('data', function (data) {
    console.log('Reçu du serveur : ' + data);
});

// 4. On écoute ce que l'utilisateur tape au clavier avec readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


rl.on('line', (line) => {
    if (line.startsWith('s;')) {
        const parts = line.split(';');

        if (parts >= 3){
            const dest = parts[1];
            const msg = parts.slice(2).join(';');
            client.write(JSON.stringify({
                sender: username,
                dest: dest,
                msg: msg,
                action: 'client-send'
            }));            
        } else {
            console.log('format invalide, veillez ecrire: s;destinataire;message')
        }
    }
    
    if (line == 'hello') {
        client.write(JSON.stringify({
            sender: 'username',
            action: 'client-hello'
        }))
    };
});

// À RETIRER APRÈS
client.on('close', () => {
    debug(`Server down`);
    process.exit(0);
});
