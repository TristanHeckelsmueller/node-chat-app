const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');




const {generateMessage, generateLocationMessage} = require('./utils/message');
const {isRealString} = require('./utils/validation');
const {Users} = require('./utils/users');

const publicPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;

let app = express();
let server = http.createServer(app);
let io = socketIO(server);
let users = new Users();

// Redirect to HTTPS
app.enable('trust proxy');
app.use (function (req, res, next) {
	if (req.secure) {
		// request was via https, so do no special handling
		next();
	} else {
		// request was via http, so redirect to https
		res.redirect('https://' + req.headers.host + req.url);
	}
});




app.use(express.static(publicPath));

io.on('connection', (socket) => {
    console.log('New user connected');



    socket.on('join', (params, callback) => {
        if (!isRealString(params.name) || !isRealString(params.room)){
            
        }


        socket.join(params.room);
        users.removeUser(socket.id);
        users.addUser(socket.id, params.name, params.room);

        io.to(params.room).emit('updateUserList', users.getUserList(params.room));

        socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app'));
        socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', `${params.name} has joined`));

        callback();
    });


    socket.on('createMessage', (message, callback) => {
        let user = users.getUser(socket.id);
        if (user && isRealString(message.text)){
            io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
        }
        callback();
    });
    socket.on('createLocationMessage', (coords) => {
        let user = users.getUser(socket.id);
        if (user){
            io.to(user.room).emit('newLocationMessage', generateMessage(user.name, coords.latitude, coords.longitude));
        }
    });
    socket.on('disconnect', function () {
        let user = users.removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('updatedUserList', users.getUserList(user.room));
            io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} hast left.`));
        }
    });
});



server.listen(port, function () {
    console.log(`Server is up on ${port}`) ;
});