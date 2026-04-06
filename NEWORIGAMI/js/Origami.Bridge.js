class OrigamiBridge {
    constructor(renderer) {
        this.renderer = renderer;
        this.state = {
            dungeon: null,
            currentRoomId: null,
            playerPos: { x: 0, y: 0 }
        };
        console.log("OrigamiBridge: Initialized");
    }

    init() {
        window.addEventListener('message', this.handleMessage.bind(this));
        console.log("OrigamiBridge: Listening for messages...");
        this.sendReady();
    }

    sendReady() {
        // Handshake: Tell Adventure we are ready
        const adventureFrame = document.getElementById('adventure-frame');
        if (adventureFrame && adventureFrame.contentWindow) {
            console.log("OrigamiBridge: Sending BRIDGE_READY");
            adventureFrame.contentWindow.postMessage({ type: 'BRIDGE_READY' }, '*');
        } else {
            console.warn("OrigamiBridge: Adventure Frame not found or not ready");
        }
    }

    handleMessage(event) {
        const { type, payload } = event.data;
        // console.log("Bridge Received:", type, payload);

        switch(type) {
            case 'SYNC_DUNGEON': 
                this.syncDungeon(payload); 
                break;
            case 'PLAYER_MOVE': 
                this.updatePlayer(payload); 
                break;
            case 'SET_ROOM': // Legacy support / Initial load
                this.enterRoom(payload);
                break;
        }
    }

    syncDungeon(data) {
        console.log("Bridge: Syncing Dungeon...", data);
        if (!data) { console.error("Bridge: Received null dungeon data"); return; }
        if (Array.isArray(data)) {
            console.log(`Bridge: Received Array of ${data.length} rooms`);
        } else if (data.rooms) {
            console.log(`Bridge: Received Object with ${data.rooms.length} rooms`);
        } else {
            console.warn("Bridge: Received unknown data structure", data);
        }

        this.state.dungeon = data;
        if (this.renderer && this.renderer.buildDungeon) {
            this.renderer.buildDungeon(data);
        } else {
            console.error("Bridge: Renderer not ready or missing buildDungeon method");
        }
    }

    updatePlayer(pos) {
        // pos: { x, y, facing }
        // console.log("Bridge: Player Move", pos);
        this.state.playerPos = pos;
        if (this.renderer && this.renderer.updatePlayerPosition) {
            this.renderer.updatePlayerPosition(pos);
        }
    }

    enterRoom(roomData) {
        // console.log("Bridge: Enter Room", roomData.id);
        this.state.currentRoomId = roomData.id;
        
        // If we have a full dungeon build, we just move the camera.
        // If not (legacy mode), we might still need to build the room.
        if (this.renderer) {
            if (this.renderer.enterRoom) {
                this.renderer.enterRoom(roomData.id);
            } else if (this.renderer.updateRoom) {
                // Fallback to old method if new one isn't ready
                this.renderer.updateRoom(roomData);
            }
        }
    }
}
