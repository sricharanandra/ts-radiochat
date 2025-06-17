import WebSocket from "ws";
import readline from "readline";
import notifier from "node-notifier"

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
});

const ws = new WebSocket("ws://138.2.183.32:8080");

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
            notifier.notify({
                title: 'Chat Room Join Request',
                message: `${message.payload.username} wants to join the room`,
                sound: true,
                wait: false
            });
            break;
        case "message":
            console.log(`${message.payload.message}`);
            const isOwnMessage = message.payload.sender === username;
            const isSystemMessage = message.payload.sender === "Server" || message.payload.sender === "History";

            if (!isOwnMessage && !isSystemMessage) {
                notifier.notify({
                    title: `New message from ${message.payload.sender}`,
                    message: message.payload.message.length > 50
                        ? message.payload.message.substring(0, 50) + "..."
                        : message.payload.message,
                    sound: true,
                    wait: false
                });
            }
            break;
        case "error":
            console.error(`Error: ${message.payload}`);
            break;
    }
}

function startChat() {
    rl.prompt();
    rl.on("line", (line) => {
        const trimmed = line.trim();

        if (!trimmed) {
            rl.prompt(true);
            return;
        }

        if (trimmed.startsWith("/")) {
            // Send command to server
            ws.send(JSON.stringify({
                type: "command",
                payload: {
                    roomId,
                    sender: username,
                    command: trimmed,
                }
            }));
        } else {
            // Send normal chat message
            ws.send(JSON.stringify({
                type: "message",
                payload: {
                    roomId,
                    sender: username,
                    message: trimmed,
                }
            }));
        }

        process.stdout.moveCursor(0, -1); // Optional: hides your message after you hit enter
        process.stdout.clearLine(1);
        rl.prompt(true);
    });
}
