#  radiochat

A terminal-based WebSocket chat client written in TypeScript. Connect to your `radiochat` server and chat in real time — straight from your terminal.



## Features

- Create or join chat rooms
- Real-time terminal messaging
- Approval-based room entry
- Slash commands for moderation
- Simple interactive CLI interface


##  Requirements

- Node.js v18+  
- `ts-node` installed globally or run via `npx`



##  Setup

### 1. Clone this repository

```bash
git clone https://github.com/sricharanandra/radiochat-client.git
cd radiochat-client
```
### 2. Install dependencies

```
npm install
```

### 3. Run and Chat!

```
npx ts-node src/client.ts
```

## How to Use
- Enter a username when prompted.
- Choose to create a room or join an existing one.
- If creating, a room ID will be displayed — share it with others.
- If joining, wait for approval by an existing room participant.
- Type messages to chat. Use /commands for special actions.

## Supported Commands

| Command        | Description                             |
| -------------- | --------------------------------------- |
| `/delete-room` | Deletes the room (only for the creator) |

## Notes

- There is no data stored locally, only on the server.
- Room State and history are managed by the server.
- This is a minimalist terminal client - No frills

## Related Projects 

- [RadioChat Server](https://github.com/sricharanandra/ts-radiochat-server) - TypeScript CLI server
