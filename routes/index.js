var express = require('express');
var router = express.Router();
const http = require('http');
const socketIo = require('socket.io');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const uniqid = require('uniqid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const clients = new Map();

io.on('connection', (socket) => {
  const id = uniqid();
  const color = Math.floor(Math.random() * 360);
  const metadata = { id, color };

  clients.set(socket, metadata);

  // Envoyer un message à tous les clients WebSocket
  function sendMessageToClients(message) {
    io.emit('message', message);
  }

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${metadata.id}`);
    clients.delete(socket);
  });

  // Rejoindre la discussion
  socket.on('join', (username) => {
    console.log(`User ${username} joined the chat`);
    sendMessageToClients({ event: 'join', username });
  });
  
  // Envoyer un message
  socket.on('message', (message) => {
    console.log(`Message sent: ${message}`);
    
    try {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.type === 'text') {
        // Traitement des messages texte
        const messageWithDate = { ...parsedMessage, createdAt: new Date() };
        io.emit('message', messageWithDate);
      } else if (parsedMessage.type === 'audio') {
        // Traitement des messages audio
        io.emit('message', parsedMessage);
      } else {
        console.log('Message type not recognized:', parsedMessage.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
});

// Routes pour l'API Express
app.put('/users/:username', (req, res) => {
  const { username } = req.params;
  io.emit('join', username);
  res.json({ result: true });
});

app.delete('/users/:username', (req, res) => {
  const { username } = req.params;
  io.emit('leave', username);
  res.json({ result: true });
});

app.post('/message', (req, res) => {
  const { body } = req.body;
  io.emit('message', body);
  res.json({ result: true });
});

app.post('/upload', async (req, res) => {
  const audioPath = `./tmp/${uniqid()}.m4a`; // Utilisation de l'extension .m4a pour les fichiers audio
  const resultMove = await req.files.audioFromFront.mv(audioPath);

  try {
    const resultCloudinary = await cloudinary.uploader.upload(audioPath);
    fs.unlinkSync(audioPath); // Supprimer le fichier après l'avoir téléchargé sur Cloudinary
    res.json({ result: true, url: resultCloudinary.secure_url });
  } catch (error) {
    console.error('Error uploading audio', error);
    res.status(500).json({ result: false, error: 'An error occurred while uploading the audio' });
  }
});

const PORT = process.env.PORT || 7071;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = router;
