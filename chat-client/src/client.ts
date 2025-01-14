
import WebSocket from "ws";
import readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const ws = new WebSocket("ws://localhost:8080");

let username: string;
let roomId: string;

ws.on("open", () => {
    console.log("Connected to the chat server.");

    rl.question("Enter your username: ", (name) => {
        username = name;

        rl.question("Do you want to create a room? (yes/NO): ", (answer) => {
            if (answer.toLowerCase() === "yes") {
                ws.send(JSON.stringify({ type: "createRoom", payload: { username } }));
            } else {
                rl.question("Enter room ID to join: ", (id) => {
                    roomId = id;
                    ws.send(JSON.stringify({ type: "joinRoom", payload: { username, roomId } }));
                });
            }
        });
    });
});

ws.on("message", (data: WebSocket.RawData) => {
    try {
        const message = JSON.parse(data.toString());
        handleServerMessage(message);
    } catch (err) {
        console.error("Error handling server message:", err);
    }
});

function handleServerMessage(message: any) {
    switch (message.type) {
        case "roomCreated":
            roomId = message.payload.roomId;
            console.log(`Room created! Your room ID is ${roomId}`);
            startChat();
            break;
        case "joinApproved":
            console.log(`You have joined room ${roomId}`);
            startChat();
            break;
        case "joinRequest":
            console.log(`${message.payload.username} wants to join the room.`);
            rl.question(`Approve ${message.payload.username}? (yes/no): `, (answer) => {
                if (answer.toLowerCase() === "yes") {
                    ws.send(
                        JSON.stringify({
                            type: "approveJoin",
                            payload: { roomId, username: message.payload.username },
                        })
                    );
                }
            });
            break;
        case "message":
            console.log(`${message.payload.sender}: ${message.payload.message}`);
            break;
        case "error":
            console.error(`Error: ${message.payload}`);
            break;
    }
}

function startChat() {
    rl.on("line", (line) => {
        ws.send(
            JSON.stringify({
                type: "message",
                payload: { roomId, sender: username, message: line },
            })
        );
    });
}
