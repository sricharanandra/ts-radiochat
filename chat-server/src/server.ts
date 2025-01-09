
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";

type User = {
    username: string;
    ws: WebSocket;
};

type ChatRoom = {
    id: string;
    users: User[];
    messages: { sender: string; message: string; iv: string; timestamp: string }[];
};

const chatRooms: Record<string, ChatRoom> = {};

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (data: string | Buffer) => {
        try {
            const message = JSON.parse(data.toString());
            handleClientMessage(message, ws);
        } catch (err) {
            console.error("Error parsing message:", err);
        }
    });

    ws.on("close", () => {
        handleDisconnection(ws);
    });
});

function handleClientMessage(message: any, ws: WebSocket) {
    const { type, payload } = message;

    if (type === "joinRoom") {
        const { roomId, username } = payload;
        if (!chatRooms[roomId]) {
            chatRooms[roomId] = { id: roomId, users: [], messages: [] };
        }

        chatRooms[roomId].users.push({ username, ws });
        ws.send(JSON.stringify({ type: "joined", payload: { roomId } }));

        broadcastMessage(roomId, `${username} has joined the chat.`);
    } else if (type === "message") {
        const { roomId, sender, content } = payload;
        const room = chatRooms[roomId];

        if (!room) {
            ws.send(JSON.stringify({ type: "error", payload: "Room not found." }));
            return;
        }

        const { encryptedMessage, iv } = encryptMessage(content);
        room.messages.push({
            sender,
            message: encryptedMessage,
            iv: iv.toString("hex"),
            timestamp: new Date().toISOString(),
        });

        broadcastMessage(roomId, `${sender}: ${content}`, ws);
    }
}

function handleDisconnection(ws: WebSocket) {
    for (const roomId in chatRooms) {
        const room = chatRooms[roomId];
        const userIndex = room.users.findIndex((user) => user.ws === ws);
        if (userIndex !== -1) {
            const username = room.users[userIndex].username;
            room.users.splice(userIndex, 1);
            broadcastMessage(roomId, `${username} has left the chat.`);
        }
    }
}

function broadcastMessage(roomId: string, message: string, excludeWs?: WebSocket) {
    const room = chatRooms[roomId];
    room.users.forEach((user) => {
        if (user.ws !== excludeWs) {
            user.ws.send(JSON.stringify({ type: "message", payload: message }));
        }
    });
}

function encryptMessage(message: string): { encryptedMessage: string; iv: Buffer } {
    const key = crypto.createHash("sha256").update("secure-key").digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

    let encrypted = cipher.update(message, "utf8", "hex");
    encrypted += cipher.final("hex");

    return { encryptedMessage: encrypted, iv };
}

console.log("Chat server running on ws://localhost:8080");
