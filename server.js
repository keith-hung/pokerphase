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
    let isFirstParticipant = false;
    
    if (!room) {
        // Create new room if it doesn't exist
        room = {
            participants: {},
            votes: {},
            votingActive: false,
            votesRevealed: false,
            currentIssue: "準備估算第一個故事",
            paperBalls: {},
            animations: [],
            lastUpdated: Date.now()
        };
        isFirstParticipant = true;
    } else {
        // Check if room is empty (all participants might have left)
        isFirstParticipant = Object.keys(room.participants).length === 0;
    }
    
    // Check if name is already taken
    const nameExists = Object.values(room.participants).some(p => p.name === user.name);
    if (nameExists) {
        return res.status(400).json({ error: 'Name already taken' });
    }
    
    // If this is the first participant or room was empty, make them host
    const shouldBeHost = isFirstParticipant || user.isHost;
    
    // Add user to room
    room.participants[user.id] = {
        ...user,
        isHost: shouldBeHost,
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
    
    // Update vote or remove if null (deselect)
    if (vote === null) {
        // Remove vote (deselect)
        delete room.votes[userId];
        if (room.participants[userId]) {
            room.participants[userId].hasVoted = false;
            room.participants[userId].vote = null;
        }
    } else {
        // Add/update vote
        room.votes[userId] = vote;
        if (room.participants[userId]) {
            room.participants[userId].hasVoted = true;
            room.participants[userId].vote = vote;
        }
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
    
    // Check if at least one person has voted (for force reveal)
    const votedCount = Object.values(room.participants).filter(p => p.hasVoted).length;
    if (votedCount === 0) {
        return res.status(400).json({ error: 'No votes to reveal' });
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
    room.paperBalls = {}; // Clear boomerangs when starting new vote
    room.animations = []; // Clear animations when starting new vote
    
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

// Throw boomerang
app.post('/api/rooms/:roomId/paper-ball', (req, res) => {
    const { roomId } = req.params;
    const { fromUserId, fromUserName, targetUserId, targetUserName } = req.body;
    
    const room = rooms.get(roomId);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    // Validate users exist in room
    if (!room.participants[fromUserId] || !room.participants[targetUserId]) {
        return res.status(400).json({ error: 'Invalid user' });
    }
    
    // Check if target user hasn't voted yet (unless thrower is host)
    const throwerIsHost = room.participants[fromUserId] && room.participants[fromUserId].isHost;
    if (room.participants[targetUserId].hasVoted && !throwerIsHost) {
        return res.status(400).json({ error: 'Target user has already voted' });
    }
    
    // Check if votes are not revealed
    if (room.votesRevealed) {
        return res.status(400).json({ error: 'Voting round is over' });
    }
    
    // Add boomerang notification (temporary, will be cleared when room is fetched)
    if (!room.paperBalls) {
        room.paperBalls = {};
    }
    
    room.paperBalls[targetUserId] = {
        fromUserId,
        fromUserName,
        timestamp: Date.now()
    };
    
    // Add animation broadcast for all clients
    if (!room.animations) {
        room.animations = [];
    }
    
    // Add animation event (includes projectile type from request body)
    const animationEvent = {
        id: Date.now() + Math.random(), // Unique ID for this animation
        fromUserId,
        fromUserName,
        targetUserId,
        targetUserName,
        projectileType: req.body.projectileType || 'boomerang',
        timestamp: Date.now()
    };
    
    room.animations.push(animationEvent);
    
    room.lastUpdated = Date.now();
    rooms.set(roomId, room);
    
    // Clear the boomerang after 1 second (so it's delivered once)
    setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (currentRoom && currentRoom.paperBalls && currentRoom.paperBalls[targetUserId]) {
            delete currentRoom.paperBalls[targetUserId];
            rooms.set(roomId, currentRoom);
        }
    }, 1000);
    
    // Clear old animations after 10 seconds to prevent memory buildup
    setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (currentRoom && currentRoom.animations) {
            currentRoom.animations = currentRoom.animations.filter(
                anim => Date.now() - anim.timestamp < 10000 // Keep animations for 10 seconds
            );
            rooms.set(roomId, currentRoom);
        }
    }, 10000);
    
    res.json({ success: true });
});

// Leave room
app.post('/api/rooms/:roomId/leave', (req, res) => {
    const { roomId } = req.params;
    
    // Handle URL parameters (for sendBeacon) and JSON body
    let userId = req.query.userId || req.body.userId;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
    }
    
    const room = rooms.get(roomId);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    // Remove user from participants
    if (room.participants[userId]) {
        const wasHost = room.participants[userId].isHost;
        delete room.participants[userId];
        
        // Remove user's vote if any
        if (room.votes[userId]) {
            delete room.votes[userId];
        }
        
        // Remove any pending paper balls for this user
        if (room.paperBalls && room.paperBalls[userId]) {
            delete room.paperBalls[userId];
        }
        
        // If the host left and there are still participants, make someone else host
        if (wasHost && Object.keys(room.participants).length > 0) {
            const remainingParticipants = Object.values(room.participants);
            const newHost = remainingParticipants[0];
            if (newHost) {
                newHost.isHost = true;
                room.participants[Object.keys(room.participants)[0]] = newHost;
            }
        }
        
        // If room is empty, delete it
        if (Object.keys(room.participants).length === 0) {
            rooms.delete(roomId);
            console.log(`Deleted empty room: ${roomId}`);
        } else {
            room.lastUpdated = Date.now();
            rooms.set(roomId, room);
        }
    }
    
    res.json({ success: true });
});

// Claim host
app.post('/api/rooms/:roomId/claim-host', (req, res) => {
    const { roomId } = req.params;
    const { userId, userName } = req.body;
    
    const room = rooms.get(roomId);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user exists in room
    if (!room.participants[userId]) {
        return res.status(400).json({ error: 'User not in room' });
    }
    
    // Check if user is already host
    if (room.participants[userId].isHost) {
        return res.json({ success: false, message: '您已經是主持人了' });
    }
    
    // Remove host status from current host(s)
    Object.values(room.participants).forEach(participant => {
        participant.isHost = false;
    });
    
    // Make the requesting user the new host
    room.participants[userId].isHost = true;
    
    room.lastUpdated = Date.now();
    rooms.set(roomId, room);
    
    console.log(`User ${userName} (${userId}) claimed host for room ${roomId}`);
    
    res.json({ success: true, message: '成功奪取主持人權限' });
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