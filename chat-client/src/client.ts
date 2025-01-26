
import * as net from 'net';
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const client = net.createConnection({ port: 3000 }, () => {
    console.log('Connected to the chat server.');
});

client.on('data', (data) => {
    console.log(data.toString().trim());
});

client.on('end', () => {
    console.log('Disconnected from the server.');
    rl.close();
});

rl.on('line', (input) => {
    client.write(input);
});
