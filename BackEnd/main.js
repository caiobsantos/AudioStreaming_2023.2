const express = require('express')
const fs = require('fs');
const webserver = express()
 .use((req, res) =>
   res.sendFile('C:/Users/cbsantos/Desktop/TRABALHO/UNB/Redes/AudioStreaming_2023.2/FrontEnd/index.html')
 )
 .listen(3000, () => console.log(`Listening on ${3000}`))

const songDirectory = './musics'; // Replace with your actual song directory
const availableSongs = fs.readdirSync(songDirectory);

const { WebSocketServer } = require('ws')
const sockserver = new WebSocketServer({ port: 443 })

function broadcastSongList(ws) {
    const songListMessage = JSON.stringify({ type: 'songList', data: availableSongs });
    // sockserver.clients.forEach((client) => {
    //     client.send(songListMessage);
    // });
    ws.send(songListMessage)
}

function broadcastSelectedSong(selectedSong) {
    // const songStream = fs.createReadStream(`./musics/${selectedSong}`);
    // const chunkSize = 1024; // Adjust the chunk size as needed

    // sockserver.clients.forEach((client) => {
    //     if (client.readyState === WebSocketServer.OPEN) {
    //         songStream.on('data', (chunk) => {
    //             client.send(chunk);
    //         });

    //         songStream.on('end', () => {
    //             // Signal the end of song data
    //             client.send('END_OF_SONG');
    //         });
    //     }
    // });
    const filePath = `./musics/${selectedSong}`; // Adjust the path to your music files
    const audioData = fs.readFileSync(filePath, { encoding: 'base64' });
    sockserver.clients.forEach((client) => {
        const message = { type: 'selectedSong', audioData, selectedSong};
        client.send(JSON.stringify(message));
    });
}

sockserver.on('connection', ws => {
    console.log('New client connected!')
    broadcastSongList(ws);

    ws.on('close', () => console.log('Client has disconnected!'))

    ws.on('message', message => {
        const data = JSON.parse(message);
        // Check if the received message is related to playing song
        if (data.type === 'playSong') {
            // Broadcast the selected song to all clients
            broadcastSelectedSong(data.data);
        }
    })
    
    ws.onerror = function () {
        console.log('websocket error')
    }
})