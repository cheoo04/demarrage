const groupes = new Map();

function create(groupName, createur) {
    if (!groupName) {
        return { error: 'Veillez renseigner un nom de groupe' };
    }

    if (groupes.has(groupName)) {
        return { error: 'Ce nom de groupe existe deja. Veillez le changer' };
    }

    groupes.set(groupName, {
        name: groupName,
        creator: createur,
        members: new Set([createur]),
        messages: [],
        banned: new Set(),
        invitations: new Set(),
        states: [
            { type: 'created', user: createur, date: new Date().toISOString() }
        ]
    });

    return { 
        success: true, 
        sender: createur, 
        msg: `Le groupe ${groupName} a été crée avec succès` 
    };
}

function list() {
    return Array.from(groupes.keys());
}

function join(groupRequest, requester) {
    const grpJoin = groupes.get(groupRequest);

    if (!grpJoin) {
        return { error: `Le groupe ${groupRequest} n'existe pas.` };
    } else if (grpJoin.banned.has(requester)) {
        return { error: 'Vous êtes banni de ce groupe' };
    } else if (grpJoin.members.has(requester)) {
        return { error: 'Vous êtes déjà membre' };
    }

    grpJoin.members.add(requester);
    grpJoin.states.push({ type: 'join', user: requester, date: new Date().toISOString() });

    return { 
        success: true, 
        msg: `Vous avez rejoint ${groupRequest}` 
    };
}

function getMembers(membersGroup) {
    const grpMembers = groupes.get(membersGroup);

    if (!grpMembers) {
        return { error: `Le groupe ${membersGroup} n'existe pas.` };
    }

    return { 
        success: true, 
        group: membersGroup, 
        members: Array.from(grpMembers.members) 
    };
}

function leave(groupLeave, quitter) {
    const grpLeave = groupes.get(groupLeave);

    if (!grpLeave) {
        return { error: `Le groupe ${groupLeave} n'existe pas.` };
    } else if (!grpLeave.members.has(quitter)) {
        return { error: `Vous n'êtes pas membre de ce groupe` };
    }

    grpLeave.members.delete(quitter);
    grpLeave.states.push({ type: 'leave', user: quitter, date: new Date().toISOString() });

    return { 
        success: true, 
        msg: `Vous avez quitté ${groupLeave}` 
    };
}

function removeUser(pseudo) {
    for (const grp of groupes.values()) {
        grp.members.delete(pseudo);
    }
}

function addMessage (groupName, sender, text){
    const sendGrp = groupes.get(groupName);
    if(!sendGrp){
        return { error : `Groupe introuvable`};
    } else if (!sendGrp.members.has(sender)){
        return {error: 'Vous devez être membre pour écrire dans ce groupe'};
    }
    const msgGroupe = {sender, msg: text, date: new Date().toISOString()};
    sendGrp.messages.push(msgGroupe);
    return {success: true, members: Array.from(sendGrp.members)};
}

function getMessages(groupName, requester){
    const grpMsg = groupes.get(groupName);
    if(!grpMsg){
        return { error : `Groupe introuvable`};
    } else if (!grpMsg.members.has(requester)){
        return {error: "Vous devez être membre pour consulter l'historique"};
    }
    return {success: true, group: groupName, messages: grpMsg.messages};
}

function inviteUser(groupName, sender, dest){
    const invGrp = groupes.get(groupName);
    if(!invGrp){
        return { error : `Groupe ${groupName} introuvable`};
    } else if (!invGrp.members.has(sender)){
        return {error: "Vous devez être membre pour inviter une personne"};
    } else if (invGrp.members.has(dest)) {
        return {error : `${dest} est déja membre`};
    } else if (invGrp.banned.has(dest)){
        return {error: `${dest} est banni de ce groupe`}
    }
    invGrp.invitations.add(dest);
    invGrp.states.push({type: 'invite', user: sender, dest: dest, date: new Date().toISOString()});
    return {success: true, group: groupName, dest: dest};
}

function kickUser(groupName, sender, dest, reason){
    const kickGrp = groupes.get(groupName);
    if(!kickGrp){
        return { error : `Groupe ${groupName} introuvable`};
    } else if (kickGrp.creator !== sender) {
        return {error: "Seul le créateur peut exclure un membre"};
    }else if (kickGrp.creator === dest) {
        return {error: "On ne peut pas exclure le créateur du groupe"};
    } else if (!kickGrp.members.has(dest)) {
        return {error : `${dest} n'est pas un membre actuel du groupe`};
    }
    kickGrp.members.delete(dest);
    kickGrp.states.push({ type: 'kick', user: sender, dest: dest, reason: reason, date: new Date().toISOString() });
    return {success: true, group: groupName, dest: dest, reason: reason };
}

function banUser(groupName, sender, dest, reason){
    const banGrp = groupes.get(groupName);
    if(!banGrp){
        return { error : `Groupe ${groupName} introuvable`};
    } else if (banGrp.creator !== sender) {
        return {error: "Seul le créateur peut bannir un membre"};
    }else if (banGrp.creator === dest) {
        return {error: "On ne peut pas bannir le créateur du groupe"};
    } else if (!banGrp.members.has(dest)) {
        return {error : `${dest} n'est pas un membre actuel du groupe`};
    }
    banGrp.members.delete(dest);
    banGrp.banned.add(dest);
    banGrp.states.push({ type: 'ban', user: sender, dest: dest, reason: reason, date: new Date().toISOString() });
    return {success: true, group: groupName, dest: dest, reason: reason };
}

function unbanUser(groupName, sender, dest){
    const unbanGrp = groupes.get(groupName);
    if(!unbanGrp){
        return { error : `Groupe ${groupName} introuvable`};
    } else if (unbanGrp.creator !== sender) {
        return {error: "Seul le créateur peut débannir un membre"};
    }else if (!unbanGrp.banned.has(dest)) {
        return {error: `${dest} n'est pas banni`};
    }
    unbanGrp.banned.delete(dest);
    unbanGrp.states.push({ type: 'unban', user: sender, dest: dest, date: new Date().toISOString() });
    return {success: true, group: groupName, dest: dest};
}

function getStates(groupName, requester) {
    const grp = groupes.get(groupName);
    if (!grp) {
        return { error: `Groupe ${groupName} introuvable` };
    }
    if (!grp.members.has(requester)) {
        return { error: "Vous devez être membre pour consulter les états" };
    }
    return { success: true, group: groupName, states: grp.states };
}

module.exports = {
    groupes,
    create,
    list,
    join,
    getMembers,
    leave,
    removeUser,
    addMessage,
    getMessages,
    inviteUser,
    kickUser,
    banUser,
    unbanUser,
    getStates
};