const express = require("express");

const PORT = process.env.PORT || 5000;
const cors = require('cors')
const http = require("http");

const app = express();

app.use(express.json());
app.use(cors())

const server = http.createServer(app);

const io = require("socket.io")(server);

const connectDB = require("./db");
const Room = require("./models/room");

//socket io connection
io.sockets.on('connection',(socket)=>{
  console.log("Connectd to Socket " + socket.id);

  socket.on("createRoom",async ({ nickname }) => {

    //room is created
    try{
      let room = new Room()
      let player = {
        socketID : socket.id,
        nickname,
        playerType:'X'
      }
      room.players.push(player)
      room.turn = player
      room = await room.save()
      
      const roomID = room._id.toString()

      socket.join(roomID)

      //io -> send data to everyone
      //socket -> sneding data to yourself
      io.to(roomID).emit("createRoomSuccess",room)

    } catch(e){
      console.log(e)
    }

    //
    
  })

  socket.on("joinRoom",async({nickname,roomId})=>{
    try{
      
      if(!roomId.match(/^[0-9a-fA-F]{24}$/)){
        socket.emit('errorOccurred', 'Please enter a valid room ID.');
        return;
      }
      let room = await Room.findById(roomId)

      if(room.isJoin) {
        let player = {
          nickname,
          socketID:socket.id,
          playerType:'0'
        } 
        socket.join(roomId)
        room.players.push(player)
        room.isJoin = false
        room = await room.save()
        io.to(roomId).emit("joinRoomSuccess",room)
        io.to(roomId).emit("updatePlayers",room.players)
        io.to(roomId).emit("updateRoom",room)

      } else {
        socket.emit('errorOccurred', 'Game in Progress try again later');
        return;
      }

    } catch(e){
      console.log(e)
    }
  })

  socket.on('tap' , async({index, roomId})=>{
    try{
      let room = await Room.findById(roomId)

      let choice = room.turn.playerType

      if(room.turnIndex == 0){
        room.turn = room.players[1]
        room.turnIndex = 1;
      } else{
        room.turn = room.players[0]
        room.turnIndex = 0
      }

      room = await room.save()

      io.to(roomId).emit('tapped',{
        index,
        choice,
        room,
      })
    } catch(e){
      console.log(e)
    }
  })

  socket.on('winner',async({winnerSocketId, roomId})=>{
    try{

      let room = await Room.findById(roomId)

      let player = room.players.find((playerr) => playerr.socketID == winnerSocketId)

      player.points+=1;
      room = await room.save()

      if(player.points >= room.maxRounds) {
        io.to(roomId).emit('endGame',player)
      } else {
        io.to(roomId).emit('pointIncrease',player)
      }

    } catch(e){
      console.log(e)
    }
  });

})


connectDB()

server.listen(PORT, () => {
  console.log(`connected to port ${PORT}`);
});
