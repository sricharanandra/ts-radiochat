import WebSocket from "ws";
import readline from "readline";
import notifier from "node-notifier";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const serverUrl = "ws://tunnel.sreus.tech:8080";
console.log(`Connecting to ${serverUrl}...`);
const ws = new WebSocket(serverUrl);

let username: string | null = null;
let currentRoomId: string | null = null;
let jwtToken: string | null = null;

ws.on("open", () => {
    console.log("Connected to the chat server.");
    promptAuth();
});

ws.on("message", (data: WebSocket.RawData) => {
    try {
        const message = JSON.parse(data.toString());
        handleServerMessage(message);
    } catch (err) {
        console.error("Error handling server message:", err);
    }
});

ws.on("close", () => {
    console.log("Disconnected from server. Exiting.");
    process.exit(0);
});

ws.on("error", (error) => {
    console.error("WebSocket error:", error.message);
    console.log("Could not connect to the server. Please ensure it is running.");
    process.exit(1);
});

function promptAuth() {
    rl.question("Do you want to (r)egister or (l)ogin? ", (choice) => {
        if (choice.toLowerCase() === 'r') {
            handleRegister();
        } else if (choice.toLowerCase() === 'l') {
            handleLogin();
        } else {
            console.log("Invalid choice. Please enter 'r' or 'l'.");
            promptAuth();
        }
    });
}

function handleRegister() {
    rl.question("Choose a username: ", (newUsername) => {
        rl.question("Choose a password: ", (password) => {
            ws.send(JSON.stringify({
                type: "register",
                payload: { username: newUsername, password }
            }));
        });
    });
}

function handleLogin() {
    rl.question("Enter your username: ", (loginUsername) => {
        username = loginUsername; // Store username for display purposes
        rl.question("Enter your password: ", (password) => {
            ws.send(JSON.stringify({
                type: "login",
                payload: { username: loginUsername, password }
            }));
        });
    });
}

function promptForRoom() {
    rl.question("Do you want to (c)reate or (j)oin a room? ", (answer) => {
        if (answer.toLowerCase() === "c") {
            rl.question("Enter a name for your new room: ", (name) => {
                ws.send(JSON.stringify({ type: "createRoom", payload: { token: jwtToken, name } }));
            });
        } else if (answer.toLowerCase() === 'j') {
            rl.question("Enter room ID to join: ", (id) => {
                ws.send(JSON.stringify({ type: "joinRoom", payload: { token: jwtToken, roomId: id } }));
            });
        } else {
            console.log("Invalid choice.");
            promptForRoom();
        }
    });
}

function handleServerMessage(message: any) {
    const { type, payload } = message;

    const isAsyncMessage = ["message", "userJoined", "userLeft", "error", "roomDeleted", "joinRequest", "info"].includes(type);
    if (isAsyncMessage) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
    }


    switch (type) {
        case "registered":
            console.log(` ${payload.message}`);
            handleLogin();
            break;

        case "loggedIn":
            jwtToken = payload.token;
            console.log(` Logged in successfully! Welcome, ${username}.`);
            promptForRoom();
            break;

        case "roomCreated":
            currentRoomId = payload.roomId;
            console.log(` Room "${payload.name}" created! Your room ID is: ${currentRoomId}`);
            startChat();
            break;

        case "joinedRoom":
            currentRoomId = payload.roomId;
            console.log(` You have joined room "${payload.name}"`);
            startChat();
            break;

        case "history":
            console.log("\n--- Last 50 Messages ---");
            payload.messages.forEach((msg: any) => {
                console.log(`[${new Date(msg.createdAt).toLocaleTimeString()}] ${msg.author.username}: ${msg.content}`);
            });
            console.log("--- End of History ---\n");
            rl.prompt(true);
            break;

        case "joinRequestSent":
            console.log(`[Server: ${payload.message}]`);
            break;

        case "joinApproved":
            console.log(`\n[Server: Your request was approved! Joining room "${payload.name}".]`);
            currentRoomId = payload.roomId;
            startChat();
            break;

        case "joinRejected":
            console.log(`\n[Server: ${payload.message}]`);
            promptForRoom();
            break;


        case "joinRequest":
            console.log(`\n[Server: User '${payload.username}' wants to join. Type /approve or /reject]`);
            rl.prompt(true);
            break;

        case "info":
            console.log(`\n[Server: ${payload.message}]`);
            rl.prompt(true);
            break;

        case "message":
            const msgAuthor = payload.author.username;
            const msgContent = payload.content;
            const displayMsg = `${msgAuthor}: ${msgContent}`;
            console.log(displayMsg);
            if (msgAuthor === username) {
                readline.moveCursor(process.stdout, 0, -1);
                readline.clearLine(process.stdout, 1);
            }


            if (msgAuthor !== username) {
                notifier.notify({
                    title: `New message from ${msgAuthor}`,
                    message: msgContent.length > 50 ? msgContent.substring(0, 50) + "..." : msgContent,
                    sound: true,
                    wait: false
                });
            }
            rl.prompt(true);
            break;

        case "userJoined":
            console.log(`\n[Server: ${payload.username} has joined the room.]`);
            rl.prompt(true);
            break;

        case "userLeft":
            console.log(`\n[Server: ${payload.username} has left the room.]`);
            rl.prompt(true);
            break;

        case "roomDeleted":
            console.log(`\n[Server: ${payload.message}]`);
            console.log("You will be disconnected.");
            ws.close();
            break;

        case "error":
            console.error(`\n❌ Error from server: ${payload.message}`);
            // If auth error, might need to re-login
            if (payload.message.includes("token")) {
                console.log("Please try logging in again.");
                jwtToken = null; // Clear invalid token
                promptAuth();
            } else {
                rl.prompt(true);
            }
            break;

        default:
            console.log("\n[Received unhandled message type]:", type);
            rl.prompt(true);
            break;
    }
}

function startChat() {
    console.log("You can now start sending messages. Type /exit to leave.");
    rl.setPrompt(`${username}> `);
    rl.prompt();

    rl.on("line", (line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            rl.prompt(true);
            return;
        }
        if (trimmed.toLowerCase() === '/exit') {
            ws.close();
            return;
        }

        const messagePayload = {
            token: jwtToken,
            roomId: currentRoomId,
        };

        if (trimmed.startsWith("/")) {
            ws.send(JSON.stringify({
                type: "command",
                payload: { ...messagePayload, command: trimmed }
            }));
        } else {
            ws.send(JSON.stringify({
                type: "message",
                payload: { ...messagePayload, content: trimmed }
            }));
        }
    });
}
