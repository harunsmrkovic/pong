var cursorPos = [];
var hostname = "http://178.62.205.41:8080";

var socket = io.connect(hostname);
(function(){

	var pong = {};
	window.Pong = pong;

	// default field properties
	pong.field = {
		width: 1200,
		height: 500,
		dom: document.getElementById('field'),
		topOffset: 100
	};
	pong.gameOn = false;

	// calculating offset
	pong.field.leftOffset = (window.outerWidth - pong.field.width) / 2;

	// paddle configuration
	pong.paddle = {
		paddles: [
			{
				top: 0,
				dom: document.getElementById('paddle-1')
			},
			{
				top: 0,
				dom: document.getElementById('paddle-2')
			}
		],
		defaults: {
			width: 20,
			height: 150,
		},
		position: -1
	};

	// ball configuration
	pong.ball = {
		dom: document.getElementById('ball'),
		width: 30,
		height: 30,
		speed: 5,
		x: (pong.field.width / 2) - 15,
		y: (pong.field.height / 2) - 15,
		angle: 3.2,
		maxBounceAngle: 1.30899694
	};

	// killswitch for not overloading the server (resets every 8ms)
	pong.send = true;

	pong.moveOwnPaddle = function(paddleNum){
		var x = cursorPos[0],
				y = cursorPos[1];

		if(y > 0){
			var max_y = pong.field.height - pong.paddle.defaults.height;
			y -= pong.paddle.defaults.height/2;
			y = (y < 0) ? 0 : y;
			y = (y > max_y) ? max_y : y;

			pong.paddle.paddles[paddleNum].top = y;
			if(pong.send){
				socket.emit('paddle'+pong.paddle.position, y);
				pong.send = false;
			}
		}
	};

	setInterval(function(){
		pong.send = true;
	}, 8);

	pong.bounceBall = function(origin, paddle){
		if(typeof paddle === 'undefined') paddle = false;

		switch(origin){
			case 'wall':
				pong.ball.angle = -pong.ball.angle;
				break;
			case 'paddle':
				var relativeIntersectY = (paddle.top+(pong.paddle.defaults.height/2)) - (pong.ball.y + pong.ball.height / 2);
				var normalizedRelativeIntersectionY = (relativeIntersectY/(pong.paddle.defaults.height/2));
				console.log(relativeIntersectY, normalizedRelativeIntersectionY, (normalizedRelativeIntersectionY*pong.ball.maxBounceAngle));
				pong.ball.angle = normalizedRelativeIntersectionY * pong.ball.maxBounceAngle;
				break;
		}

	};

	pong.moveBall = function(){
		var newX,
				newY;

		// determine new position
		newX = pong.ball.x + pong.ball.speed * Math.cos(pong.ball.angle);
		newY = pong.ball.y + pong.ball.speed * Math.sin(pong.ball.angle) * -1;


		console.log(newX);
		if(newX > pong.paddle.defaults.width && newX < pong.field.width - pong.ball.width && newY > 0 && newY < pong.field.height - pong.ball.height){
			pong.ball.x = newX;
			pong.ball.y = newY;
		} else if( (newX > 0 && newX <= pong.paddle.defaults.width) || (newX >= pong.field.width - pong.paddle.defaults.width) ){
			var thepaddle = pong.paddle.paddles[(newX < pong.field.width/2) ? 0 : 1];
			//console.log(newX, thepaddle.top, pong.paddle.defaults.height, (thepaddle.top + pong.paddle.defaults.height));
			if(newY >= thepaddle.top && newY <= thepaddle.top + pong.paddle.defaults.height){
				pong.bounceBall('paddle', thepaddle);
			}
			else {
				pong.ball.x = newX;
				pong.ball.y = newY;
			}
		} else {
			if(newY - pong.ball.height <= 0 || newY + pong.ball.height >= pong.field.height){
				pong.bounceBall('wall');
			}
			else {
				console.warn('GUBIS PICKO!!');
			}
		}
	};

	pong.render = function(){
		// paddles rendering
		pong.paddle.paddles[0].dom.style.marginTop = pong.paddle.paddles[0].top;
		pong.paddle.paddles[1].dom.style.marginTop = pong.paddle.paddles[1].top;

		// ball rendering
		pong.ball.dom.style.top = pong.ball.y;
		pong.ball.dom.style.left = pong.ball.x;
	};

	pong.startGame = function(){
		// setting the field dimensions
		pong.field.dom.style.width = pong.field.width;
		pong.field.dom.style.height = pong.field.height;
		pong.field.dom.style.marginTop = pong.field.topOffset;

		// setting paddles
		pong.paddle.paddles[0].dom.style.marginTop = pong.paddle.paddles[0].top;
		pong.paddle.paddles[1].dom.style.marginTop = pong.paddle.paddles[1].top;

		pong.gameOn = true;

		// Start following the other player
		var enemy = Math.abs(1-pong.paddle.position);
		socket.on('paddle'+enemy, function(data){
			pong.paddle.paddles[enemy].top = data;
		});


		setInterval(function(){
			pong.render();
		}, 16);

		setInterval(function(){
			pong.moveBall();
		}, 10);
	}

	pong.stopGame = function(){
		alert('Game stopped');
	}

})();

Pong.startGame();

// socket.on('game', function(data){ 
// 	if(data == 1) Pong.startGame();
// 	else if(data == 0) Pong.stopGame();
// });

var paddle = -1;
paddle = 0;

socket.on('sides', function(returned){
	var val = returned;
	console.log(val);
	
	if(!val){
		// default setting
		determinePaddle(0);
	}
	else {
		if(val[0] == 0 && paddle < 0){
			determinePaddle(0);
		}

		// I AM THE RIGHT PLAYER AND HAVE THE POWER, hence I HAVE THE POWEEEEEER
		if(val[1] == 0 && paddle < 0){
			determinePaddle(1);
		}

		Pong.paddle.yourPaddle = paddle;

		if(val[0] == 1 && val[1] == 1 && paddle < 0){
			alert('No more space to play :(');
		}
	}
});

function determinePaddle(tempPaddle){
	paddle = tempPaddle;
	socket.emit('setSide', paddle);
	Pong.paddle.position = paddle;
};

document.addEventListener('mousemove', function(e){

	cursorPos = [(e.x - Pong.field.leftOffset), (e.y - Pong.field.topOffset)];
	if(Pong.paddle.yourPaddle >= 0){
		Pong.moveOwnPaddle(Pong.paddle.yourPaddle);
	}

});