
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

        rl.question("Enter chat room ID: ", (id) => {
            roomId = id;
            ws.send(JSON.stringify({ type: "joinRoom", payload: { roomId, username } }));
        });
    });
});

ws.on("message", (data: WebSocket.RawData) => {
    try {
        const message = JSON.parse(data.toString());
        if (message.type === "joined") {
            console.log(`Joined room: ${message.payload.roomId}`);
            startChat();
        } else if (message.type === "message") {
            console.log(message.payload);
        }
    } catch (err) {
        console.error("Error receiving message:", err);
    }
});

function startChat() {
    rl.on("line", (line) => {
        ws.send(
            JSON.stringify({
                type: "message",
                payload: { roomId, sender: username, content: line },
            })
        );
    });
}
