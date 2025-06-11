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
        
        this.initializeEventListeners();
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
        
        // Room ID input
        document.getElementById('roomIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.showJoinRoomModal();
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
        this.isHost = false;
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
        
        // Update room state
        this.votingActive = roomData.votingActive || false;
        this.votesRevealed = roomData.votesRevealed || false;
        this.currentIssue = roomData.currentIssue || "準備估算第一個故事";
        
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
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }

    updateUI() {
        this.updateParticipantsList();
        this.updateParticipantsCount();
        this.updateCurrentIssue();
        this.updateVotingStatus();
        this.updateCards();
        this.updateResults();
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
            
            item.innerHTML = `
                <span class="participant-name">${this.escapeHtml(participant.name)}</span>
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
        document.getElementById('participantsCount').textContent = `${count} participants`;
    }

    updateCurrentIssue() {
        document.querySelector('.issue-title').textContent = this.currentIssue;
    }

    updateVotingStatus() {
        const progressElement = document.getElementById('votingProgress');
        const revealBtn = document.getElementById('revealBtn');
        const resultsSection = document.getElementById('resultsSection');
        
        if (this.votesRevealed) {
            progressElement.textContent = '投票結果已揭示';
            revealBtn.style.display = 'none';
            resultsSection.style.display = 'block';
        } else if (this.allParticipantsVoted()) {
            progressElement.textContent = '所有人已投票，可以揭示結果';
            if (this.isHost) {
                revealBtn.style.display = 'block';
            }
            resultsSection.style.display = 'none';
        } else {
            const votedCount = Array.from(this.participants.values()).filter(p => p.hasVoted).length;
            const totalCount = this.participants.size;
            progressElement.textContent = `等待投票中... (${votedCount}/${totalCount})`;
            revealBtn.style.display = 'none';
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
        
        this.participants.forEach(participant => {
            if (this.votes.has(participant.id)) {
                const vote = this.votes.get(participant.id);
                const item = document.createElement('div');
                item.className = 'result-item';
                
                if (vote === highestVote && numericVotes.length > 1) {
                    item.classList.add('highest');
                } else if (vote === lowestVote && numericVotes.length > 1) {
                    item.classList.add('lowest');
                }
                
                item.innerHTML = `
                    <div class="result-participant">${this.escapeHtml(participant.name)}</div>
                    <div class="result-value">${vote}</div>
                `;
                
                container.appendChild(item);
            }
        });
    }

    async selectCard(value) {
        if (this.votesRevealed) return;
        
        try {
            const response = await fetch(`${this.apiBase}/rooms/${this.currentRoom}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    vote: value
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
        if (!this.isHost || !this.allParticipantsVoted()) return;
        
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

    destroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
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