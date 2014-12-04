var cursorPos = [];
var hostname = "https://pongpong.firebaseio.com";
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
			// if(pong.send){
				console.log('sending to firebase', y);
				firebase.child('paddles').child('paddle'+pong.paddle.position).set(y);
				pong.send = false;
			// }
		}
	};

	setInterval(function(){
		pong.send = true;
	}, 8);

	pong.render = function(){
		pong.paddle.paddles[0].dom.style.marginTop = pong.paddle.paddles[0].top;
		pong.paddle.paddles[1].dom.style.marginTop = pong.paddle.paddles[1].top;
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

		setInterval(function(){
			pong.render();
		}, 16);
	}

})();

//Pong.startGame();

var firebase = new Firebase(hostname);
var paddle = -1;

firebase.child('sides').on('value', function(returned){
	var val = returned.val();
	
	if(!val){
		// default setting
		determinePaddle(0);
		firebase.set({
			sides: {
				'left': true,
				'right': false
			}
		});
	}
	else {
		if(!val.left){
			determinePaddle(0);
			firebase.set({
				sides: {
					'left': true,
					'right': false
				}
			});
		}

		// I AM THE RIGHT PLAYER AND HAVE THE POWER, hence I HAVE THE POWEEEEEER
		if(!val.right && val.left && paddle < 0){
			determinePaddle(1);
			firebase.child('sides').set(
				{
					'left': true,
					'right': true
				}
			);
		}

		Pong.paddle.yourPaddle = paddle;

		if(val.right && val.left && paddle < 0){
			alert('No more space to play :(');
		} else if(val.left && val.right && !Pong.gameOn) {
			Pong.startGame();
		}
	}
});

firebase.child('paddles').on('value', function(returned){
	returned = returned.val();
	if(returned){
		var opposite = Math.abs(1-Pong.paddle.position);
		Pong.paddle.paddles[opposite].top = returned['paddle'+opposite];
	}
});

function determinePaddle(tempPaddle){
	paddle = tempPaddle;
	// disconnect handling
	firebase.child('sides').child((tempPaddle === 0) ? 'left' : 'right').onDisconnect().set(false);
	Pong.paddle.position = paddle;
};

document.addEventListener('mousemove', function(e){

	cursorPos = [(e.x - Pong.field.leftOffset), (e.y - Pong.field.topOffset)];
	if(Pong.paddle.yourPaddle >= 0){
		Pong.moveOwnPaddle(Pong.paddle.yourPaddle);
	}

});