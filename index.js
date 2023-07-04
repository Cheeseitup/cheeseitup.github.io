console.log("Running");

let ctx;

let DEBUG_SHOULD_DRAW = true;

const fd = {
	DAS: 12,
	RR:   3,
	LCD: 35,
	ARE:  4,
	LD:  30
};

const width      = 10;
const height     = 20;
const hiddenRows =  5;

let applicationState = "menu";

let UPS = 60;
let gameloop;

let keys = {
	left:   false,
	right:  false,
	hard:   false,
	soft:   false,
	cwr:    false,
	wsr:    false,
	hold:   false,
	zone:   false,
	up:     false,
	down:   false,
	confirm:false
};


let bindings = {
	left:   37,  // left arrow
	right:  39,  // right arrow
	hard:   32,  // space bar
	soft:   40,  // down arrow
	cwr:    88,  // X
	wsr:    90,  // Z
	hold:   16,  // shift
	zone:   67,  // C
	up:     38,  // up arrow
	down:   40,  // down arrow
	confirm:13   // enter
}

let controls = {
	hardReady:    true,
	cwrReady:     true,
	wsrReady:     true,
	holdReady:    true,
	h_charge:     0,
	leftReady:    true,  // Menu and taps
	rightReady:   true,  // Menu and taps
	downReady:    true,
	upReady:      true,
	confirmReady: true
};

let menu = {
	page: null,
	onBack: false
};

let game = {
	zone: 0,
	maxZone: 600,
	combo: 0,
	g: 0.02,
	softdropMultiplier: 20,
	level: 1,
	state: "dropping",
	stateFrame: 0,
	heldPiece: "B",
	canHold: true,
	mode: "sprint",
	isTSpin: false
};

let time = {
	milli: 0,
	sec:   0,
	min:   0,
	hour:  0
}

let piece = {
	type: "O",
	rotation: 0,
	r: 20,
	c: 4,
	fall: 0,
	grounded: 0,
	ghostRDelta: 0
};

let nextQueue = [];

let randomizer;

function Piece(tiles){
	this.tiles = tiles;
	this.cmax = tiles[0][1];
	this.cmin = tiles[0][1];
	this.rmax = tiles[0][0];
	this.rmin = tiles[0][0];
	for(let i=1; i<tiles.length; ++i){
		if(tiles[i][1] > this.cmax){
			this.cmax = tiles[i][1];
		}
		if(tiles[i][1] < this.cmin){
			this.cmin = tiles[i][1];
		}
		if(tiles[i][0] > this.rmax){
			this.rmax = tiles[i][0];
		}
		if(tiles[i][0] < this.rmin){
			this.rmin = tiles[i][0];
		}
	}
}

I_data = {
	0: new Piece([[0,-1],[0,0],[0,1],[0,2]]),    // --
	1: new Piece([[1,1],[0,1],[-1,1],[-2,1]]),   //  |
	2: new Piece([[-1,-1],[-1,0],[-1,1],[-1,2]]),// __
	3: new Piece([[1,0],[0,0],[-1,0],[-2,0]])    // | 
};
O_data = {
	0: new Piece([[1,0],[1,1],[0,0],[0,1]]),
	1: new Piece([[1,0],[1,1],[0,0],[0,1]]),
	2: new Piece([[1,0],[1,1],[0,0],[0,1]]),
	3: new Piece([[1,0],[1,1],[0,0],[0,1]])
};
T_data = {
	0: new Piece([[1,0],[0,-1],[0,0],[0,1]]),
	1: new Piece([[1,0],[0,0],[0,1],[-1,0]]),
	2: new Piece([[0,-1],[0,0],[0,1],[-1,0]]),
	3: new Piece([[1,0],[0,-1],[0,0],[-1,0]])
};
L_data = {
	0: new Piece([[1,1],[0,-1],[0,0],[0,1]]),
	1: new Piece([[1,0],[0,0],[-1,0],[-1,1]]),
	2: new Piece([[0,-1],[0,0],[0,1],[-1,-1]]),
	3: new Piece([[1,0],[1,-1],[0,0],[-1,0]])
};
J_data = {
	0: new Piece([[1,-1],[0,-1],[0,0],[0,1]]),
	1: new Piece([[1,0],[1,1],[0,0],[-1,0]]),
	2: new Piece([[0,-1],[0,0],[0,1],[-1,1]]),
	3: new Piece([[1,0],[0,0],[-1,-1],[-1,0]])
};
S_data = {
	0: new Piece([[1,0],[1,1],[0,-1],[0,0]]),
	1: new Piece([[1,0],[0,0],[0,1],[-1,1]]),
	2: new Piece([[0,0],[0,1],[-1,-1],[-1,0]]),
	3: new Piece([[1,-1],[0,-1],[0,0],[-1,0]])
};
Z_data = {
	0: new Piece([[1,-1],[1,0],[0,0],[0,1]]),
	1: new Piece([[1,1],[0,0],[0,1],[-1,0]]),
	2: new Piece([[0,-1],[0,0],[-1,0],[-1,1]]),
	3: new Piece([[1,0],[0,-1],[0,0],[-1,-1]])
};



let pieces = {
	I: I_data,
	O: O_data,
	T: T_data,
	L: L_data,
	J: J_data,
	S: S_data,
	Z: Z_data
};


let stats = {
	score:    0,
	time:     0,
	lines:    0,
	singles:  0,
	doubles:  0,
	triples:  0,
	tetrises: 0,
	hurdles:  0,
	// hurdle varieties
	t_spins:  0,
	tss:      0,
	tsd:      0,
	tst:      0,
	maxCombo: 0
};

let board;

let anim = {
	frame: 1,
	duration: 25, // const
	name: "single"
};




/**
 *               *
 *     GAME      *
 *               *
 */
 
function update(){
	switch(applicationState){
		case "game":
			gameUpdate();
			break;
		case "menu":
			menuUpdate();
			break;
	}
}


let rippleCD = 20;
function gameUpdate(){
	game.stateFrame++;
	if(game.state !== "complete" && game.state !== "lost"){
		stats.time++;
	}
	if(--rippleCD <= 0){
		backgroundParticles.push(new BGParticleRipple());
		rippleCD = Math.floor(Math.random()*40+70);
	}
	processAllParticles();
	switch(game.state){
		case "complete":
		case "lost":
		// TODO: Wait until keypress
		if(game.stateFrame === 1){
			controls.hardReady =   false;
			controls.cwrReady =    false;
			controls.wsrReady =    false;
			controls.holdReady =   false;
			controls.h_charge =    0;
			controls.leftReady =   false;
			controls.rightReady =  false;
			controls.downReady =   false;
			controls.upReady =     false;
			controls.confirmReady =false;
		}
		if(game.stateFrame >= 50){
			if(keys.hard){
				if(controls.hardReady){
					backToMenu();
				}
			}else{
				controls.hardReady = true;
			}
			if(keys.cwr){
				if(controls.cwrReady){
					backToMenu();
				}
			}else{
				controls.cwrReady = true;
			}
			if(keys.wsr){
				if(controls.wsrReady){
					backToMenu();
				}
			}else{
				controls.wsrReady = true;
			}
			if(keys.hold){
				if(controls.holdReady){
					backToMenu();
				}
			}else{
				controls.holdReady = true;
			}
			if(keys.left){
				if(controls.leftReady){
					backToMenu();
				}
			}else{
				controls.leftReady = true;
			}
			if(keys.right){
				if(controls.rightReady){
					backToMenu();
				}
			}else{
				controls.rightReady = true;
			}
			if(keys.down){
				if(controls.downReady){
					backToMenu();
				}
			}else{
				controls.downReady = true;
			}
			if(keys.up){
				if(controls.upReady){
					backToMenu();
				}
			}else{
				controls.upReady = true;
			}
			/*if(keys.confirm){
				if(controls.confirmReady){
					backToMenu();
				}
			}else{
				controls.confirmReady = true;
			}*/
		}
		break;
		
		
		case "clearing":
		// Read rotate
		// Read hold
		if(game.stateFrame >= fd.LCD){
			game.stateFrame = 0;
			game.state = "ARE";
		}
		break;
		
		
		case "ARE":
		// Read DAS
		// Read rotate
		// Read hold
		if(keys.hard){
			controls.hardReady = false;
		}else{
			controls.hardReady = true;
		}
		if(game.stateFrame >= fd.ARE){
			game.stateFrame = 0;
			game.state = "dropping";
			setNewPiece();
			game.canHold = true;
			game.isTSpin = false;
		}
		break;
		
		
		case "dropping":
		// Reset flags
		let moved = false;
		let lefting = false;
		let righting = false;
		let holding = false;
		let softdropping = false;
		let harddropping = false;
		let cwrotating = false;
		let wsrotating = false;
		
		
		if(game.stateFrame === 1){
			moved = true;
		}
		
		// --Controls--
		// Hold
		if(keys.hold){
			if(controls.holdReady){
				controls.holdReady = false;
				holding = true;
			}
		}else{
			controls.holdReady = true;
		}
		// Left/right
		if(keys.left){
			if(controls.leftReady){  // Tap; always proc
				lefting = true;
				controls.leftReady = false;
			}
			if(controls.h_charge >= fd.DAS && !keys.right){
				lefting = true;
				controls.h_charge = fd.DAS - fd.RR;  // Fully reset in case it was hyper charged from holding both buttons
			}
		}else{
			controls.leftReady = true;
		}
		if(keys.right){
			if(controls.rightReady){  // Tap; always proc
				righting = true;
				controls.rightReady = false;
			}
			if(controls.h_charge >= fd.DAS && !keys.left){
				righting = true;
				controls.h_charge = fd.DAS - fd.RR;
			}
		}else{
			controls.rightReady = true;
		}
		if(keys.left || keys.right){
			controls.h_charge += 1;  // Increment DAS charge if any key pressed
		}else{
			controls.h_charge = 0;  // Reset charge if no key pressed
		}
		// Rotate
		if(keys.cwr){
			if(controls.cwrReady){
				controls.cwrReady = false;
				cwrotating = true;
			}
		}else{
			controls.cwrReady = true;
		}
		if(keys.wsr){
			if(controls.wsrReady){
				controls.wsrReady = false;
				wsrotating = true;
			}
		}else{
			controls.wsrReady = true;
		}
		
		// --Action--
		// Hold
		if(holding){
			if(game.canHold){  // Optional
				hold();
				game.canHold = false;
			}
		}
		// Left/right
		if(lefting){
			if(canMove(0, -1)){
				piece.c -= 1;
				moved = true;
			}
		}
		if(righting){
			if(canMove(0, 1)){
				piece.c += 1;
				moved = true;
			}
		}
		// Rotate
		if(cwrotating){
			piece.rotation = (piece.rotation + 1) % 4;
			if(!canMove(0, 0)){
				// Try kicks
				if(piece.type !== "O"){
					if(piece.type === "I"){
						if(!kick(IKicks["cw"][piece.rotation])){
							piece.rotation = (piece.rotation - 1 + 4) % 4;
						}else{
							moved = true;
						}
					}else{
						if(!kick(mainKicks["cw"][piece.rotation])){
							piece.rotation = (piece.rotation - 1 + 4) % 4;
						}else{
							moved = true;
						}
					}
				}else{
					piece.rotation = (piece.rotation - 1 + 4) % 4;
				}
			}else{
				moved = true;
			}
		}
		if(wsrotating){
			piece.rotation = (piece.rotation - 1 + 4) % 4;
			if(!canMove(0, 0)){
				// Try kicks
				if(piece.type !== "O"){
					if(piece.type === "I"){
						if(!kick(IKicks["ws"][piece.rotation])){
							piece.rotation = (piece.rotation + 1) % 4;
						}else{
							moved = true;
						}
					}else{
						if(!kick(mainKicks["ws"][piece.rotation])){
							piece.rotation = (piece.rotation + 1) % 4;
						}else{
							moved = true;
						}
					}
				}else{
					piece.rotation = (piece.rotation + 1) % 4;
				}
			}else{
				moved = true;
			}
		}
		// Softdrop
		if(keys.soft){
			piece.fall += game.g * game.softdropMultiplier;
			softdropping = true;
		}
		// Harddrop
		if(keys.hard){
			if(controls.hardReady){
				controls.hardReady = false;
				piece.fall += height + 5;  // To be safe
				piece.grounded = fd.LD;
				harddropping = true;
			}
		}else{
			controls.hardReady = true;
		}
		
		// --Physics--
		// Falling
		piece.fall += game.g;
		while(piece.fall >= 1){
			piece.fall -= 1;
			// move down
			if(canMove(-1, 0)){
				piece.r -= 1;
				moved = true;
				if(harddropping){
					stats.score += 2*game.level;
				}else{
					if(softdropping){
						stats.score += 1*game.level;
					}
				}
			}
		}
		// T-spin?
		if(moved){
			if(piece.type === "T"){
				if(isImmobile()){
					console.log("*CLICK*");
					// T-spin! (Sound?)
					game.isTSpin = true;
				}else{
					game.isTSpin = false;
				}
			}
		}
		// Ghost
		if(moved){
			piece.ghostRDelta = -1;
			while(canMove(piece.ghostRDelta, 0)){
				piece.ghostRDelta -= 1;
			}
			piece.ghostRDelta += 1;
		}
		// Locking
		if(piece.grounded > 0){
			piece.grounded += 1;  // Tick lock delay
			piece.fall = 0;  // So it doesn't fall immediately if you move at a bad time
			//console.log(piece.grounded);
		}
		if(moved && piece.grounded <= fd.LD){  // Harddrop doesn't count as move
			if(!canMove(-1, 0)){
				piece.grounded = 1;  // [Re]Set lock delay
				//console.log("grounded");
			}else{
				piece.grounded = 0;  // No longer grounded
				//console.log("not grounded");
			}
		}
		if(piece.grounded >= fd.LD){  // Lock in piece
			let t = pieces[piece.type][piece.rotation].tiles;
			for(let i=0; i<t.length; ++i){
				board[piece.r+t[i][0]][piece.c+t[i][1]] = new Tile(piece.type);
				for(let c=0; c<5; ++c){
					particles.push(new ParticleLock(piece.r+t[i][0],piece.c+t[i][1], tc[piece.type].in));
				}
			}
			//console.log(board);
			game.stateFrame = 0;
			if(clearLines()){
				game.state = "clearing";
				if(game.mode === "marathon"){
					checkLevelup();
				}
			}else{
				game.state = "ARE";
			}
			if(lockedOut()){
				lose();
			}
			if(stats.lines >= 40 && game.mode === "sprint"){
				game.state = "complete";
			}
			if(stats.lines >= 150 && game.mode === "marathon"){
				game.state = "complete";
			}
		}
		moved = false;
	}
}

function backToMenu(){
	applicationState = "menu";
	menu.page = menu.page.parent;
	controls.confirmReady = false;
}

function canMove(dr, dc){
	return inBounds(dr, dc) && (!wouldOverlap(dr, dc));
}

function wouldOverlap(dr, dc){
	let t = pieces[piece.type][piece.rotation].tiles;
	for(let i=0; i<t.length; ++i){
		if(board[piece.r+dr+t[i][0]][piece.c+dc+t[i][1]].type !== "B"){
			return true;
		}
	}
	return false;
}

function inBounds(dr, dc){
	let p_data = pieces[piece.type][piece.rotation];
	let bottom = dr + piece.r + p_data.rmin >= 0;
	let left = dc + piece.c + p_data.cmin >= 0;
	let right = dc + piece.c + p_data.cmax < width;
	return bottom && left && right;
}

function isImmobile(){
	//console.log("canMove(0, -1):" + canMove(0, -1));
	//console.log("canMove(0, 1):" + canMove(0, 1));
	//console.log("canMove(1, 0):" + canMove(1, 0));
	return !canMove(0, -1) && !canMove(0, 1) && !canMove(1, 0);
}

function lockedOut(){
	return piece.r + pieces[piece.type][piece.rotation].rmin >= height;
}

function kick(kicks){  // Return false if no kick works
	for(let i=0; i<kicks.length; ++i){
		if(canMove(kicks[i][0], kicks[i][1])){
			piece.r += kicks[i][0];
			piece.c += kicks[i][1];
			return true;
		}
	}
	return false;
}

function setNewPiece(){
	piece.type = nextQueue.shift();
	nextQueue.push(randomizer.next());
	piece.r = 20;
	piece.c = 4;
	piece.grounded = 0;
	piece.fall = 0;
	piece.rotation  = 0;
}

function hold(){
	if(game.heldPiece === "B"){
		game.heldPiece = piece.type;
		game.stateFrame = 0;
		game.state = "ARE";
	}else{
		let tmp = game.heldPiece;
		game.heldPiece = piece.type;
		piece.type = tmp;
		piece.rotation = 0;
		piece.r = 20;
		piece.c = 4;
		piece.grounded = 0;
		piece.fall = 0;
		
		game.stateFrame = 0;
		game.state = "dropping";
	}
}

const tempScoring = {
	0: 0,
	1: 100,
	2: 300,
	3: 500,
	4: 800
};
function clearLines(){
	let rowsToClear = [];
	for(let r = piece.r + pieces[piece.type][piece.rotation].rmin; r <= piece.r + pieces[piece.type][piece.rotation].rmax; ++r){
		let thisOneOfficer = true;
		for(let c=0; c<width; ++c){
			//console.log(r + ", " + c + ", " + board[r][c].type);
			if(board[r][c].type === "B"){
				thisOneOfficer = false;
				//break;  breaks both loops?
				c = width;
			}
		}
		if(thisOneOfficer){
			rowsToClear.push(r);
		}
	}
	console.log(rowsToClear);
	// something something zone something scoring something drop combo(?)
	if(rowsToClear.length > 0){
		let scoreData = scoreClear(rowsToClear, game.isTSpin);
		stats.score += scoreData.score;
		particles.push(new ParticleText(scoreData.text, colToX(piece.c), rowToY(piece.r), 57));
		particles.push(new ParticleText("+"+scoreData.score, colToX(piece.c), rowToY(piece.r) + 50, 60));
		for(let i=0; i<backgroundParticles.length; ++i){
			backgroundParticles[i].abarration += Math.floor(Math.random()*20+40);
		}
		bgH.v += 10;
		bgS.v += 15;
		bgL.v += 7;
	}
	stats.lines += rowsToClear.length;
	removeLines(rowsToClear);
	return rowsToClear.length > 0;
}

function scoreClear(rowsToClear, isTSpin){
	let sd = {score: 0, text: ""};
	switch(rowsToClear.length){
		case 1:
		sd.text = "Single";
		break;
		case 2:
		if(rowsToClear[1] - rowsToClear[0] === 3){
			sd.text = "Wide Split";
		}else if(rowsToClear[1] - rowsToClear[0] === 2){
			sd.text = "Split";
		}else{
			sd.text = "Double";
		}
		break;
		case 3:
		if(rowsToClear[2] - rowsToClear[0] === 3){
			sd.text = "Big Split"
		}else{
			sd.text = "Triple";
		}
		break;
		case 4:
		sd.text = "Tetris!";
		break;
	}
	if(isTSpin){
		sd.text = "T-Spin " + sd.text;
		sd.text.trim();
		sd.text += "!";
	}
	
	switch(sd.text){
		case "Single":
		sd.score = 100;
		break;
		case "Double":
		sd.score = 250;
		break;
		case "Triple":
		sd.score = 450;
		break;
		case "Tetris!":
		sd.score = 800;
		break;
		case "Split":
		sd.score = 350;
		break;
		case "Big Split":
		sd.score = 700;
		break;
		case "Wide Split":
		sd.score = 500;
		break;
		case "T-Spin Single!":
		sd.score = 300;
		break;
		case "T-Spin Double!":
		sd.score = 550;
		break;
		case "T-Spin Triple!":
		sd.score = 800;
		break;
		case "T-Spin Split!":
		sd.score = 700;
		break;
	}
	
	return sd;
}

function removeLines(rowsToClear){
	for(let i=0; i<rowsToClear.length; ++i){
		genLineParticles(rowsToClear[i]);
	}
	for(let i=rowsToClear.length-1; i>=0; --i){
		board.splice(rowsToClear[i], 1);
		board.push([]);
		for(let c=0; c<width; ++c){
			board[board.length-1].push(new Tile("B"));
		}
	}
}

function genLineParticles(r){
	for(let c=0; c<width; ++c){
		particles.push(new ParticleClear(r, c, board[r][c].type));
	}
}


const levelData = {
	1:  {lines:   0,  g: 1/50},
	2:  {lines:  10,  g: 1/45},
	3:  {lines:  20,  g: 1/40},
	4:  {lines:  30,  g: 1/30},
	5:  {lines:  40,  g: 1/20},
	6:  {lines:  50,  g: 1/10},
	7:  {lines:  60,  g: 1/ 6},
	8:  {lines:  70,  g: 1/ 4},
	9:  {lines:  80,  g: 1/ 3},
	10: {lines:  90,  g: 1   },
	11: {lines: 100,  g: 1.4 },
	12: {lines: 110,  g: 1.9 },
	13: {lines: 120,  g: 2.7 },
	14: {lines: 130,  g: 4.1 },
	15: {lines: 140,  g: 20  },
	16: {lines: 150,  g: 20  }
}
	
function checkLevelup(){
	if(stats.lines >= levelData[game.level+1].lines){
		// Levelup
		game.level += 1;
		game.g = levelData[game.level].g;
		particles.push(new ParticleText("Level Up!", 400, 600, 90));
	}
}


// Kicks for each direction of rotation, for the NEW rotation value
const mainKicks   = {
	cw: {
		1: [[0,-1], [ 1,-1], [-2,0], [-2,-1]],
		2: [[0, 1], [-1, 1], [ 2,0], [ 2, 1]],
		3: [[0, 1], [ 1, 1], [-2,0], [-2, 1]],
		0: [[0,-1], [-1,-1], [ 2,0], [ 2,-1]]
	},
	ws: {
		0: [[0, 1], [-1, 1], [ 2,0], [ 2, 1]],
		1: [[0,-1], [ 1,-1], [-2,0], [-2,-1]],
		2: [[0,-1], [-1,-1], [ 2,0], [ 2,-1]],
		3: [[0, 1], [ 1, 1], [-2,0], [-2, 1]]
	}
};
const IKicks      = {
	cw: {
		1: [[0,-2], [0, 1], [-1,-2], [ 2, 1]],
		2: [[0,-1], [0, 2], [ 2,-1], [-1, 2]],
		3: [[0, 2], [0,-1], [ 1, 2], [-2,-1]],
		0: [[0, 1], [0,-2], [-2, 1], [ 1,-2]]
	},
	ws: {
		0: [[0, 2], [0,-1], [ 1, 2], [-2,-1]],
		1: [[0, 1], [0,-2], [-2, 1], [ 1,-2]],
		2: [[0,-2], [0, 1], [-1,-2], [ 2, 1]],
		3: [[0,-1], [0, 2], [ 2,-1], [-1, 2]]
	}
};
const akiraIKicks = [];


function menuUpdate(){
	// Run scripts
	if(menu.page.type === "function"){
		menu.page.func();
	}
	
	processBackgroundParticles();
	
	// Reset flags
	let upping = false;
	let downing = false;
	let lefting = false;
	let righting = false;
	let confirming = false;
	
	// --Controls--
	// Up/down
	if(keys.up){
		if(controls.upReady){
			controls.upReady = false;
			upping = true;
		}
	}else{
		controls.upReady = true;
	}
	if(keys.down){
		if(controls.downReady){
			controls.downReady = false;
			downing = true;
		}
	}else{
		controls.downReady = true;
	}
	// Left/right
	if(keys.left){
		if(controls.leftReady){
			controls.leftReady = false;
			lefting = true;
		}
	}else{
		controls.leftReady = true;
	}
	if(keys.right){
		if(controls.rightReady){
			controls.rightReady = false;
			righting = true;
		}
	}else{
		controls.rightReady = true;
	}
	// Confirm
	if(keys.confirm || keys.hard || keys.cwr || keys.wsr){
		if(controls.confirmReady){
			controls.confirmReady = false;
			confirming = true;
		}
	}else{
		controls.confirmReady = true;
	}
	
	
	if(upping && !menu.onBack){
		switch(menu.page.type){
			case "standard":
			menu.page.selectedOption = (menu.page.selectedOption - 1 + menu.page.options.length) % menu.page.options.length;
			break;
			case "scrolling":
			menu.page.currentPage = Math.max(menu.page.currentPage - 1, 0);
			break;
		}
	}
	if(downing && !menu.onBack){
		switch(menu.page.type){
			case "standard":
			menu.page.selectedOption = (menu.page.selectedOption + 1) % menu.page.options.length;
			break;
			case "scrolling":
			menu.page.currentPage = Math.min(menu.page.currentPage + 1, menu.page.pages.length-1);
			break;
		}
	}
	if(lefting){
		if(menu.page.parent !== null){
			menu.onBack = true;
		}
	}
	if(righting){
		menu.onBack = false;
	}
	if(confirming){
		if(menu.onBack){
			if(menu.page.parent !== null){
				menu.page = menu.page.parent;
				menu.onBack = false;
			}
		}else{
			switch(menu.page.type){
				case "standard":
				if(menu.page.selectedOption < menu.page.options.length){
					menu.page = menu.page.options[menu.page.selectedOption];
				}
				break;
			}
		}
	}
}


/**
 *               *
 *   PARTICLE    *
 *               *
 */

function ParticleLock(r, c, color){
	this.x = colToX(c) + tw*Math.random();
	this.y = rowToY(r) + tw*Math.random();
	this.color = color;
	this.lifetime = 0;
	this.toDestroy = false;
	this.update = function(){
		this.lifetime += 1;
		let lf = ((7-Math.sqrt(this.lifetime))/7);
		this.x += lf * (Math.random()-0.5)*tw * 1.2;
		this.y += lf * (Math.random()-0.2)*tw * 0.3;
		this.toDestroy = this.lifetime >= 50;
	}
	this.draw = function(){
		ctx.fillStyle = this.color;
		ctx.globalAlpha = ((7-Math.sqrt(this.lifetime))/7);
		ctx.beginPath();
		ctx.arc(this.x, this.y, 5, 0, 2*Math.PI);
		ctx.fill();
		ctx.globalAlpha = 1;
	}
}

function ParticleClear(r, c, type){
	this.x = colToX(c);
	this.y = rowToY(r);
	this.xv = Math.sin((c-4.5)/4.5*Math.PI/2 * 0.75) * 4;
	this.yv = -Math.cos((c-4.5)/4.5*Math.PI/2 * 0.95) * 6 - 1;
	this.type = type;
	this.lifetime = 0;
	this.toDestroy = false;
	this.update = function(){
		this.lifetime += 1;
		this.x += this.xv;
		this.y += this.yv;
		this.yv += 0.45;
		this.toDestroy = this.lifetime >= 90;
	}
	this.draw = function(){
		if(this.lifetime < 45 && this.lifetime%15 < 6){
			ctx.fillStyle = "#FFF";
			ctx.fillRect(this.x, this.y, tw, -(tw));
		}else{
			if(this.lifetime >= 45){
				ctx.globalAlpha = (90-this.lifetime)/(90-45);
			}
			let colors = tc[this.type]
			ctx.fillStyle = colors.out;
			ctx.fillRect(this.x, this.y, tw, -(tw));
			ctx.fillStyle = colors.in;
			ctx.fillRect(this.x+3, this.y-3, tw-6, -(tw-6));
			ctx.globalAlpha = 1;
		}
	}
}

function ParticleText(text, x, y, longevity){
	this.text = text;
	this.x = x;
	this.y = y;
	this.longevity = longevity;
	this.lifetime = 0;
	this.yv = -7;
	this.toDestroy = false;
	this.update = function(){
		this.lifetime += 1;
		this.y += this.yv;
		if(this.yv < 0){
			this.yv += 0.065;
			if(this.yv > 0){
				this.yv = 0;
			}
		}
		this.toDestroy = this.lifetime >= this.longevity;
	}
	this.draw = function(){
		if(this.longevity - this.lifetime < 10){
			ctx.globalAlpha = (this.longevity - this.lifetime) / 10;
		}
		ctx.fillStyle = "#C8C";
		ctx.strokeStyle = "#66B";
		ctx.lineWidth = 1;
		ctx.font = "40px Arial";
		ctx.textAlign = "center";
		ctx.fillText(text, this.x, this.y);
		ctx.strokeText(text, this.x, this.y);
		ctx.globalAlpha = 1;
	}
}

let particles = [];

function processAllParticles(){
	processForegroundParticles()
	processBackgroundParticles()
}
function processForegroundParticles(){
	for(let i=0; i<particles.length; ++i){
		particles[i].update();
		if(particles[i].toDestroy){
			particles.splice(i, 1);
			i -= 1;
		}
	}
}
function processBackgroundParticles(){
	for(let i=0; i<backgroundParticles.length; ++i){
		backgroundParticles[i].update();
		if(backgroundParticles[i].toDestroy){
			backgroundParticles.splice(i, 1);
			i -= 1;
		}
	}
}

function drawParticles(){
	for(let i=0; i<particles.length; ++i){
		particles[i].draw();
	}
}

function BGParticleRipple(){
	this.x = Math.random()*800;
	this.y = Math.random()*1000;
	this.r = 1;
	this.speed = 4;
	this.lifetime = 0;
	this.color = "#FFD";
	this.abarration = 0;
	this.toDestroy = false;
	this.update = function(){
		this.lifetime += 1;
		this.r += this.speed;
		this.toDestroy = this.lifetime >= 155;
	};
	this.draw = function(){
		if(155 - this.lifetime < 70){
			ctx.globalAlpha = (155 - this.lifetime) / 70;
		}else{
			ctx.globalAlpha = 1;
		}
		ctx.lineWidth = 3;
		if(this.abarration > 0){
			ctx.globalCompositeOperation = "lighter";
			ctx.strokeStyle = "#40b";
			ctx.beginPath();
			ctx.arc(this.x-6*Math.min(this.abarration/30, 1), this.y-2*Math.min(this.abarration/20, 3), this.r, 0, 2*Math.PI);
			ctx.stroke();
			ctx.strokeStyle = "#b40";
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
			ctx.stroke();
			ctx.strokeStyle = "#0b4";
			ctx.beginPath();
			ctx.arc(this.x+6*Math.min(this.abarration/30, 1), this.y+2*Math.min(this.abarration/20, 3), this.r, 0, 2*Math.PI);
			ctx.stroke();
			ctx.globalCompositeOperation = "source-over";
			this.abarration -= 1;
		}else{
			ctx.strokeStyle = this.color;
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}
}

let backgroundParticles = [];

function drawBackgroundParticles(){
	for(let i=0; i<backgroundParticles.length; ++i){
		backgroundParticles[i].draw();
	}
}


/**
 *               *
 *     MENU      *
 *               *
 */

function initMenu(){
	let menuRoot = new MenuPage("Dedriz", null);
	let menuPlay = new MenuPage("Play!");
	menuPlay.addChild(new FunctionPage("Free Play", initFreePlay)).addChild(new FunctionPage("Sprint", initSprint)).addChild(new FunctionPage("Marathon", initMarathon));
	let menuHelp = new ScrollPage("Help");
	menuHelp.addPage(new ScrollComponent(["This is the help!"])).addPage(new ScrollComponent(["Help page 2!"])).addPage(new ScrollComponent(["Use the left arrow key to reach the back","button btw","","Most buttons, plus the enter key, can select","menu options"]));
	let menuOptions = new MenuPage("Options");
	let menuCredits = new ScrollPage("Credits");
	menuCredits.addPage(new ScrollComponent(["Programming","Tessa McMillin","","","","Design","Also me hello"])).addPage(new ScrollComponent(["Testing","Jet & Friends"]));
	menuRoot.addChild(menuPlay).addChild(menuHelp).addChild(menuOptions).addChild(menuCredits);
	//let menuFreePlay = 
	console.log(menuRoot);
	menu.page = menuRoot;
}

function MenuPage(title){
	this.type = "standard";
	this.title = title;
	this.options = [];
	this.selectedOption = 0;
	this.parent = null;
	this.addChild = function(child){
		this.options.push(child);
		child.parent = this;
		return this;
	}
	this.draw = function(){
		// TODO: back button
		ctx.fillStyle = "#EEE";
		ctx.font = "50px Arial";
		ctx.textAlign = "center";
		ctx.fillText(this.title, 400, 100);
		for(let i=0; i<this.options.length; ++i){
			ctx.strokeStyle = this.selectedOption === i && !menu.onBack ? "#FFF" : "#AAA";
			ctx.lineWidth = this.selectedOption === i && !menu.onBack ? 4 : 1;
			ctx.strokeRect(300, 300 + 150*i, 200, 100);
			ctx.fillStyle = "#EEE";
			ctx.font = "30px Arial";
			ctx.fillText(this.options[i].title, 400, 360 + 150*i);
		}
	}
}
function ScrollPage(title){
	this.type = "scrolling";
	this.title = title;
	this.pages = [];
	this.currentPage = 0;
	this.addPage = function(page){
		this.pages.push(page);
		page.parent = this;
		return this;
	}
	this.draw = function(){
		// TODO: back button
		this.pages[this.currentPage].draw();
		for(let i=0; i<this.pages.length; ++i){
			ctx.fillStyle = this.currentPage === i ? "#BBF" : "#666";
			ctx.beginPath();
			ctx.arc(785, 15 + 30*i, 10, 0, 2*Math.PI);
			ctx.fill();
		}
	}
}
function ScrollComponent(text){
	this.text = text;
	this.draw = function(){
		ctx.fillStyle = "#EEE";
		ctx.font = "30px Arial";
		ctx.textAlign = "left";
		for(let i=0; i<text.length; ++i){
			ctx.fillText(text[i], 100, 80 + 50*i);
		}
	}
}
function FunctionPage(title, func){
	this.type = "function";
	this.title = title;
	this.parent = null;
	this.func = func;
	this.draw = function(){
		// Loading text?
	}
}


/**
 *               *
 *     DRAW      *
 *               *
 */
 
const ho = 200;
const vo = 20;
const tw = 40;
const mh = 1000;

function testDraw(){
	drawBackground();
	ctx.strokeStyle = "#FFF";
	ctx.lineWidth = 5;
	ctx.globalAlpha = 1;
	ctx.beginPath();
	ctx.arc(400, 500, 200*Math.abs(Math.sin(game.stateFrame * Math.PI / 50)), 0, Math.PI*2);
	ctx.stroke();
	ctx.globalAlpha = 0.8;
	ctx.beginPath();
	ctx.arc(400, 500, 200*Math.abs(Math.sin((game.stateFrame-0.5) * Math.PI / 50)), 0, Math.PI*2);
	ctx.stroke();
	ctx.globalAlpha = 0.6;
	ctx.beginPath();
	ctx.arc(400, 500, 200*Math.abs(Math.sin((game.stateFrame-1) * Math.PI / 50)), 0, Math.PI*2);
	ctx.stroke();
	ctx.globalAlpha = 0.4;
	ctx.beginPath();
	ctx.arc(400, 500, 200*Math.abs(Math.sin((game.stateFrame-1.5) * Math.PI / 50)), 0, Math.PI*2);
	ctx.stroke();
	ctx.globalAlpha = 0.2;
	ctx.beginPath();
	ctx.arc(400, 500, 200*Math.abs(Math.sin((game.stateFrame-2) * Math.PI / 50)), 0, Math.PI*2);
	ctx.stroke();
	window.requestAnimationFrame(testDraw);
}

function draw(){
	switch(applicationState){
		case "game":
		drawBackground();
		//drawBackgroundParticles();
		drawBoard();
		if(game.state === "dropping"){
			drawGhostPiece();
			drawPiece();
		}
		if((game.state === "complete" || game.state === "lost") && game.stateFrame >= 50){
			drawContinueMessage();
		}
		drawHold();
		drawNext();
		if(game.mode === "sprint"){
			drawLines(20, 380);
		}else{
			drawScore(20, 380);
		}
		drawTime(20, 440);
		if(game.mode === "marathon"){
			drawLevel(20, 500);
		}
		drawAnimation(20, 600);
		drawParticles();
		break;
		
		case "menu":
		drawBackground();
		//drawBackgroundParticles();
		drawCurrentPage();
		drawBack();
		break;
	}
	
	if(DEBUG_SHOULD_DRAW){
		window.requestAnimationFrame(draw);
	}
}

function HSLToRGB(h,s,l) {
	// Must be fractions of 1
	h = (h+360) % 360;
	s /= 100;
	l /= 100;

	let c = (1 - Math.abs(2 * l - 1)) * s,
		x = c * (1 - Math.abs((h / 60) % 2 - 1)),
		m = l - c/2,
		r = 0,
		g = 0,
		b = 0;
	if (0 <= h && h < 60) {
		r = c; g = x; b = 0;
	} else if (60 <= h && h < 120) {
		r = x; g = c; b = 0;
	} else if (120 <= h && h < 180) {
		r = 0; g = c; b = x;
	} else if (180 <= h && h < 240) {
		r = 0; g = x; b = c;
	} else if (240 <= h && h < 300) {
		r = x; g = 0; b = c;
	} else if (300 <= h && h < 360) {
		r = c; g = 0; b = x;
	}
	r = Math.round((r + m) * 255);
	g = Math.round((g + m) * 255);
	b = Math.round((b + m) * 255);
	
	r = r.toString(16);
	g = g.toString(16);
	b = b.toString(16);
	if (r.length == 1)
		r = "0" + r;
	if (g.length == 1)
		g = "0" + g;
	if (b.length == 1)
		b = "0" + b;
	return "#" + r + g + b;
}

let bgH = {v: 240, min: 220, max: 260, motion: 40/250};
let bgS = {v: 30, min: 25, max: 35, motion: 10/70};
let bgL = {v: 20, min: 19, max: 23, motion: 4/70};
let bgCounter = 0;
function moveColorComponent(c){
	c.v += c.motion;
	if(c.v >= c.max){
		c.motion = -Math.abs(c.motion);
	}
	if(c.v <= c.min){
		c.motion = Math.abs(c.motion);
	}
}
function drawBackground(){
	moveColorComponent(bgH);
	moveColorComponent(bgS);
	moveColorComponent(bgL);
	ctx.fillStyle = HSLToRGB(bgH.v, bgS.v, bgL.v);
	ctx.fillRect(0, 0, 800, 1000);
	
	/*bgCounter += 1;
	if(game.state === "clearing"){
		bgCounter++;
	}
	for(let x=0; x<800/20; x++){
		for(let y=0; y<1000/20; y++){
			if(applicationState === "game" && !(x >= 10 && x < 30 && y >= 9 && y < 49)){
				ctx.beginPath();
				ctx.fillStyle = "#557";
				if(game.state === "clearing"){
					ctx.fillStyle = "#867";
				}
				let r = 1;
				let n = (-0.1*x-y+bgCounter) % 100;
				if(n >= 20 && n < 80){
					r = 3 - Math.abs(n-50)/15;
				}
				ctx.arc(x*20 + 20/2, y*20 + 20/2, r, 0, 2*Math.PI);
				ctx.fill();
			}
		}
	}*/
}


function drawBoard(){
	for(let r=0; r<height; ++r){
		for(let c=0; c<width; ++c){
			let colors = tc[board[r][c].type];
			if(board[r][c].type == "B"){
				ctx.globalAlpha = 0.8;
			}
			ctx.fillStyle = colors.out;
			ctx.fillRect(colToX(c), rowToY(r), tw, -(tw));
			if(board[r][c].type == "B"){
				ctx.globalAlpha = 1;
			}
			ctx.fillStyle = colors.in;
			ctx.fillRect(colToX(c)+3, rowToY(r)-3, tw-6, -(tw-6));
			ctx.globalAlpha = 1;
		}
	}
	for(let r=height; r<height+hiddenRows; ++r){
		for(let c=0; c<width; ++c){
			if(board[r][c].type !== "B"){
				// fixme: Dim the ghosted pieces?
				let colors = tc[board[r][c].type];
				ctx.fillStyle = colors.out;
				ctx.fillRect(colToX(c), rowToY(r), tw, -(tw));
				ctx.fillStyle = colors.in;
				ctx.fillRect(colToX(c)+3, rowToY(r)-3, tw-6, -(tw-6));
			}
		}
	}
}

function drawPiece(){
	let colors = tc[piece.type];
	let t = pieces[piece.type][piece.rotation].tiles;
	drawMino(colToX(piece.c), rowToY(piece.r), t, colors.in, colors.out);
}

function drawGhostPiece(){
	let colors = tc["B"];
	let t = pieces[piece.type][piece.rotation].tiles;
	drawMino(colToX(piece.c), rowToY(piece.r+piece.ghostRDelta), t, colors.out, colors.in);
}

function drawHold(){
	if(game.heldPiece !== "B"){
		let colors = tc[game.heldPiece];
		let t = pieces[game.heldPiece][0].tiles;
		drawMino(60, 100, t, colors.in, colors.out);
	}
}

function drawNext(){
	const visibleNext = 5;
	for(let i=0; i<visibleNext; ++i){
		let colors = tc[nextQueue[i]];
		let t = pieces[nextQueue[i]][0].tiles;
		drawMino(660 + (nextQueue[i]!=="O"&&nextQueue[i]!=="I" ? 20 : 0), 340-vo + (40*2+10*2)*i - (nextQueue[i]==="I" ? 20 : 0), t, colors.in, colors.out);
	}
}

function drawMino(x, y, t, innerColor, outerColor){
	for(let i=0; i<t.length; ++i){
		ctx.fillStyle = outerColor;
		ctx.fillRect(x + t[i][1]*tw, y - t[i][0]*tw, tw, -(tw));
		ctx.fillStyle = innerColor;
		ctx.fillRect(x + t[i][1]*tw + 3, y - t[i][0]*tw - 3, tw-6, -(tw-6));
	}
}

function drawContinueMessage(){
	ctx.font = "40px Arial";
	ctx.textAlign = "center";
	ctx.fillStyle = "#F5A";
	ctx.fillText("Press any key to continue", 400, 250);
}

function drawScore(x, y){
	ctx.font = "30px Papyrus";
	ctx.textAlign = "left";
	ctx.fillStyle = "#F5A";
	ctx.fillText(stats.score, x, y);
}

function drawLines(x, y){
	ctx.font = "30px Papyrus";
	ctx.textAlign = "left";
	ctx.fillStyle = "#F5A";
	ctx.fillText(Math.max(40-stats.lines, 0), x, y);
}

function drawTime(x, y){
	time.milli = Math.floor((stats.time / UPS * 1000) % 1000);
	if(time.milli === 0){
		time.sec = Math.floor((stats.time / UPS) % 60);
		if(time.sec === 0){
			time.min = Math.floor((stats.time / UPS / 60) % 60);
			if(time.min === 0){
				time.hour = Math.min(Math.floor(stats.time / UPS / 3600), 99);
			}
		}
	}
	ctx.font = "30px Papyrus";
	ctx.textAlign = "left";
	ctx.fillStyle = "#F5A";
	ctx.fillText((("00" + time.hour).slice(-2))+":"+(("00" + time.min).slice(-2))+":"+(("00" + time.sec).slice(-2))+"."+(("00" + time.milli).slice(-2)), x, y);
}

function drawLevel(x, y){
	ctx.font = "30px Papyrus";
	ctx.textAlign = "left";
	ctx.fillStyle = "#F5A";
	ctx.fillText("Level: " + game.level, x, y);
}


function drawCurrentPage(){
	menu.page.draw();
}

function drawBack(){
	if(menu.page.parent !== null){
		ctx.strokeStyle = menu.onBack ? "#FFF" : "#AAA";
		ctx.lineWidth = menu.onBack ? 4 : 1;
		ctx.strokeRect(5, 300, 40, 400);
		ctx.save();
		ctx.translate(30, 500);
		ctx.rotate(-Math.PI / 2);
		ctx.textAlign = "center";
		ctx.font = "20px Arial";
		ctx.fillStyle = "#EEE";
		ctx.fillText("Back", 0, 0);
		ctx.restore();
	}
}

function drawAnimation(x, y){
	anim.frame = (anim.frame + 1) % (anim.duration * animData[anim.name].length);
	
	let d = animData[anim.name][Math.floor(anim.frame / anim.duration)];
	for(let r=0; r<d.length; ++r){
		for(let c=0; c<d[r].length; ++c){
			ctx.fillStyle = tc[d[r][c].type].in;
			ctx.fillRect(x + c*20, y + (d.length-r)*20, 20, -20);
		}
	}
}


const tc = {
	I: {out: "#4bada7", in: "#8df2eb"},
	O: {out: "#dac90a", in: "#f5ef53"},
	T: {out: "#7f0d91", in: "#cc27e6"},
	L: {out: "#bd8608", in: "#ffad26"},
	J: {out: "#07097a", in: "#1c1fc9"},
	S: {out: "#078c1d", in: "#63df50"},
	Z: {out: "#8b1a1a", in: "#e22c2c"},
	B: {out: "#A7A7A7", in: "#BBBBBB"},
	W: {out: "#EEEEEE", in: "#FFFFFF"}
};

function rowToY(r){
	return mh-(vo+(r)*tw);
}
function colToX(c){
	return ho+(c)*tw;
}

const animData = {
	single:  [ [[new Tile("B"), new Tile("Z"), new Tile("Z"), new Tile("S"), new Tile("I"), new Tile("I"), new Tile("I"), new Tile("I")],
				[new Tile("Z"), new Tile("Z"), new Tile("S"), new Tile("S"), new Tile("B"), new Tile("B"), new Tile("L"), new Tile("L")],
				[new Tile("B"), new Tile("B"), new Tile("S"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("L"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("L"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("O"), new Tile("O"), new Tile("B"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("O"), new Tile("O"), new Tile("B"), new Tile("B")]],
				
			   [[new Tile("B"), new Tile("Z"), new Tile("Z"), new Tile("S"), new Tile("I"), new Tile("I"), new Tile("I"), new Tile("I")],
				[new Tile("Z"), new Tile("Z"), new Tile("S"), new Tile("S"), new Tile("B"), new Tile("B"), new Tile("L"), new Tile("L")],
				[new Tile("B"), new Tile("B"), new Tile("S"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("L"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("O"), new Tile("O"), new Tile("L"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("O"), new Tile("O"), new Tile("B"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B")]],
				
			   [[new Tile("B"), new Tile("Z"), new Tile("Z"), new Tile("S"), new Tile("I"), new Tile("I"), new Tile("I"), new Tile("I")],
				[new Tile("Z"), new Tile("Z"), new Tile("S"), new Tile("S"), new Tile("B"), new Tile("B"), new Tile("L"), new Tile("L")],
				[new Tile("B"), new Tile("B"), new Tile("S"), new Tile("B"), new Tile("O"), new Tile("O"), new Tile("L"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("O"), new Tile("O"), new Tile("L"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B")]],
				
			   [[new Tile("B"), new Tile("Z"), new Tile("Z"), new Tile("S"), new Tile("I"), new Tile("I"), new Tile("I"), new Tile("I")],
				[new Tile("Z"), new Tile("Z"), new Tile("S"), new Tile("S"), new Tile("O"), new Tile("O"), new Tile("L"), new Tile("L")],
				[new Tile("B"), new Tile("B"), new Tile("S"), new Tile("B"), new Tile("O"), new Tile("O"), new Tile("L"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("L"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B")]],
				
			   [[new Tile("B"), new Tile("Z"), new Tile("Z"), new Tile("S"), new Tile("I"), new Tile("I"), new Tile("I"), new Tile("I")],
				[new Tile("W"), new Tile("W"), new Tile("W"), new Tile("W"), new Tile("W"), new Tile("W"), new Tile("W"), new Tile("W")],
				[new Tile("B"), new Tile("B"), new Tile("S"), new Tile("B"), new Tile("O"), new Tile("O"), new Tile("L"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("L"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B")]],
				
			   [[new Tile("B"), new Tile("Z"), new Tile("Z"), new Tile("S"), new Tile("I"), new Tile("I"), new Tile("I"), new Tile("I")],
				[new Tile("B"), new Tile("B"), new Tile("S"), new Tile("B"), new Tile("O"), new Tile("O"), new Tile("L"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("L"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B")],
				[new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B"), new Tile("B")]]
			]
}
	



/**
 *               *
 *     RAND      *
 *               *
 */
 
const pieceNames = ["I", "O", "T", "L", "J", "S", "Z"];

function BS(){
	this.next = function(){
		return pieceNames[Math.floor(Math.random()*pieceNames.length)];
	}
}

function SevenBag(){
	this.available = [true, true, true, true, true, true, true];
	this.next = function(){  // todo: optimize from O(inf)
		// Refill bag if needed
		let usedAll = true;
		for(let i=0; i<this.available.length; ++i){
			if(this.available[i] === true){
				usedAll = false;
			}
		}
		if(usedAll){
			this.available = [true, true, true, true, true, true, true];
		}
		// Draw from bag
		let p = "B";
		while(p === "B"){
			let i = Math.floor(Math.random()*this.available.length);
			if(this.available[i]){
				p = pieceNames[i];
				this.available[i] = false;
			}
		}
		return p;
	}
}


/**
 *               *
 *     MISC      *
 *               *
 */
 
function Tile(type){
	this.type = type;
}

function keyDownHandler(e){  // lazy
	//console.log("Down: " + e.keyCode);
	//console.log(e.repeat);
	// TODO: Simplify key handling when Edge implements .repeat correctly
	/*switch(e.keyCode){
		case bindings.left:
		keys.left = true;
		break;
		case bindings.right:
		keys.right = true;
		break;
		case bindings.hard:
		keys.hard = true;
		break;
		case bindings.soft:
		keys.soft = true;
		break;
		case bindings.cwr:
		keys.cwr = true;
		break;
		case bindings.wsr:
		keys.wsr = true;
		break;
		case bindings.hold:
		keys.hold = true;
		break;
		case bindings.zone:
		keys.zone = true;
		break;
		case bindings.up:
		keys.up = true;
		break;
		case bindings.down:
		keys.down = true;
		break;
		case bindings.confirm:
		keys.confirm = true;
		break;
	}*/
	if(e.keyCode === bindings.left){
		keys.left = true;
	}
	if(e.keyCode === bindings.right){
		keys.right = true;
	}
	if(e.keyCode === bindings.hold){
		keys.hold = true;
	}
	if(e.keyCode === bindings.zone){
		keys.zone = true;
	}
	if(e.keyCode === bindings.up){
		keys.up = true;
	}
	if(e.keyCode === bindings.down){
		keys.down = true;
	}
	if(e.keyCode === bindings.confirm){
		keys.confirm = true;
	}
	if(e.keyCode === bindings.hard){
		keys.hard = true;
	}
	if(e.keyCode === bindings.soft){
		keys.soft = true;
	}
	if(e.keyCode === bindings.cwr){
		keys.cwr = true;
	}
	if(e.keyCode === bindings.wsr){
		keys.wsr = true;
	}
}

function keyUpHandler(e){
	//console.log("Up: " + e.keyCode);
	/*switch(e.keyCode){
		case bindings.left:
		keys.left = false;
		break;
		case bindings.right:
		keys.right = false;
		break;
		case bindings.hard:
		keys.hard = false;
		break;
		case bindings.soft:
		keys.soft = false;
		break;
		case bindings.cwr:
		keys.cwr = false;
		break;
		case bindings.wsr:
		keys.wsr = false;
		break;
		case bindings.hold:
		keys.hold = false;
		break;
		case bindings.zone:
		keys.zone = false;
		break;
		case bindings.up:
		keys.up = false;
		break;
		case bindings.down:
		keys.down = false;
		break;
		case bindings.confirm:
		keys.confirm = false;
		break;
	}*/
	if(e.keyCode === bindings.left){
		keys.left = false;
	}
	if(e.keyCode === bindings.right){
		keys.right = false;
	}
	if(e.keyCode === bindings.hold){
		keys.hold = false;
	}
	if(e.keyCode === bindings.zone){
		keys.zone = false;
	}
	if(e.keyCode === bindings.up){
		keys.up = false;
	}
	if(e.keyCode === bindings.down){
		keys.down = false;
	}
	if(e.keyCode === bindings.confirm){
		keys.confirm = false;
	}
	if(e.keyCode === bindings.hard){
		keys.hard = false;
	}
	if(e.keyCode === bindings.soft){
		keys.soft = false;
	}
	if(e.keyCode === bindings.cwr){
		keys.cwr = false;
	}
	if(e.keyCode === bindings.wsr){
		keys.wsr = false;
	}
}

function demo(){
	board[0][0] = new Tile("I");
	board[0][1] = new Tile("O");
	board[0][2] = new Tile("T");
	board[0][3] = new Tile("J");
	board[0][4] = new Tile("L");
	board[0][5] = new Tile("S");
	board[0][6] = new Tile("Z");
	board[4][1] = new Tile("O");
	board[4][2] = new Tile("O");
	board[5][1] = new Tile("O");
	board[5][2] = new Tile("O");
	board[7][2] = new Tile("T");
	board[8][1] = new Tile("T");
	board[8][2] = new Tile("T");
	board[8][3] = new Tile("T");
	board[10][1] = new Tile("L");
	board[10][2] = new Tile("L");
	board[11][1] = new Tile("L");
	board[12][1] = new Tile("L");
	board[14][1] = new Tile("J");
	board[14][2] = new Tile("J");
	board[15][2] = new Tile("J");
	board[16][2] = new Tile("J");
	board[14][5] = new Tile("S");
	board[14][6] = new Tile("S");
	board[15][6] = new Tile("S");
	board[15][7] = new Tile("S");
	board[11][6] = new Tile("Z");
	board[11][7] = new Tile("Z");
	board[12][5] = new Tile("Z");
	board[12][6] = new Tile("Z");
	board[5][6] = new Tile("I");
	board[6][6] = new Tile("I");
	board[7][6] = new Tile("I");
	board[8][6] = new Tile("I");
	board[20][3] = new Tile("T");
	board[20][4] = new Tile("T");
	board[20][5] = new Tile("T");
	board[21][4] = new Tile("T");
}

function lose(){
	game.state = "lost";
	game.stateFrame = 0;
	// Text or anim or sound here?
}

function printBoard(){
	let buffer = "[";
	for(let r=0; r<6; ++r){
		buffer += "[";
		for(let c=0; c<8; ++c){
			buffer += "new Tile(\"" + board[r][c].type + "\")";
			if(c < 7){
				buffer += ", ";
			}
		}
		buffer += "],\n";
	}
	buffer += "]";
	console.log(buffer);
}

/**
 *               *
 *     INIT      *
 *               *
 */
 
function init(){
	initMenu();
	setInterval(update, 1000/UPS);
	setTimeout(function(){window.requestAnimationFrame(draw)}, 1000/UPS/2);
}

function initFreePlay(){
	game.mode = "freeplay";
	newGame(1);
}

function initSprint(){
	game.mode = "sprint";
	newGame(1);
}

function initMarathon(){
	game.mode = "marathon";
	newGame(1);
}

function newGame(level){
	
	applicationState = "game";
	// Reset game and stats unless we want to let game.maxZone be upgraded across a session or want to save stats to a new variable
	stats.score = 0;
	stats.lines = 0;
	stats.time = 0;
	game.level = level;
	game.g = levelData[level].g;
	// Freshen board
	board = [];
	for(let r=0; r<height+hiddenRows; ++r){
		board.push([]);
		for(let c=0; c<width; ++c){
			board[r].push(new Tile("B"));
		}
	}
	// Fill that next queue
	randomizer = new SevenBag();
	nextQueue = [];
	while(nextQueue.length < 7){
		nextQueue.push(randomizer.next());
	}
	game.heldPiece = "B";
	//demo();
	game.state = "ARE";
	game.stateFrame = 0;
	
	console.log(game.mode);
}

window.addEventListener("DOMContentLoaded", (e) => {
	console.log("Loaded");
	canv = document.getElementById("mainCanvas");
	ctx = canv.getContext("2d");
	ctx.fillStyle = "#FF0000";
	document.body.addEventListener('keydown', keyDownHandler);
	document.body.addEventListener('keyup', keyUpHandler);
	init();
});