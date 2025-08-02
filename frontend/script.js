
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const DECIMAL_MULTIPLIER = 10000;
const WIDTH = 800;
const HEIGHT = 800;
const ballRadius = 7;
const obstacleRadius = 4;
const gravity = pad(0.2);
const horizontalFriction = 0.4;
const verticalFriction = 0.8;
let balls = [];
const obstacles = [];
const sinks = [];

function pad(n) {
  return n * DECIMAL_MULTIPLIER;
}

function unpad(n) {
  return n / DECIMAL_MULTIPLIER;
}

const rows = 16;
for (let row = 2; row < rows; row++) {
  const numObstacles = row + 1;
  const y = row * 35;
  const spacing = 36;
  for (let col = 0; col < numObstacles; col++) {
    const x = WIDTH / 2 - spacing * (row / 2 - col);
    obstacles.push({ x: pad(x), y: pad(y), radius: obstacleRadius });
  }
}

const sinkWidth = 36;
const NUM_SINKS = 15;
const totalSinkWidth = NUM_SINKS * sinkWidth;
const startX = (WIDTH - totalSinkWidth) / 2;

for (let i = 0; i < NUM_SINKS; i++) {
  const x = startX + i * sinkWidth + sinkWidth / 2;
  const y = HEIGHT - 240;
  const width = sinkWidth;
  const height = width;
  sinks.push({ x, y, width, height });
}

class Ball {
  constructor(x, y, radius, color, pattern) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.vx = pad(0.1);
    this.vy = 0;
    this.pattern = pattern || [];
    this.patternIndex = 0;
    this.nextPatternY = pad(100);
    this.patternStepY = pad(35);
  }

  draw() {
    ctx.beginPath();
    ctx.arc(unpad(this.x), unpad(this.y), this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }

  update() {
    this.vy += gravity;
    this.x += this.vx;
    this.y += this.vy;

    
    if (this.patternIndex < this.pattern.length && this.y >= this.nextPatternY) {
      const dir = this.pattern[this.patternIndex];
      this.vx = dir === 'L' ? -pad(0.6) : pad(0.6);
      this.patternIndex++;
      this.nextPatternY += this.patternStepY;
    } else if (this.patternIndex >= this.pattern.length) {
      this.vx = 0; 
    }

   
    obstacles.forEach(obstacle => {
      const dist = Math.hypot(this.x - obstacle.x, this.y - obstacle.y);
      if (dist < pad(this.radius + obstacle.radius)) {
        const angle = Math.atan2(this.y - obstacle.y, this.x - obstacle.x);
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.vx = Math.cos(angle) * speed * horizontalFriction;
        this.vy = Math.sin(angle) * speed * verticalFriction;

        const overlap = this.radius + obstacle.radius - unpad(dist);
        this.x += pad(Math.cos(angle) * overlap);
        this.y += pad(Math.sin(angle) * overlap);
      }
    });


    sinks.forEach((sink, i) => {
      if (
        unpad(this.x) > sink.x - sink.width / 2 &&
        unpad(this.x) < sink.x + sink.width / 2 &&
        unpad(this.y) + this.radius > sink.y - sink.height / 2 &&
        unpad(this.y) - this.radius < sink.y + sink.height / 2
      ) {
        this.vx = 0;
        this.vy = 0;
        this.landedInSink = i;
      }
    });
  }
}

function drawObstacles() {
  ctx.fillStyle = 'white';
  obstacles.forEach(obstacle => {
    ctx.beginPath();
    ctx.arc(unpad(obstacle.x), unpad(obstacle.y), obstacle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  });
}

function drawSinks() {
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < sinks.length; i++) {
    const sink = sinks[i];
    const x = sink.x - sink.width / 2;
    const y = sink.y - sink.height / 2;
    const width = sink.width - obstacleRadius * 2;
    const height = sink.height;

    ctx.fillStyle = 'green';
    ctx.fillRect(x, y, width, height);

    const multiplier = getMultiplier(i);
    ctx.fillStyle = 'white';
    ctx.fillText(multiplier + "x", sink.x, y + height / 2);
  }
}

function getMultiplier(index) {
  const MULTIPLIERS = {
    0: 16, 1: 9, 2: 2, 3: 1.4, 4: 1.4, 5: 1.2, 6: 1.1,
    7: 1, 8: 1.1, 9: 1.2, 10: 1.4, 11: 1.4, 12: 2, 13: 9, 14: 16
  };
  return MULTIPLIERS[index] ?? 1;
}

async function addBall() {
  try {
    const res = await fetch("http://localhost:3000/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();
    const sinkIndex = data.sinkIndex;
    const targetSink = sinks[sinkIndex];

    const ballX = pad(targetSink.x);
    const ballY = pad(50);
    const pattern = data.pattern || computePattern(ballX, pad(targetSink.x), rows - 2);

    const newBall = new Ball(ballX, ballY, ballRadius, 'red', pattern);
    newBall.expectedSink = sinkIndex;
    balls.push(newBall);
  } catch (error) {
    console.error("Failed to connect to backend:", error);
  }
}

function showGameResult(multiplier) {
  let amount = document.querySelector("#amount").value;
  amount = Number(amount);
  let div = document.getElementById("resultDisplay");
  if (amount != 0) {
    div.innerHTML = `You won: ₹${(multiplier * amount).toFixed(2)} (${multiplier}x)`;
    div.style.display = "block";
  } else {
    div.style.display = "none";
  }
}

function computePattern(startX, targetX, numRows) {
  const pattern = [];
  const deltaX = unpad(targetX - startX);
  const spacing = 36;
  const stepsNeeded = Math.round(Math.abs(deltaX) / spacing);
  const direction = deltaX >= 0 ? 'R' : 'L';

  for (let i = 0; i < numRows; i++) {
    if (i < stepsNeeded) pattern.push(direction);
    else pattern.push(''); 
  }

  return pattern;
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawObstacles();
  drawSinks();
  balls.forEach(ball => {
    ball.draw();
    ball.update();
    if (!ball.scored && typeof ball.landedInSink === 'number') {
      ball.scored = true;
      const multiplier = getMultiplier(ball.landedInSink);
      showGameResult(multiplier);
    }
  });
}

function update() {
  draw();
  requestAnimationFrame(update);
}

document.getElementById('add-ball').addEventListener('click', addBall);
update();

