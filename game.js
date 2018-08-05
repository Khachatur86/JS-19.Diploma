'use strict';
'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

    plus(vector) {
            if (!(vector instanceof Vector)) {
                throw new Error('Можно прибавлять к вектору только вектор типа Vector');
            }
            return new Vector(this.x + vector.x, this.y + vector.y);
    }

    times(factor) {
        return new Vector(this.x*factor, this.y*factor);
    }
}

class Actor {
    constructor(pos = new Vector(0,0), size = new Vector(1,1), speed = new Vector(0,0)) {
            if( (!(pos instanceof Vector)) || (!(size instanceof Vector)) || (!(speed instanceof Vector))) {
                throw new Error('Все параметры должны быть типа Vector');
            }
            this.pos = pos;
            this.size = size;
            this.speed = speed;
    }

    act() {}

    get left() {
        return this.pos.x;
    }

    get right() {
        return this.pos.x + this.size.x;
    }

    get top() {
        return this.pos.y;
    }

    get bottom() {
        return this.pos.y + this.size.y;
    }
	
    get type() {
        return 'actor';
    }

    isIntersect(actor) {
            if ((!actor) || (!(actor instanceof Actor))) {
                throw new Error ('Параметр должен быть типа Actor');
            }

            if (actor === this) {
                return false;
            }

            return (actor.right > this.left) && (actor.left < this.right) && (actor.bottom > this.top) && (actor.top < this.bottom);

    }
}



class Level {
    constructor(rowString = [], rowActor = []) {
        this.grid = rowString;
        this.actors = rowActor;
        this.player = rowActor.find(actor => actor.type === 'player');
        this.height = rowString.length;
        this.width = rowString.reduce((prev,context) => prev < context.length ? context.length : prev, 0);
        this.status = null;
        this.finishDelay = 1;
    }

    isFinished() {
		return ((this.status !== null) && (this.finishDelay < 0));
    }

    actorAt(obj) {
        return this.actors.find(actor => actor.isIntersect(obj));
    }

    obstacleAt(pos, size) {
        const leftBorder = Math.floor(pos.x),
		rightBorder = Math.ceil(pos.x + size.x),
		topBorder = Math.floor(pos.y),
		bottomBorder = Math.ceil(pos.y + size.y);

        if (leftBorder < 0 || rightBorder > this.width || topBorder < 0) {
            return 'wall';
        }

        if (bottomBorder > this.height) {
            return 'lava';
        }
        for (let y = topBorder; y < bottomBorder; y++) {
            for (let x = leftBorder; x < rightBorder; x++) {
                let fieldType = this.grid[y][x];
                if (fieldType) {
                    return fieldType;
                }
            }
        }
    }

    removeActor(actor) {
        const indexActor = this.actors.indexOf(actor);
        this.actors.splice(indexActor, 1);
    }

    noMoreActors(type) {

		return this.actors.find(actor => actor.type === type) ? false : true;
    }

	
    playerTouched(type, touchedActor) {
        if (this.status !== null) {
            return false;
        }
        else if ((type === 'lava') || (type === 'fireball')) {
            this.status = 'lost';
            this.finishDelay = 1;
        } else if (type === 'coin') {
            this.actors = this.actors.filter(actor => actor !== touchedActor);
            if (this.noMoreActors('coin')) {
                this.status = 'won';
                this.finishDelay = 1;
            }
        }
    }
}



class LevelParser {
    constructor(dictionary){
        this.dictionary = dictionary || [];
    }

    actorFromSymbol(symbol) {
        if (symbol === undefined) {
			return;
        }
		
        if (Object.keys(this.dictionary).indexOf(symbol) !== -1){
            return this.dictionary[symbol];
        }
		return;
    }

    obstacleFromSymbol(symbol) {
		return { 'x': 'wall', '!': 'lava' }[symbol];
    }

    createGrid(rowString) {
        let row = [];
        for (let i = 0; i < rowString.length; i++) {
            row[i] = [];
            for (let j = 0; j < rowString[i].length; j++) {
                row[i][j] = this.obstacleFromSymbol(rowString[i][j]);
            }
        }
        return row;
    }

    createActors(rowString) {
        let rowActor = [], counter = 0;
        for (let i = 0; i < rowString.length; i++) {
            for (let j = 0; j < rowString[i].length; j++) {
                if ((this.actorFromSymbol(rowString[i][j])) && (!this.obstacleFromSymbol(rowString[i][j])) && (typeof (this.actorFromSymbol(rowString[i][j])) == 'function')) {
                    let funcCreate = this.actorFromSymbol(rowString[i][j]);
                    let actorCreate = new funcCreate(new Vector(j, i));
                    if(Actor.prototype.isPrototypeOf(actorCreate)) {
                        rowActor[counter] = actorCreate;
                        counter++;
                    }
                }
            }
        }
        return rowActor;
    }
	
    parse(rowString) {
        return new Level(this.createGrid(rowString), this.createActors(rowString));
    }

	
}



class Fireball extends Actor {
    constructor(coords = new Vector(0,0), speed = new Vector(0,0)) {
        super(coords, new Vector(1,1), speed);
    }

    get type() {
        return 'fireball';
    }

    getNextPosition(time = 1) {
        return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time, level) {
        let newPos = this.getNextPosition(time);
        let isObstacle = level.obstacleAt(newPos, this.size);
        if (!isObstacle) {
            this.pos = newPos;
        }
        else {
            this.handleObstacle();
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(coords) {
        super(coords);
        this.speed.x = 2;
    }
}

class VerticalFireball extends Fireball {
    constructor(coords) {
        super(coords);
        this.speed.y = 2;
    }
}

class FireRain extends Fireball {
    constructor(coords) {
        super(coords);
        this.speed.y = 3;
        this.startPos = coords;
    }

    handleObstacle() {
        this.pos = this.startPos;
    }
}


function rand(max = 10, min = 0) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Coin extends Actor {
    constructor(coords) {
        super(coords);
        this.pos = this.pos.plus(new Vector(0.2, 0.1));
        this.size = new Vector(0.6, 0.6);
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = rand(Math.PI * 2, 0);
        this.startPos = this.pos;
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring = this.spring + this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, this.springDist * Math.sin(this.spring));
    }

    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.startPos.plus(this.getSpringVector());
    }

    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(coords) {
        super(coords);
        this.pos = this.pos.plus(new Vector(0, -0.5));
        this.size = new Vector(0.8,1.5);
    }

    get type() {
        return 'player';
    }
}


const actorDict = {
  '@': Player,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'o': Coin,
  'v': FireRain
}


const parser = new LevelParser(actorDict);

loadLevels()
  .then(schemas => runGame(JSON.parse(schemas), parser, DOMDisplay))
  .then(() => alert('Вы выиграли приз!'));