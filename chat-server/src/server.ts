
import * as net from 'net';
import { v4 as uuidv4 } from 'uuid';

interface Room {
    id: string;
    clients: net.Socket[];
    owner: net.Socket;
    pendingRequests: net.Socket[];
    usernames: Map<net.Socket, string>;
}

const rooms: Map<string, Room> = new Map();

const server = net.createServer((socket) => {
    socket.write('Enter your username: ');

    let username = '';
    let currentRoom: Room | null = null;

    socket.on('data', (data) => {
        const message = data.toString().trim();

        if (!username) {
            username = message;
            socket.write('Do you want to create a room? (yes/no): ');
            return;
        }

        if (!currentRoom) {
            if (message.toLowerCase() === 'yes') {
                const roomId = uuidv4().slice(0, 7);
                currentRoom = { id: roomId, clients: [], owner: socket, pendingRequests: [], usernames: new Map() };
                rooms.set(roomId, currentRoom);
                currentRoom.usernames.set(socket, username);
                socket.write(`Room created! Your room ID is ${roomId}\n`);
                return;
            } else {
                socket.write('Enter the room ID to join: ');
                return;
            }
        }

        if (message.startsWith('/join ')) {
            const roomId = message.split(' ')[1];
            const room = rooms.get(roomId);
            if (room) {
                room.pendingRequests.push(socket);
                room.owner.write(`${username} requested to join room ${roomId}.\nApprove? (yes/no): `);
            } else {
                socket.write('Room does not exist.\n');
            }
            return;
        }

        if (message.toLowerCase() === 'yes' && currentRoom.owner === socket) {
            const requester = currentRoom.pendingRequests.shift();
            if (requester) {
                currentRoom.clients.push(requester);
                currentRoom.usernames.set(requester, username);
                requester.write(`You have been admitted to room ${currentRoom.id}.\n`);
                currentRoom.clients.forEach((client) => {
                    client.write(`[Room ${currentRoom.id}] ${username} has joined the chat.\n`);
                });
            }
            return;
        }

        if (message.toLowerCase() === 'no' && currentRoom.owner === socket) {
            currentRoom.pendingRequests.shift()?.write('Your join request was denied.\n');
            return;
        }

        // Broadcast chat messages
        if (currentRoom) {
            currentRoom.clients.forEach((client) => {
                if (client !== socket) {
                    client.write(`[${currentRoom.usernames.get(socket)}]: ${message}\n`);
                }
            });
        }
    });

    socket.on('end', () => {
        if (currentRoom) {
            currentRoom.clients = currentRoom.clients.filter((client) => client !== socket);
            currentRoom.usernames.delete(socket);
            currentRoom.clients.forEach((client) => {
                client.write(`${username} has left the chat.\n`);
            });
            if (socket === currentRoom.owner) {
                currentRoom.clients.forEach((client) => {
                    client.write(`The room owner has left. Closing the room.\n`);
                    client.end();
                });
                rooms.delete(currentRoom.id);
            }
        }
        console.log(`${username} disconnected.`);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Chat server started on port ${PORT}`);
});

process.on('SIGINT', () => {
    console.log('\nServer shutting down gracefully.');
    rooms.forEach((room) => {
        room.clients.forEach((client) => {
            client.write('Server is shutting down. Goodbye!\n');
            client.end();
        });
    });
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});
