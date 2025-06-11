class PlanningPoker {
    constructor() {
        this.currentRoom = null;
        this.currentUser = null;
        this.participants = new Map();
        this.votes = new Map();
        this.isHost = false;
        this.votingActive = false;
        this.votesRevealed = false;
        this.currentIssue = "準備估算第一個故事";
        this.apiBase = window.location.origin + '/api';
        this.currentProjectile = 'boomerang'; // Default projectile
        this.playedAnimations = new Set(); // Track played animations to avoid duplicates
        
        // Track UI state to avoid unnecessary updates
        this.lastUIState = {
            participantsHash: '',
            votingActive: false,
            votesRevealed: false,
            currentIssue: '',
            participantsCount: 0
        };
        
        this.initializeEventListeners();
        this.updateParticipantsCount(); // Hide participants count initially
        this.checkForRoomInURL();
    }

    initializeEventListeners() {
        // Welcome screen buttons
        document.getElementById('createRoomBtn').addEventListener('click', () => this.createRoom());
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.showJoinRoomModal());
        
        // Name modal
        document.getElementById('confirmNameBtn').addEventListener('click', () => this.confirmName());
        document.getElementById('userNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.confirmName();
        });
        
        // Voting cards
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => this.selectCard(card.dataset.value));
        });
        
        // Game controls
        document.getElementById('revealBtn').addEventListener('click', () => this.revealVotes());
        document.getElementById('revoteBtn').addEventListener('click', () => this.startNewVoting());
        document.getElementById('nextIssueBtn').addEventListener('click', () => this.nextIssue());
        document.getElementById('copyRoomLinkBtn').addEventListener('click', () => this.copyRoomLink());
        document.getElementById('claimHostBtn').addEventListener('click', () => this.claimHost());
        
        // Room ID input
        document.getElementById('roomIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.showJoinRoomModal();
        });
        
        // Boomerang notification click to close
        document.getElementById('paperBallNotification').addEventListener('click', () => {
            this.hidePaperBallNotification();
        });
        
        // Projectile selection
        document.querySelectorAll('.projectile-option').forEach(option => {
            option.addEventListener('click', () => this.selectProjectile(option.dataset.type));
        });
        
        // Handle page unload (user closes window/tab)
        window.addEventListener('beforeunload', () => {
            this.leaveRoom();
        });
        
        // Handle visibility change (user switches tab)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Optional: Could also handle tab switching
                // this.leaveRoom();
            }
        });
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    generateUserId() {
        return Math.random().toString(36).substring(2, 10);
    }

    checkForRoomInURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        if (roomId) {
            document.getElementById('roomIdInput').value = roomId;
            this.showJoinRoomModal();
        }
    }

    createRoom() {
        this.currentRoom = this.generateRoomId();
        this.isHost = true;
        this.showNameModal('create');
    }

    showJoinRoomModal() {
        const roomId = document.getElementById('roomIdInput').value.trim().toUpperCase();
        if (!roomId) {
            alert('請輸入房間 ID');
            return;
        }
        this.currentRoom = roomId;
        // Don't set isHost here, let server decide based on room state
        this.showNameModal('join');
    }

    showNameModal(action) {
        const modal = document.getElementById('nameModal');
        modal.style.display = 'flex';
        document.getElementById('userNameInput').focus();
        modal.dataset.action = action;
    }

    async confirmName() {
        const userName = document.getElementById('userNameInput').value.trim();
        if (!userName) {
            alert('請輸入您的姓名');
            return;
        }
        
        if (userName.length > 20) {
            alert('姓名不能超過 20 個字符');
            return;
        }

        this.currentUser = {
            id: this.generateUserId(),
            name: userName,
            isHost: this.isHost
        };

        try {
            // Join room via API
            const response = await fetch(`${this.apiBase}/rooms/${this.currentRoom}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user: this.currentUser
                })
            });

            if (!response.ok) {
                const error = await response.json();
                alert(error.error || '加入房間失敗');
                return;
            }

            const data = await response.json();
            
            // Update isHost status based on server response
            if (data.room.participants && data.room.participants[this.currentUser.id]) {
                this.isHost = data.room.participants[this.currentUser.id].isHost;
                this.currentUser.isHost = this.isHost;
            }
            
            this.updateRoomFromServer(data.room);

            // Hide modal
            document.getElementById('nameModal').style.display = 'none';
            
            // Show game screen
            this.showGameScreen();
        } catch (error) {
            console.error('Error joining room:', error);
            alert('網路錯誤，請稍後再試');
        }
    }

    updateRoomFromServer(roomData) {
        // Update participants
        this.participants.clear();
        if (roomData.participants) {
            Object.entries(roomData.participants).forEach(([id, participant]) => {
                this.participants.set(id, participant);
            });
        }
        
        // Update votes
        this.votes.clear();
        if (roomData.votes) {
            Object.entries(roomData.votes).forEach(([id, vote]) => {
                this.votes.set(id, vote);
            });
        }
        
        // Removed: No longer show notification messages to targets
        // The animation itself is the notification
        
        // Process animation events for all clients
        if (roomData.animations && roomData.animations.length > 0) {
            console.log(`Received ${roomData.animations.length} animation events:`, roomData.animations);
            this.processAnimationEvents(roomData.animations);
        }
        
        // Update room state
        this.votingActive = roomData.votingActive || false;
        this.votesRevealed = roomData.votesRevealed || false;
        this.currentIssue = roomData.currentIssue || "準備估算第一個故事";
        
        // Update current user's host status based on server data
        if (this.currentUser && roomData.participants[this.currentUser.id]) {
            this.isHost = roomData.participants[this.currentUser.id].isHost;
        }
        
        this.updateUI();
    }

    showGameScreen() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'grid';
        document.getElementById('currentRoomId').textContent = this.currentRoom;
        
        // Update URL
        const newURL = new URL(window.location);
        newURL.searchParams.set('room', this.currentRoom);
        window.history.replaceState({}, '', newURL);
        
        this.updateUI();
        this.startPolling();
    }

    startPolling() {
        // Poll for updates every 2 seconds
        this.pollInterval = setInterval(() => {
            this.checkForUpdates();
        }, 2000);
    }

    async checkForUpdates() {
        try {
            const response = await fetch(`${this.apiBase}/rooms/${this.currentRoom}`);
            
            if (response.ok) {
                const roomData = await response.json();
                this.updateRoomFromServer(roomData);
            } else if (response.status === 404) {
                // Room no longer exists, return to welcome screen
                this.handleRoomClosed();
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }

    handleRoomClosed() {
        // Stop polling
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        
        // Reset application state
        this.currentRoom = null;
        this.currentUser = null;
        this.participants.clear();
        this.votes.clear();
        this.isHost = false;
        this.votingActive = false;
        this.votesRevealed = false;
        this.currentIssue = "準備估算第一個故事";
        this.playedAnimations.clear();
        
        // Show welcome screen
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'flex';
        
        // Clear URL parameters
        const newURL = new URL(window.location);
        newURL.searchParams.delete('room');
        window.history.replaceState({}, '', newURL);
        
        // Show notification
        this.showToast('房間已關閉，已返回主畫面');
    }

    updateUI() {
        // Generate current state hash for comparison
        const currentState = this.generateUIStateHash();
        
        // Only update components that have actually changed
        if (currentState.participantsHash !== this.lastUIState.participantsHash) {
            this.updateParticipantsList();
            this.updateParticipantsCount();
        }
        
        // Current issue display removed
        
        if (currentState.votingActive !== this.lastUIState.votingActive || 
            currentState.votesRevealed !== this.lastUIState.votesRevealed ||
            currentState.participantsHash !== this.lastUIState.participantsHash) {
            this.updateVotingStatus();
            this.updateCards();
        }
        
        if (currentState.votesRevealed !== this.lastUIState.votesRevealed) {
            this.updateResults();
        }
        
        // Update all host-related buttons whenever host status might have changed
        this.updateAllHostButtons();
        
        // Update last state
        this.lastUIState = currentState;
    }

    generateUIStateHash() {
        // Create a hash representing the current UI state
        const participantsData = Array.from(this.participants.entries()).map(([id, participant]) => ({
            id,
            name: participant.name,
            hasVoted: participant.hasVoted,
            isHost: participant.isHost
        }));
        
        const participantsHash = JSON.stringify(participantsData) + '|' + JSON.stringify(Object.fromEntries(this.votes));
        
        return {
            participantsHash,
            votingActive: this.votingActive,
            votesRevealed: this.votesRevealed,
            currentIssue: this.currentIssue,
            participantsCount: this.participants.size
        };
    }

    updateParticipantsList() {
        const container = document.getElementById('participantsList');
        container.innerHTML = '';
        
        this.participants.forEach(participant => {
            const item = document.createElement('div');
            item.className = 'participant-item';
            
            if (participant.hasVoted) {
                item.classList.add('voted');
            }
            
            if (participant.isHost) {
                item.classList.add('host');
            }
            
            // Check if boomerang can be thrown
            // Anyone can throw to non-voters, hosts can throw to anyone (except themselves)
            // When all voted but not revealed, anyone can throw to host
            const allVotedButNotRevealed = this.allParticipantsVoted() && !this.votesRevealed;
            const canThrowBoomerang = !this.votesRevealed && participant.id !== this.currentUser.id && 
                                    (!participant.hasVoted || this.isHost || (allVotedButNotRevealed && participant.isHost));
            
            // Make the entire item clickable if boomerang can be thrown
            if (canThrowBoomerang) {
                item.classList.add('throwable-item');
                item.setAttribute('onclick', `window.planningPoker.throwBoomerang('${participant.id}', '${this.escapeHtml(participant.name)}', event)`);
                item.style.cursor = 'pointer';
            }
            
            item.innerHTML = `
                <span class="participant-name ${canThrowBoomerang ? 'throwable' : ''}">${this.escapeHtml(participant.name)}</span>
                <span class="participant-status ${participant.hasVoted ? 'voted' : ''}">
                    ${participant.isHost ? '主持人' : ''}
                    ${participant.hasVoted ? '已投票' : '等待中'}
                </span>
            `;
            
            container.appendChild(item);
        });
    }

    updateParticipantsCount() {
        const count = this.participants.size;
        const participantsCountElement = document.getElementById('participantsCount');
        
        // Hide participants count when not in a room
        if (!this.currentRoom || !this.currentUser) {
            participantsCountElement.style.display = 'none';
        } else {
            participantsCountElement.style.display = 'block';
            participantsCountElement.textContent = `${count} participants`;
        }
    }

    updateAllHostButtons() {
        // Update claim host button
        const claimHostBtn = document.getElementById('claimHostBtn');
        const revealBtn = document.getElementById('revealBtn');
        const revoteBtn = document.getElementById('revoteBtn');
        const nextIssueBtn = document.getElementById('nextIssueBtn');
        
        // Show claim host button only if user is in a room and is not the host
        if (this.currentRoom && this.currentUser && !this.isHost) {
            claimHostBtn.style.display = 'inline-block';
        } else {
            claimHostBtn.style.display = 'none';
        }
        
        // Update voting control buttons based on current state
        if (this.isHost) {
            // Handle reveal button based on voting state
            if (this.votesRevealed) {
                revealBtn.style.display = 'none';
                revoteBtn.style.display = 'inline-block';
                nextIssueBtn.style.display = 'inline-block';
            } else if (this.allParticipantsVoted()) {
                revealBtn.style.display = 'inline-block';
                revealBtn.textContent = '揭示結果';
                revoteBtn.style.display = 'none';
                nextIssueBtn.style.display = 'none';
            } else {
                const votedCount = Array.from(this.participants.values()).filter(p => p.hasVoted).length;
                if (votedCount > 0) {
                    revealBtn.style.display = 'inline-block';
                    revealBtn.textContent = '強制開票';
                } else {
                    revealBtn.style.display = 'none';
                }
                revoteBtn.style.display = 'none';
                nextIssueBtn.style.display = 'none';
            }
        } else {
            // Non-host users should not see any host controls
            revealBtn.style.display = 'none';
            revoteBtn.style.display = 'none';
            nextIssueBtn.style.display = 'none';
        }
    }

    // updateCurrentIssue() method removed - no longer displaying current issue

    updateVotingStatus() {
        const progressElement = document.getElementById('votingProgress');
        const resultsSection = document.getElementById('resultsSection');
        
        if (this.votesRevealed) {
            progressElement.textContent = '';
            resultsSection.style.display = 'block';
        } else if (this.allParticipantsVoted()) {
            progressElement.textContent = '所有人已投票，可以揭示結果';
            resultsSection.style.display = 'none';
        } else {
            const votedCount = Array.from(this.participants.values()).filter(p => p.hasVoted).length;
            const totalCount = this.participants.size;
            
            if (votedCount > 0) {
                progressElement.textContent = `投票中... (${votedCount}/${totalCount}) - 主持人可強制開票`;
            } else {
                progressElement.textContent = `等待投票中... (${votedCount}/${totalCount})`;
            }
            resultsSection.style.display = 'none';
        }
    }

    updateCards() {
        const cards = document.querySelectorAll('.card');
        const currentUserVote = this.votes.get(this.currentUser.id);
        
        cards.forEach(card => {
            card.classList.remove('selected', 'disabled');
            
            if (this.votesRevealed) {
                card.classList.add('disabled');
            } else if (currentUserVote && card.dataset.value === currentUserVote) {
                card.classList.add('selected');
            }
        });
    }

    updateResults() {
        if (!this.votesRevealed) return;
        
        const container = document.getElementById('resultsContainer');
        container.innerHTML = '';
        
        const voteValues = Array.from(this.votes.values()).filter(v => v !== '?');
        const numericVotes = voteValues.filter(v => !isNaN(v)).map(Number);
        
        let highestVote = null;
        let lowestVote = null;
        
        if (numericVotes.length > 0) {
            highestVote = Math.max(...numericVotes).toString();
            lowestVote = Math.min(...numericVotes).toString();
        }
        
        // Show all participants, including those who didn't vote
        this.participants.forEach(participant => {
            const item = document.createElement('div');
            item.className = 'result-item';
            
            let displayValue;
            let hasVote = false;
            
            if (this.votes.has(participant.id)) {
                displayValue = this.votes.get(participant.id);
                hasVote = true;
                
                // Apply highest/lowest styling only to numeric votes
                if (displayValue === highestVote && numericVotes.length > 1) {
                    item.classList.add('highest');
                } else if (displayValue === lowestVote && numericVotes.length > 1) {
                    item.classList.add('lowest');
                }
            } else {
                displayValue = '未投票';
                item.classList.add('no-vote');
            }
            
            item.innerHTML = `
                <div class="result-participant">${this.escapeHtml(participant.name)}</div>
                <div class="result-value ${hasVote ? '' : 'no-vote-text'}">${displayValue}</div>
            `;
            
            container.appendChild(item);
        });
        
        // Button visibility is now handled by updateAllHostButtons()
    }

    async selectCard(value) {
        if (this.votesRevealed) return;
        
        // Check if clicking the same card to deselect
        const currentVote = this.votes.get(this.currentUser.id);
        let voteValue = value;
        
        if (currentVote === value) {
            // Deselect by sending null vote
            voteValue = null;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/rooms/${this.currentRoom}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    vote: voteValue
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.updateRoomFromServer(data.room);
            }
        } catch (error) {
            console.error('Error submitting vote:', error);
        }
    }

    allParticipantsVoted() {
        return Array.from(this.participants.values()).every(p => p.hasVoted);
    }

    async revealVotes() {
        if (!this.isHost) return;
        
        // Check if at least one person has voted (for force reveal)
        const votedCount = Array.from(this.participants.values()).filter(p => p.hasVoted).length;
        if (votedCount === 0) return;
        
        try {
            const response = await fetch(`${this.apiBase}/rooms/${this.currentRoom}/reveal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.updateRoomFromServer(data.room);
            }
        } catch (error) {
            console.error('Error revealing votes:', error);
        }
    }

    async startNewVoting() {
        if (!this.isHost) return;
        
        try {
            const response = await fetch(`${this.apiBase}/rooms/${this.currentRoom}/new-vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.updateRoomFromServer(data.room);
            }
        } catch (error) {
            console.error('Error starting new vote:', error);
        }
    }

    async nextIssue() {
        if (!this.isHost) return;
        
        // For demo purposes, just increment issue number
        let newIssue = this.currentIssue;
        const issueMatch = this.currentIssue.match(/\d+/);
        if (issueMatch) {
            const num = parseInt(issueMatch[0]) + 1;
            newIssue = this.currentIssue.replace(/\d+/, num);
        } else {
            newIssue = "準備估算下一個故事";
        }
        
        try {
            // Update issue first
            const issueResponse = await fetch(`${this.apiBase}/rooms/${this.currentRoom}/issue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    issue: newIssue
                })
            });

            if (issueResponse.ok) {
                // Then start new voting
                const voteResponse = await fetch(`${this.apiBase}/rooms/${this.currentRoom}/new-vote`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: this.currentUser.id
                    })
                });

                if (voteResponse.ok) {
                    const data = await voteResponse.json();
                    this.updateRoomFromServer(data.room);
                }
            }
        } catch (error) {
            console.error('Error moving to next issue:', error);
        }
    }

    copyRoomLink() {
        const url = new URL(window.location);
        url.searchParams.set('room', this.currentRoom);
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url.toString()).then(() => {
                this.showToast('房間連結已複製到剪貼板');
            }).catch(() => {
                this.fallbackCopyTextToClipboard(url.toString());
            });
        } else {
            this.fallbackCopyTextToClipboard(url.toString());
        }
    }

    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showToast('房間連結已複製到剪貼板');
            } else {
                this.showToast('複製失敗，請手動複製連結');
            }
        } catch (err) {
            this.showToast('複製失敗，請手動複製連結');
        }
        
        document.body.removeChild(textArea);
    }

    async claimHost() {
        if (!this.currentRoom || !this.currentUser) {
            this.showToast('無法奪取主持人：未加入房間');
            return;
        }

        if (this.isHost) {
            this.showToast('您已經是主持人了');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/rooms/${this.currentRoom}/claim-host`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    userName: this.currentUser.name
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.isHost = true;
                    this.showToast('成功奪取主持人權限！');
                    // Trigger UI update
                    this.checkForUpdates();
                } else {
                    this.showToast(result.message || '奪取主持人失敗');
                }
            } else {
                this.showToast('奪取主持人失敗：伺服器錯誤');
            }
        } catch (error) {
            console.error('Error claiming host:', error);
            this.showToast('奪取主持人失敗：網路錯誤');
        }
    }

    showToast(message) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 1001;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    selectProjectile(type) {
        this.currentProjectile = type;
        
        // Update UI
        document.querySelectorAll('.projectile-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        
        // Update current selection display
        const projectileData = {
            boomerang: '🪃 迴力鏢',
            rocket: '🚀 火箭',
            stone: '🪨 石頭'
        };
        document.getElementById('currentProjectile').textContent = projectileData[type];
    }

    async throwBoomerang(targetUserId, targetUserName, event) {
        try {
            const response = await fetch(`${this.apiBase}/rooms/${this.currentRoom}/paper-ball`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fromUserId: this.currentUser.id,
                    fromUserName: this.currentUser.name,
                    targetUserId: targetUserId,
                    targetUserName: targetUserName,
                    projectileType: this.currentProjectile
                })
            });

            if (response.ok) {
                // No feedback to thrower to avoid distraction
                console.log(`Projectile thrown to ${targetUserName}`);
            }
        } catch (error) {
            console.error('Error throwing boomerang:', error);
        }
    }

    findParticipantElement(targetName) {
        // Find the target participant element in the DOM
        const participantItems = document.querySelectorAll('.participant-item');
        for (const item of participantItems) {
            const nameElement = item.querySelector('.participant-name');
            if (nameElement && nameElement.textContent === targetName) {
                return item;
            }
        }
        return null;
    }

    showProjectileAnimation(event, targetElement, projectileType = 'boomerang') {
        // Find the thrower's element (current user) in the participant list
        const throwerElement = this.findParticipantElement(this.currentUser.name);
        
        // Get starting position from thrower's div center
        let startX, startY;
        if (throwerElement) {
            const throwerRect = throwerElement.getBoundingClientRect();
            startX = throwerRect.left + throwerRect.width / 2;
            startY = throwerRect.top + throwerRect.height / 2;
        } else {
            // Fallback: find current user in participants list
            const participantItems = document.querySelectorAll('.participant-item');
            let foundThrower = false;
            for (const item of participantItems) {
                const nameElement = item.querySelector('.participant-name');
                if (nameElement && nameElement.textContent.trim() === this.currentUser.name.trim()) {
                    const rect = item.getBoundingClientRect();
                    startX = rect.left + rect.width / 2;
                    startY = rect.top + rect.height / 2;
                    foundThrower = true;
                    break;
                }
            }
            
            if (!foundThrower) {
                // Final fallback to click position
                startX = event.clientX;
                startY = event.clientY;
            }
        }
        
        // Get target position (center of target's div)
        let targetX, targetY;
        if (targetElement) {
            const targetRect = targetElement.getBoundingClientRect();
            targetX = targetRect.left + targetRect.width / 2;
            targetY = targetRect.top + targetRect.height / 2;
        } else {
            // Fallback if target not found - use a position relative to thrower
            const isMobile = window.innerWidth <= 768;
            targetX = startX + (isMobile ? 180 : 250);
            targetY = startY + (isMobile ? -80 : -120);
        }
        
        // Create projectile element
        const projectile = document.createElement('div');
        const projectileData = {
            boomerang: { icon: '🪃', class: 'flying-boomerang' },
            rocket: { icon: '🚀', class: 'flying-rocket' },
            stone: { icon: '🪨', class: 'flying-stone' }
        };
        
        projectile.className = projectileData[projectileType].class;
        projectile.innerHTML = projectileData[projectileType].icon;
        projectile.style.left = startX + 'px';
        projectile.style.top = startY + 'px';
        
        document.body.appendChild(projectile);
        
        // Generate animation based on projectile type
        const screenWidth = window.innerWidth;
        let keyframes, animationName, duration;

        if (projectileType === 'boomerang') {
            // Elliptical boomerang path
            const flightWidth = screenWidth * 0.4;
            const flightHeight = screenWidth * 0.2;
            
            const generateEllipticalPath = () => {
                const points = [];
                const steps = 20;
                
                for (let i = 0; i <= steps; i++) {
                    const t = (i / steps) * Math.PI;
                    const progress = i / steps;
                    
                    const ellipseX = flightWidth * Math.cos(t);
                    const ellipseY = -flightHeight * Math.sin(t);
                    
                    const blendFactor = progress > 0.8 ? (progress - 0.8) / 0.2 : 0;
                    const finalX = ellipseX * (1 - blendFactor) + (targetX - startX) * blendFactor;
                    const finalY = ellipseY * (1 - blendFactor) + (targetY - startY) * blendFactor;
                    
                    const rotation = progress * 2880;
                    const scale = 1 + Math.sin(progress * Math.PI) * 0.3;
                    
                    points.push({
                        x: finalX, y: finalY, rotation: rotation, scale: scale,
                        percent: Math.round(progress * 100)
                    });
                }
                return points;
            };

            const pathPoints = generateEllipticalPath();
            let keyframesContent = '';
            pathPoints.forEach(point => {
                keyframesContent += `${point.percent}% {
                    transform: translate(${point.x}px, ${point.y}px) rotate(${point.rotation}deg) scale(${point.scale});
                }`;
            });

            keyframes = `@keyframes boomerangEllipse { ${keyframesContent} }`;
            animationName = 'boomerangEllipse';
            duration = '1.2s';
            
        } else if (projectileType === 'rocket') {
            // Rocket path: thrower center → 3/4 screen width → target center
            const midPointX = screenWidth * 0.75; // 3/4 screen width (absolute position)
            const midPointY = startY - 80; // Slightly higher than start
            
            // Calculate angle to target for final direction
            const deltaX = targetX - midPointX;
            const deltaY = targetY - midPointY;
            const angleToTarget = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            
            keyframes = `
                @keyframes rocketFlight {
                    0% { 
                        transform: translate(0px, 0px) rotate(45deg) scale(1);
                        opacity: 0.8;
                    }
                    50% { 
                        transform: translate(${midPointX - startX}px, ${midPointY - startY}px) rotate(0deg) scale(1.2);
                        opacity: 1;
                    }
                    100% { 
                        transform: translate(${targetX - startX}px, ${targetY - startY}px) rotate(${angleToTarget}deg) scale(1.5);
                        opacity: 1;
                    }
                }`;
            animationName = 'rocketFlight';
            duration = '1.4s';
            
        } else if (projectileType === 'stone') {
            // Meteor from top-right corner of screen to target center
            const meteorStartX = screenWidth - 50; // Top-right corner (absolute position)
            const meteorStartY = 50; // Top edge
            
            keyframes = `
                @keyframes stoneFlight {
                    0% { 
                        transform: translate(${meteorStartX - startX}px, ${meteorStartY - startY}px) rotate(225deg) scale(0.6);
                        opacity: 0.5;
                        filter: drop-shadow(2px 2px 8px rgba(255, 100, 0, 0.8));
                    }
                    30% { 
                        opacity: 1;
                        filter: drop-shadow(3px 3px 12px rgba(255, 150, 0, 1));
                    }
                    100% { 
                        transform: translate(${targetX - startX}px, ${targetY - startY}px) rotate(225deg) scale(1.3);
                        opacity: 1;
                        filter: drop-shadow(4px 4px 16px rgba(255, 0, 0, 0.8));
                    }
                }`;
            animationName = 'stoneFlight';
            duration = '1.1s';
        }
        
        // Add keyframes to document
        const styleSheet = document.createElement('style');
        styleSheet.textContent = keyframes;
        document.head.appendChild(styleSheet);
        
        // Apply animation based on projectile type
        projectile.style.animation = `${animationName} ${duration} cubic-bezier(0.25, 0.1, 0.25, 1) forwards`;
        
        // Calculate timing based on duration
        const durationMs = parseFloat(duration) * 1000;
        
        // Add impact effect
        setTimeout(() => {
            projectile.style.animation = 'none';
            this.createImpactEffect(targetX, targetY);
            projectile.style.transform = `translate(${targetX - startX}px, ${targetY - startY}px) scale(0.5)`;
            projectile.style.opacity = '0.3';
            
            // Add hit effect to target element
            if (targetElement) {
                this.addHitEffect(targetElement);
            }
        }, durationMs);
        
        // Final fade out
        setTimeout(() => {
            projectile.style.transition = 'opacity 0.5s ease-out';
            projectile.style.opacity = '0';
        }, durationMs + 400);
        
        // Clean up
        setTimeout(() => {
            if (document.head.contains(styleSheet)) {
                document.head.removeChild(styleSheet);
            }
        }, durationMs + 700);
        
        // Clean up projectile element
        setTimeout(() => {
            if (document.body.contains(projectile)) {
                document.body.removeChild(projectile);
            }
        }, durationMs + 1000);
    }

    createImpactEffect(x, y) {
        // Create multiple impact effects for more dramatic effect
        const effects = ['💥', '⭐', '💫', '✨'];
        
        effects.forEach((emoji, index) => {
            const impact = document.createElement('div');
            impact.className = 'boomerang-impact';
            impact.innerHTML = emoji;
            impact.style.left = (x + (Math.random() - 0.5) * 40) + 'px';
            impact.style.top = (y + (Math.random() - 0.5) * 40) + 'px';
            impact.style.animationDelay = (index * 0.1) + 's';
            
            document.body.appendChild(impact);
            
            // Remove impact effect after animation
            setTimeout(() => {
                if (document.body.contains(impact)) {
                    document.body.removeChild(impact);
                }
            }, 1200 + (index * 100));
        });
        
        // Add screen shake effect
        document.body.style.animation = 'screenShake 0.5s ease-in-out';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 500);
    }

    addHitEffect(targetElement) {
        // Add hit effect class to target element
        targetElement.classList.add('participant-hit');
        
        // Remove the hit effect after 2 seconds
        setTimeout(() => {
            targetElement.classList.remove('participant-hit');
        }, 2000);
    }

    showPaperBallNotification(fromUserName) {
        const notification = document.getElementById('paperBallNotification');
        const message = document.querySelector('.paper-ball-message');
        
        const messages = [
            `${fromUserName} 向你丟了回力鏢！快點選卡片吧！ 🎯`,
            `${fromUserName} 提醒你該投票囉！別讓大家等太久～ 🪃💥`,
            `來自 ${fromUserName} 的愛心回力鏢：該選卡片了！ 💝`,
            `${fromUserName} 說：「快選卡片，不要發呆！」 ⚡`,
            `${fromUserName} 用回力鏢催促你投票中... 🪃⚡`
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        message.textContent = randomMessage;
        
        notification.style.display = 'flex';
        
        // Auto hide after 4 seconds
        setTimeout(() => {
            this.hidePaperBallNotification();
        }, 4000);
    }

    hidePaperBallNotification() {
        const notification = document.getElementById('paperBallNotification');
        notification.style.display = 'none';
    }

    processAnimationEvents(animations) {
        if (!animations || animations.length === 0) return;
        
        // Process new animations that haven't been played yet
        animations.forEach(animation => {
            // Only play animations that are recent (within 8 seconds) and not already played
            const isRecent = Date.now() - animation.timestamp < 8000;
            const notPlayed = !this.playedAnimations.has(animation.id);
            
            if (isRecent && notPlayed) {
                this.playedAnimations.add(animation.id);
                
                console.log(`Playing animation: ${animation.fromUserName} -> ${animation.targetUserName} (${animation.projectileType})`);
                
                // Find elements for the animation
                const throwerElement = this.findParticipantElement(animation.fromUserName);
                const targetElement = this.findParticipantElement(animation.targetUserName);
                
                console.log(`Elements found: thrower=${!!throwerElement}, target=${!!targetElement}`);
                
                if (throwerElement && targetElement) {
                    // Create a synthetic event for the animation
                    const syntheticEvent = {
                        clientX: throwerElement.getBoundingClientRect().left + throwerElement.getBoundingClientRect().width / 2,
                        clientY: throwerElement.getBoundingClientRect().top + throwerElement.getBoundingClientRect().height / 2
                    };
                    
                    // Play the animation for all clients
                    this.showProjectileAnimation(syntheticEvent, targetElement, animation.projectileType);
                } else {
                    console.warn(`Could not find elements for animation: thrower=${!!throwerElement}, target=${!!targetElement}`);
                    console.warn(`Thrower name: "${animation.fromUserName}", Target name: "${animation.targetUserName}"`);
                    console.warn('Available participants:', Array.from(this.participants.values()).map(p => p.name));
                }
            }
        });
        
        // Clean up old animation IDs to prevent memory leak
        if (this.playedAnimations.size > 100) {
            const animationIds = new Set(animations.map(a => a.id));
            this.playedAnimations = new Set([...this.playedAnimations].filter(id => animationIds.has(id)));
        }
    }

    async leaveRoom() {
        if (!this.currentRoom || !this.currentUser) return;
        
        try {
            // Use sendBeacon with URL parameters (more reliable for beforeunload)
            const url = `${this.apiBase}/rooms/${this.currentRoom}/leave?userId=${encodeURIComponent(this.currentUser.id)}`;
            navigator.sendBeacon(url);
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    }

    destroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        // Leave room when destroying
        this.leaveRoom();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.planningPoker = new PlanningPoker();
});

// Clean up when page is unloaded
window.addEventListener('beforeunload', () => {
    if (window.planningPoker) {
        window.planningPoker.destroy();
    }
});

// Add some additional CSS for toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);