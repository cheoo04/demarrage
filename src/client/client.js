const net = require('net');
const readline = require('readline');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

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
console.log(`Bienvenue, vous jouez sous le nom de : ${username}`);

// 2. On prépare la socket de connexion
const client = new net.Socket();

client.connect(8080, '127.0.0.1', function() {
    console.log('Connecté au serveur !');
});

// 3. Quand le serveur nous répond
client.on('data', function(data) {
    console.log('Reçu du serveur : ' + data);
});

// 4. On écoute ce que l'utilisateur tape au clavier avec readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (line) => {
    // Si l'utilisateur tape hello
    if (line === 'hello') {
        client.write(JSON.stringify({ action: 'client-hello' }));
    }
});