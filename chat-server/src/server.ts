import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";

type User = {
    username: string;
    ws: WebSocket;
};

type ChatRoom = {
    id: string;
    creator: User;
    users: User[];
    pendingRequests: User[];
    messageHistory: string[];
};

const chatRooms: Record<string, ChatRoom> = {};
const wss = new WebSocketServer({ port: 8080 });
const messsge_history_limit = 50;

console.log("Server started successfully on port 8080.");

wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (data: string) => {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case "createRoom":
                    createRoom(message.payload.username, ws);
                    break;
                case "joinRoom":
                    joinRoom(message.payload.username, message.payload.roomId, ws);
                    break;
                case "approveJoin":
                    approveJoinRequest(message.payload.roomId, message.payload.username);
                    break;
                case "message":
                    broadcastMessage(message.payload.roomId, message.payload.sender, message.payload.message);
                    break;
                default:
                    ws.send(JSON.stringify({ type: "error", payload: "Invalid request type." }));
            }
        } catch (err) {
            console.error("Error handling message:", err);
            ws.send(JSON.stringify({ type: "error", payload: "Invalid message format." }));
        }
    });

    ws.on("close", () => {
        handleDisconnection(ws);
    });
});

function createRoom(username: string, ws: WebSocket) {
    const roomId = generateRoomId();
    const newRoom: ChatRoom = {
        id: roomId,
        creator: { username, ws },
        users: [{ username, ws }],
        pendingRequests: [],
        messageHistory: [],
    };
    chatRooms[roomId] = newRoom;

    ws.send(JSON.stringify({ type: "roomCreated", payload: { roomId } }));
    console.log(`Room ${roomId} created by ${username}.`);
}

function joinRoom(username: string, roomId: string, ws: WebSocket) {
    const room = chatRooms[roomId];

    if (!room) {
        ws.send(JSON.stringify({ type: "error", payload: "Room does not exist." }));
        return;
    }
    if (room.users.some(user => user.username === username)) {
        ws.send(JSON.stringify({ type: "error", payload: "Username already exists." }))
        return;
    }
    room.pendingRequests.push({ username, ws });
    promptNextJoinRequest(room);

    console.log(`${username} requested to join room ${roomId}.`);
}

function promptNextJoinRequest(room: ChatRoom) {
    if (room.pendingRequests.length > 0) {
        const nextRequest = room.pendingRequests[0];
        room.creator.ws.send(
            JSON.stringify({
                type: "joinRequest",
                payload: { username: nextRequest.username },
            })
        );
    }
}

function approveJoinRequest(roomId: string, username: string) {
    const room = chatRooms[roomId];

    if (!room) return;

    const requestIndex = room.pendingRequests.findIndex((user) => user.username === username);
    if (requestIndex !== -1) {
        const approvedUser = room.pendingRequests.splice(requestIndex, 1)[0];
        room.users.push(approvedUser);

        approvedUser.ws.send(
            JSON.stringify({
                type: "joinApproved",
                payload: { roomId },
            })
        );

        broadcastMessage(roomId, "Server", `${username} has joined the room.`);
        sendRoomHistory(approvedUser.ws, room);
        console.log(`${username} has been admitted to room ${roomId}.`);

        // Prompt the next pending request if there are any
        promptNextJoinRequest(room);
    }
}
function sendRoomHistory(ws: WebSocket, room: ChatRoom) {
    if (room.messageHistory.length > 0) {
        ws.send(
            JSON.stringify({ type: "history", payload: room.messageHistory })
        )
    }
}

function broadcastMessage(roomId: string, sender: string, message: string) {
    const room = chatRooms[roomId];
    if (!room) return;

    const formattedMessage = ` ${sender}: ${message}`;
    room.messageHistory.push(formattedMessage);

    if (room.messageHistory.length > messsge_history_limit) {
        room.messageHistory.shift();
    }
    room.users.forEach((user) => {
        user.ws.send(
            JSON.stringify({
                type: "message",
                payload: { sender, message: formattedMessage },
            })
        );
    });

}

function handleDisconnection(ws: WebSocket) {
    for (const roomId in chatRooms) {
        const room = chatRooms[roomId];
        const userIndex = room.users.findIndex((user) => user.ws === ws);

        if (userIndex !== -1) {
            const user = room.users.splice(userIndex, 1)[0];
            broadcastMessage(roomId, "Server", `${user.username} has left the room.`);

            if (room.creator.ws === ws) {
                broadcastMessage(roomId, "Server", "The creator has left. Assigning a new creator.");
                if (room.users.length > 0) {
                    room.creator = room.users[0];
                } else {
                    delete chatRooms[roomId];
                    console.log(`Room ${roomId} deleted`);
                }
            }
            return;
        }
    }
}

function generateRoomId(): string {
    return crypto.randomBytes(4).toString("hex").slice(0, 7);
}
