const express = require("express");
const cors = require("cors");
const { outcomes } = require("./outcomes");

const app = express();
app.use(cors());

const TOTAL_DROPS = 16;

const MULTIPLIERS = {
  0: 16,
  1: 9,
  2: 2,
  3: 1.4,
  4: 1.4,
  5: 1.2,
  6: 1.1,
  7: 1,
  8: 0.5,
  9: 1,
  10: 1.1,
  11: 1.2,
  12: 1.4,
  13: 1.4,
  14: 2,
  15: 9,
  16: 16
};

app.post("/game", (req, res) => {
  let outcome = 0;
  const pattern = [];

  for (let i = 0; i < TOTAL_DROPS; i++) {
    if (Math.random() > 0.5) {
      pattern.push("R");
      outcome++;
    } else {
      pattern.push("L");
    }
  }

  const multiplier = MULTIPLIERS[outcome];
  const possibleOutcomes = outcomes[outcome] || [0]; 

  res.send({
    point: possibleOutcomes[Math.floor(Math.random() * possibleOutcomes.length)],
    multiplier,
    pattern,
    sinkIndex: outcome  
  });
});

app.listen(3000, () => {
  console.log("Running on port 3000");
});
