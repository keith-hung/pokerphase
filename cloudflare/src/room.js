/**
 * Room Durable Object
 * Manages room state and WebSocket connections for real-time sync
 */

export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // WebSocket sessions
    this.roomData = null;
    this.initializeRoom();
  }

  async initializeRoom() {
    // Load room data from durable storage
    this.roomData = await this.state.storage.get('roomData') || {
      participants: {},
      votes: {},
      votingActive: false,
      votesRevealed: false,
      currentIssue: "準備估算第一個故事",
      paperBalls: {},
      animations: [],
      lastUpdated: Date.now()
    };
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request);
    }

    // Handle API requests
    const path = url.pathname;
    const method = request.method;

    // Extract room ID from path
    const roomMatch = path.match(/^\/api\/rooms\/([A-Z0-9]+)(.*)$/);
    if (!roomMatch) {
      return new Response('Invalid path', { status: 400 });
    }

    const [, roomId, subPath] = roomMatch;
    
    try {
      await this.initializeRoom();

      switch (method) {
        case 'GET':
          if (subPath === '') {
            return this.handleGetRoom();
          }
          break;

        case 'POST':
          const body = await request.json().catch(() => ({}));
          
          switch (subPath) {
            case '':
              return this.handleUpdateRoom(body);
            case '/join':
              return this.handleJoinRoom(body);
            case '/vote':
              return this.handleVote(body);
            case '/reveal':
              return this.handleRevealVotes(body);
            case '/new-vote':
              return this.handleNewVote(body);
            case '/issue':
              return this.handleUpdateIssue(body);
            case '/paper-ball':
              return this.handlePaperBall(body);
            case '/leave':
              return this.handleLeaveRoom(body, url);
            case '/claim-host':
              return this.handleClaimHost(body);
          }
          break;
      }

      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  async handleWebSocketUpgrade(request) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user');
    const userName = url.searchParams.get('name');

    if (!userId) {
      return new Response('Missing user parameter', { status: 400 });
    }

    // Create WebSocket pair
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket connection
    server.accept();

    // Store the session
    const session = {
      webSocket: server,
      userId,
      userName,
      lastHeartbeat: Date.now()
    };

    this.sessions.set(userId, session);

    // Set up WebSocket event handlers
    server.addEventListener('message', (event) => {
      this.handleWebSocketMessage(userId, event);
    });

    server.addEventListener('close', () => {
      this.handleWebSocketClose(userId);
    });

    server.addEventListener('error', (error) => {
      console.error('WebSocket error for user', userId, error);
      this.sessions.delete(userId);
    });

    // Send initial room state
    this.sendToUser(userId, {
      type: 'room-state',
      data: this.roomData
    });

    // Set up heartbeat
    this.setupHeartbeat(userId);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  setupHeartbeat(userId) {
    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      const session = this.sessions.get(userId);
      if (!session) {
        clearInterval(heartbeatInterval);
        return;
      }

      try {
        session.webSocket.send(JSON.stringify({ type: 'heartbeat' }));
        
        // Check if user responded to heartbeat in last 60 seconds
        if (Date.now() - session.lastHeartbeat > 60000) {
          console.log('User', userId, 'failed heartbeat check, removing session');
          this.handleWebSocketClose(userId);
          clearInterval(heartbeatInterval);
        }
      } catch (error) {
        console.error('Error sending heartbeat to user', userId, error);
        this.handleWebSocketClose(userId);
        clearInterval(heartbeatInterval);
      }
    }, 30000);
  }

  handleWebSocketMessage(userId, event) {
    try {
      const message = JSON.parse(event.data);
      const session = this.sessions.get(userId);
      
      if (!session) return;

      switch (message.type) {
        case 'heartbeat-response':
          session.lastHeartbeat = Date.now();
          break;
        
        case 'request-room-state':
          this.sendToUser(userId, {
            type: 'room-state',
            data: this.roomData
          });
          break;
      }
    } catch (error) {
      console.error('Error handling WebSocket message from user', userId, error);
    }
  }

  async handleWebSocketClose(userId) {
    console.log('WebSocket closed for user', userId);
    this.sessions.delete(userId);
    
    // Remove user from room if they were a participant
    if (this.roomData.participants[userId]) {
      await this.removeParticipant(userId);
    }
  }

  // API Handlers
  async handleGetRoom() {
    return new Response(JSON.stringify(this.roomData), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleUpdateRoom(body) {
    if (!body.participants || !body.lastUpdated) {
      return new Response(JSON.stringify({ error: 'Invalid room data' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    this.roomData = {
      ...body,
      lastUpdated: Date.now()
    };

    await this.saveRoomData();
    await this.broadcastRoomState();

    return new Response(JSON.stringify({ 
      success: true, 
      room: this.roomData 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleJoinRoom(body) {
    const { user } = body;
    let isFirstParticipant = Object.keys(this.roomData.participants).length === 0;

    // Check if name is already taken
    const nameExists = Object.values(this.roomData.participants).some(p => p.name === user.name);
    if (nameExists) {
      return new Response(JSON.stringify({ error: 'Name already taken' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If this is the first participant, make them host
    const shouldBeHost = isFirstParticipant || user.isHost;

    // Add user to room
    this.roomData.participants[user.id] = {
      ...user,
      isHost: shouldBeHost,
      hasVoted: false,
      vote: null
    };

    this.roomData.lastUpdated = Date.now();
    await this.saveRoomData();
    await this.broadcastRoomState();

    return new Response(JSON.stringify({ 
      success: true, 
      room: this.roomData 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleVote(body) {
    const { userId, vote } = body;

    if (!this.roomData.participants[userId]) {
      return new Response(JSON.stringify({ error: 'User not in room' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update vote or remove if null (deselect)
    if (vote === null) {
      delete this.roomData.votes[userId];
      this.roomData.participants[userId].hasVoted = false;
      this.roomData.participants[userId].vote = null;
    } else {
      this.roomData.votes[userId] = vote;
      this.roomData.participants[userId].hasVoted = true;
      this.roomData.participants[userId].vote = vote;
    }

    this.roomData.lastUpdated = Date.now();
    await this.saveRoomData();
    await this.broadcastRoomState();

    return new Response(JSON.stringify({ 
      success: true, 
      room: this.roomData 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleRevealVotes(body) {
    const { userId } = body;
    const user = this.roomData.participants[userId];
    
    if (!user || !user.isHost) {
      return new Response(JSON.stringify({ error: 'Only host can reveal votes' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const votedCount = Object.values(this.roomData.participants).filter(p => p.hasVoted).length;
    if (votedCount === 0) {
      return new Response(JSON.stringify({ error: 'No votes to reveal' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    this.roomData.votesRevealed = true;
    this.roomData.lastUpdated = Date.now();
    await this.saveRoomData();
    await this.broadcastRoomState();

    return new Response(JSON.stringify({ 
      success: true, 
      room: this.roomData 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleNewVote(body) {
    const { userId } = body;
    const user = this.roomData.participants[userId];
    
    if (!user || !user.isHost) {
      return new Response(JSON.stringify({ error: 'Only host can start new vote' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Reset voting
    this.roomData.votes = {};
    this.roomData.votesRevealed = false;
    this.roomData.votingActive = true;
    this.roomData.paperBalls = {};
    this.roomData.animations = [];

    // Reset all participants' voting status
    Object.keys(this.roomData.participants).forEach(id => {
      this.roomData.participants[id].hasVoted = false;
      this.roomData.participants[id].vote = null;
    });

    this.roomData.lastUpdated = Date.now();
    await this.saveRoomData();
    await this.broadcastRoomState();

    return new Response(JSON.stringify({ 
      success: true, 
      room: this.roomData 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleUpdateIssue(body) {
    const { userId, issue } = body;
    const user = this.roomData.participants[userId];
    
    if (!user || !user.isHost) {
      return new Response(JSON.stringify({ error: 'Only host can update issue' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    this.roomData.currentIssue = issue;
    this.roomData.lastUpdated = Date.now();
    await this.saveRoomData();
    await this.broadcastRoomState();

    return new Response(JSON.stringify({ 
      success: true, 
      room: this.roomData 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handlePaperBall(body) {
    const { fromUserId, fromUserName, targetUserId, targetUserName, projectileType } = body;

    // Validate users exist in room
    if (!this.roomData.participants[fromUserId] || !this.roomData.participants[targetUserId]) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if target user hasn't voted yet (unless thrower is host)
    const throwerIsHost = this.roomData.participants[fromUserId] && this.roomData.participants[fromUserId].isHost;
    if (this.roomData.participants[targetUserId].hasVoted && !throwerIsHost) {
      return new Response(JSON.stringify({ error: 'Target user has already voted' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if votes are not revealed
    if (this.roomData.votesRevealed) {
      return new Response(JSON.stringify({ error: 'Voting round is over' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add boomerang notification
    if (!this.roomData.paperBalls) {
      this.roomData.paperBalls = {};
    }

    this.roomData.paperBalls[targetUserId] = {
      fromUserId,
      fromUserName,
      timestamp: Date.now()
    };

    // Add animation event
    if (!this.roomData.animations) {
      this.roomData.animations = [];
    }

    const animationEvent = {
      id: Date.now() + Math.random(),
      fromUserId,
      fromUserName,
      targetUserId,
      targetUserName,
      projectileType: projectileType || 'boomerang',
      timestamp: Date.now()
    };

    this.roomData.animations.push(animationEvent);

    this.roomData.lastUpdated = Date.now();
    await this.saveRoomData();
    await this.broadcastRoomState();

    // Clear the boomerang after 1 second
    setTimeout(async () => {
      if (this.roomData.paperBalls && this.roomData.paperBalls[targetUserId]) {
        delete this.roomData.paperBalls[targetUserId];
        await this.saveRoomData();
      }
    }, 1000);

    // Clear old animations after 10 seconds
    setTimeout(async () => {
      if (this.roomData.animations) {
        this.roomData.animations = this.roomData.animations.filter(
          anim => Date.now() - anim.timestamp < 10000
        );
        await this.saveRoomData();
      }
    }, 10000);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleLeaveRoom(body, url) {
    // Handle URL parameters (for sendBeacon) and JSON body
    let userId = url.searchParams.get('userId') || body.userId;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await this.removeParticipant(userId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleClaimHost(body) {
    const { userId, userName } = body;

    if (!this.roomData.participants[userId]) {
      return new Response(JSON.stringify({ error: 'User not in room' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (this.roomData.participants[userId].isHost) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: '您已經是主持人了' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Remove host status from current host(s)
    Object.values(this.roomData.participants).forEach(participant => {
      participant.isHost = false;
    });

    // Make the requesting user the new host
    this.roomData.participants[userId].isHost = true;

    this.roomData.lastUpdated = Date.now();
    await this.saveRoomData();
    await this.broadcastRoomState();

    console.log(`User ${userName} (${userId}) claimed host`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: '成功奪取主持人權限' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Helper methods
  async removeParticipant(userId) {
    if (this.roomData.participants[userId]) {
      const wasHost = this.roomData.participants[userId].isHost;
      delete this.roomData.participants[userId];

      // Remove user's vote if any
      if (this.roomData.votes[userId]) {
        delete this.roomData.votes[userId];
      }

      // Remove any pending paper balls for this user
      if (this.roomData.paperBalls && this.roomData.paperBalls[userId]) {
        delete this.roomData.paperBalls[userId];
      }

      // If the host left and there are still participants, make someone else host
      if (wasHost && Object.keys(this.roomData.participants).length > 0) {
        const remainingParticipants = Object.values(this.roomData.participants);
        const newHost = remainingParticipants[0];
        if (newHost) {
          const newHostId = Object.keys(this.roomData.participants)[0];
          this.roomData.participants[newHostId].isHost = true;
        }
      }

      this.roomData.lastUpdated = Date.now();
      await this.saveRoomData();
      await this.broadcastRoomState();

      // If room is empty, it will be cleaned up by Durable Object hibernation
      if (Object.keys(this.roomData.participants).length === 0) {
        console.log('Room is now empty, will be cleaned up by hibernation');
      }
    }
  }

  async saveRoomData() {
    await this.state.storage.put('roomData', this.roomData);
  }

  async broadcastRoomState() {
    const message = JSON.stringify({
      type: 'room-state',
      data: this.roomData
    });

    // Send to all connected WebSocket clients
    for (const [userId, session] of this.sessions) {
      try {
        session.webSocket.send(message);
      } catch (error) {
        console.error('Error broadcasting to user', userId, error);
        // Remove failed session
        this.sessions.delete(userId);
      }
    }
  }

  sendToUser(userId, message) {
    const session = this.sessions.get(userId);
    if (session) {
      try {
        session.webSocket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message to user', userId, error);
        this.sessions.delete(userId);
      }
    }
  }
}