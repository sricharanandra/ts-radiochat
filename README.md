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

- clients cannot join a created room unless the creator accepts the request

- users joining a created room can view the chat history of that room upto 50 recent messages.

- chats are stored peristently even when there are no users in the room, and the room is available to be joined as long as the room hasn't been deleted.

- a room can only be deleted by the creator, using the command ``` /delete-room ```, upon which all the stored chats will also be deleted.

  ## Future

- I will find a way to host this on a server, thereby making it useable by actual people to chat via terminal. Also, refactoring and upgrading to make it a proper project by adding features like
-  encrypted chat history
-  and more
