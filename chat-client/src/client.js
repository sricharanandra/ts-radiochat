"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const readline_1 = __importDefault(require("readline"));
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
});
const ws = new ws_1.default("ws://localhost:8080");
let username;
let roomId;
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
ws.on("message", (data) => {
    try {
        const message = JSON.parse(data.toString());
        if (message.type === "joined") {
            console.log(`Joined room: ${message.payload.roomId}`);
            startChat();
        }
        else if (message.type === "message") {
            console.log(message.payload);
        }
    }
    catch (err) {
        console.error("Error receiving message:", err);
    }
});
function startChat() {
    rl.on("line", (line) => {
        ws.send(JSON.stringify({
            type: "message",
            payload: { roomId, sender: username, content: line },
        }));
    });
}
