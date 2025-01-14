## ts-radiochat

- This is a simple implementation of a chat server with typescript and websockets, to create/join a chat room and send messages to the users in the same room as you.
- This is only a localhost implementation, therefore it can only work on one device.

  ## How to run
- clone the repo
```
git clone https://github.com/sricharanandra/ts-radiochat.git
```

- start the server
```
cd chat-server
npm install
npx ts-node src/server.ts
```

- start as many clients as you want in different terminal windows

```
cd chat-client
npm install
npx ts-node src/client.ts
```

- enter different usernames and the same room id across all instances of the client

- start talking

  ## Future

- I will find a way to host this on a server, thereby making it useable by actual people to chat via terminal. Also, refactoring and upgrading to make it a proper project by adding features like
-  permission to join chat room, access granted by the room creator
-  encrypted chat history
-  and more
