const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// In-memory storage for rooms
const rooms = new Map();

// API Routes

// Get room data
app.get('/api/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    const room = rooms.get(roomId);
    
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json(room);
});

// Create or update room
app.post('/api/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    const roomData = req.body;
    
    // Validate room data
    if (!roomData.participants || !roomData.lastUpdated) {
        return res.status(400).json({ error: 'Invalid room data' });
    }
    
    rooms.set(roomId, {
        ...roomData,
        lastUpdated: Date.now()
    });
    
    res.json({ success: true, room: rooms.get(roomId) });
});

// Join room (add participant)
app.post('/api/rooms/:roomId/join', (req, res) => {
    const { roomId } = req.params;
    const { user } = req.body;
    
    let room = rooms.get(roomId);
    
    if (!room) {
        // Create new room if it doesn't exist
        room = {
            participants: {},
            votes: {},
            votingActive: false,
            votesRevealed: false,
            currentIssue: "準備估算第一個故事",
            lastUpdated: Date.now()
        };
    }
    
    // Check if name is already taken
    const nameExists = Object.values(room.participants).some(p => p.name === user.name);
    if (nameExists) {
        return res.status(400).json({ error: 'Name already taken' });
    }
    
    // Add user to room
    room.participants[user.id] = {
        ...user,
        hasVoted: false,
        vote: null
    };
    
    room.lastUpdated = Date.now();
    rooms.set(roomId, room);
    
    res.json({ success: true, room });
});

// Submit vote
app.post('/api/rooms/:roomId/vote', (req, res) => {
    const { roomId } = req.params;
    const { userId, vote } = req.body;
    
    const room = rooms.get(roomId);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    // Update vote
    room.votes[userId] = vote;
    
    // Update participant status
    if (room.participants[userId]) {
        room.participants[userId].hasVoted = true;
        room.participants[userId].vote = vote;
    }
    
    room.lastUpdated = Date.now();
    rooms.set(roomId, room);
    
    res.json({ success: true, room });
});

// Reveal votes (host only)
app.post('/api/rooms/:roomId/reveal', (req, res) => {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    const room = rooms.get(roomId);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user is host
    const user = room.participants[userId];
    if (!user || !user.isHost) {
        return res.status(403).json({ error: 'Only host can reveal votes' });
    }
    
    room.votesRevealed = true;
    room.lastUpdated = Date.now();
    rooms.set(roomId, room);
    
    res.json({ success: true, room });
});

// Start new voting round
app.post('/api/rooms/:roomId/new-vote', (req, res) => {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    const room = rooms.get(roomId);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user is host
    const user = room.participants[userId];
    if (!user || !user.isHost) {
        return res.status(403).json({ error: 'Only host can start new vote' });
    }
    
    // Reset voting
    room.votes = {};
    room.votesRevealed = false;
    room.votingActive = true;
    
    // Reset all participants' voting status
    Object.keys(room.participants).forEach(id => {
        room.participants[id].hasVoted = false;
        room.participants[id].vote = null;
    });
    
    room.lastUpdated = Date.now();
    rooms.set(roomId, room);
    
    res.json({ success: true, room });
});

// Update issue
app.post('/api/rooms/:roomId/issue', (req, res) => {
    const { roomId } = req.params;
    const { userId, issue } = req.body;
    
    const room = rooms.get(roomId);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user is host
    const user = room.participants[userId];
    if (!user || !user.isHost) {
        return res.status(403).json({ error: 'Only host can update issue' });
    }
    
    room.currentIssue = issue;
    room.lastUpdated = Date.now();
    rooms.set(roomId, room);
    
    res.json({ success: true, room });
});

// Remove inactive rooms (cleanup every 30 minutes)
setInterval(() => {
    const now = Date.now();
    const TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    for (const [roomId, room] of rooms) {
        if (now - room.lastUpdated > TIMEOUT) {
            rooms.delete(roomId);
            console.log(`Cleaned up inactive room: ${roomId}`);
        }
    }
}, 30 * 60 * 1000);

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🃏 PokerPhase server running at http://localhost:${PORT}`);
    console.log(`📱 Open in multiple browsers to test multi-user functionality`);
});

module.exports = app;