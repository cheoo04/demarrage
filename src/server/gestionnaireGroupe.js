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
    } else if (!sendGrp.members.has(requester)){
        return {error: "Vous devez être membre pour consulter l'historique"};
    }
    return {success: true, groupName: grpMsg, messages: grpMsg.messages};
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
    getMessages
};