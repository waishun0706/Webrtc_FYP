var https = require('https');
var express = require('express');
var app = express();
var socket_io = require('socket.io')(https);
var fs = require('fs');
var path = require('path');
var router = express.Router();



var options = {
	key: fs.readFileSync('./webrtc.key'),
	cert: fs.readFileSync('./webrtc.crt')
}

var server = https.Server(options, app).listen(3000, function () {
	console.log('Server running...Port:3000');

});

var io = socket_io.listen(server);


app.use(express.static(__dirname + '/views'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');


app.get('/', function (request, response) {
	response.render('index.ejs');
});


var roomInfo = [];
var roomlist = [];

users = [];


io.on('connection', function (socket) {
	console.log('Connection Established!');
	var url = socket.request.headers.referer;
	var splited = url.split('/');
	var roomID = splited[splited.length - 1];
	console.log(roomID)

	var registeredUser = '';


	socket.on('join', function (userName) {   //new user registration(registeredUser 
		registeredUser = userName;

		if (!roomInfo[roomID]) {
			roomInfo[roomID] = [];
		}
		roomInfo[roomID].push(registeredUser);
		
		if (roomlist.indexOf(roomID) === -1) {
			roomlist.push(roomID);
		}
	
	
		socket.join(roomID);
		io.to(roomID).emit('sys',registeredUser + ' come in.', roomInfo[roomID]);
		console.log(registeredUser + ' come in the room ' +" "+ roomID);

		console.log('roomInfo end',roomInfo);
		console.log('users end',users);
		console.log('roomlist end',roomlist);
	});

	socket.on('leave', function () {
		socket.emit('disconnect');
	});

	// recevied and send the msg to room
	socket.on('message', function (msg) {
		if (roomInfo[roomID].indexOf(registeredUser) === -1) {  
		      return false;
		    }
		io.to(roomID).emit('msg', registeredUser, msg);
	});

	socket.on('signal', function (data) {			//send signal
		socket.broadcast.to(roomID).emit('signalMsg', {
			type: data.type,
			message: data.message
		});
	});

	socket.on('disconnect', function (data) {
		var index = roomInfo[roomID].indexOf(registeredUser);
		if(index !== -1) {
			roomInfo[roomID].splice(index, 1);
		}
		socket.leave(roomID);
		io.to(roomID).emit('sys',registeredUser + ' quit the room.', roomInfo[roomID]);
		console.log(registeredUser + " disconnected  " + roomID);
		console.log('roomInfo[roomID] ',roomInfo[roomID] == 0);
		if (roomInfo[roomID].length == 0) {
		  for (var i = 0; i < roomlist.length; i++) {
			if(roomlist[i]==roomID){
				roomlist.splice(i,1);
				break;
			}
	      }
		}

	});

});

router.get('/room/:roomID', function (req, res) {

	var roomID = req.params.roomID;

	res.render('room', {
		roomID: roomID,
		users: roomInfo['usern']
	});


});

app.get('/rooms', function (request, response) {
	response.json(roomlist);
});
app.use('/', router);
