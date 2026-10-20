const { ACTIONS } = require('../common/protocol');

function parseCommand(line, username) {
    if (line.startsWith('s;')) {
        const cmd_mp = line.split(';');

        if (cmd_mp.length >= 3) {
            const dest = cmd_mp[1];
            const msg = cmd_mp.slice(2).join(';');
            return {
                sender: username,
                dest: dest,
                msg: msg,
                action: ACTIONS.CLIENT_SEND
            };
        } else {
            console.log('format invalide, veillez ecrire: s;destinataire;message');
            return null;
        }
    } 
    
    if (line.startsWith('b;')) {
        const msg = line.slice(2).trim();
        if (msg) {
            return {
                sender: username,
                msg: msg,
                action: ACTIONS.CLIENT_BROADCAST
            };
        } else {
            console.log('Veillez envoyer un message valide');
            return null;
        }
    } 
    
    if (line.trim() === 'ls;') {
        return {
            sender: username,
            action: ACTIONS.CLIENT_LIST_CLIENTS
        };
    } 
    
    if (line.trim() === 'q;') {
        return {
            sender: username,
            action: ACTIONS.CLIENT_QUIT
        };
    } 
    
    if (line.startsWith('cg;')) {
        const grp = line.slice(3).trim();
        if (grp) {
            return {
                sender: username,
                group: grp,
                action: ACTIONS.CGROUPE
            };
        } else {
            console.log('Veillez renseigner un nom de groupe');
            return null;
        }
    } 
    
    if (line.trim() === 'groups;') {
        return {
            name: username,
            action: ACTIONS.GROUPS
        };
    } 
    
    if (line.trim().startsWith('j;')) {
        const grp = line.slice(2).trim();
        return {
            sender: username,
            group: grp,
            action: ACTIONS.JOIN
        };
    } 
    
    if (line.startsWith('members;')) {
        const grp = line.slice(8).trim();
        return {
            sender: username,
            group: grp,
            action: ACTIONS.MEMBERS
        };
    } 
    
    if (line.startsWith('leave;')) {
        const grp = line.slice(6).trim();
        return {
            sender: username,
            group: grp,
            action: ACTIONS.LEAVE
        };
    }

    if (line.startsWith('bg;')) {
        const parts = line.split(';');
        if (parts.length >= 3) {
            const grp = parts[1];
            const message = parts.slice(2).join(';');
            return {
                sender: username,
                group: grp,
                msg: message,
                action: ACTIONS.GBROADCAST
            };
        } else {
            console.log('format invalide, veuillez écrire : bg;groupe;message');
            return null;
        }
    }

    if (line.startsWith('messages;')){
        const grp = line.slice(9).trim();
        return {
            sender: username,
            group: grp,
            action: ACTIONS.MSGS
        }
    }

    if(line.startsWith('invite;')){
        const parts = line.split(';');
        if(parts.length>=3){
            const grp = parts[1];
            const dest = parts[2];
            return {
                sender: username,
                group: grp,
                dest: dest.trim(),
                action: ACTIONS.INVITE
            }
        } else {
            console.log('Format invalide, veillez ecrire : invite;groupe;destinataire'); 
            return null;}
    }

    // Si la commande n'est pas reconnue
    return null;
}

module.exports = {
    parseCommand
};