const express = require('express')
const fs = require('fs');
const webserver = express()
 .use((req, res) =>
   res.sendFile('C:/Users/cbsantos/Desktop/TRABALHO/UNB/Redes/AudioStreaming_2023.2/FrontEnd/index.html')
 )
 .listen(3000, () => console.log(`Listening on ${3000}`))

const songDirectory = './musics'; // Replace with your actual song directory
const availableSongs = fs.readdirSync(songDirectory);

const { WebSocketServer } = require('ws');
const sockserver = new WebSocketServer({ port: 443 });

const clients = {};

function broadcastSongList(ws) {
    const songListMessage = JSON.stringify({ type: 'songList', data: availableSongs });
    ws.send(songListMessage);
}

function broadcastSelectedSong(selectedSong, ws) {
    const filePath = `./musics/${selectedSong}`;
    const audioData = fs.readFileSync(filePath, { encoding: 'base64' });
    const message = { type: 'selectedSong', audioData, selectedSong };
    ws.send(JSON.stringify(message));
}

function sendClients() {
    const clientList = Object.keys(clients).map(clientId => ({
        id: clientId,
    }));
    // const message = { type: 'clients', clients: clientList };
    Object.values(clients).forEach(client => {
        const clientIP = client._socket.remoteAddress;
        const filteredClientList = clientList.filter(client => client.id !== clientIP);
        const message = { type: 'clients', clients: filteredClientList };
        client.send(JSON.stringify(message));
    });
}

function askConnectionRemoteClient(clientIP, ws){
    Object.values(clients).forEach(client => {
        if(client._socket.remoteAddress === clientIP){
            const senderIP = ws._socket.remoteAddress;
            const message = {type: 'askConnectionRemoteClient', sender: senderIP};
            client.send(JSON.stringify(message));
        }
    });    
}

function responseConnectionRemoteClient(response, sender, ws){
    Object.values(clients).forEach(client => {
        if(client._socket.remoteAddress === sender){
            const remoteIP = ws._socket.remoteAddress;
            const message = {type: 'responseConnectionRemoteClient', response: response, remote: remoteIP};
            client.send(JSON.stringify(message));
        }
    });  
}

function playRemoteClient(song, remote){
    Object.values(clients).forEach(client => {
        if(client._socket.remoteAddress === remote){
            const message = {type: 'playRemoteClient', song: song};
            client.send(JSON.stringify(message));
        }
    });  
}

sockserver.on('connection', ws => {
    console.log('New client connected!');
    broadcastSongList(ws);
    
    // Generate a unique identifier for the client
    const clientId = ws._socket.remoteAddress; // You can use a better method for generating unique IDs
    clients[clientId] = ws;

    sendClients();

    ws.on('close', () => {
        console.log('Client has disconnected!');
        delete clients[clientId];
        sendClients();
    });

    ws.on('message', message => {
        const data = JSON.parse(message);
        // Check if the received message is related to playing a song
        if (data.type === 'playSong') {
            broadcastSelectedSong(data.data, ws);
        }
        else if(data.type === 'askConnectionRemoteClient'){
            askConnectionRemoteClient(data.id, ws);
        }
        else if(data.type === 'responseConnectionRemoteClient'){
            responseConnectionRemoteClient(data.response, data.sender, ws);
        }
        else if (data.type === 'playRemoteClient'){
            playRemoteClient(data.data, data.remote);
        }
    });

    ws.onerror = function () {
        console.log('WebSocket error');
    };
});