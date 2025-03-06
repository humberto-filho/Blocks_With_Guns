//enemyAI.js

import { aStar } from "../helpers/aStarPathFind.js";
import { dijkstraPathFind } from "../helpers/djikstraPathFind.js";
import { basicWallAvoidance,  wallAwareVelocity, getPathDirection} from "../helpers/wallsLogic.js";

//scenarioMatrix matriz de 1's e 0's que representam o grid do cenário
//px, py. coordenadas x e y do jogador
//vx, vy. velocidades do jogador em x e y.
//difficulty. dificuldade
//enemy. O objeto inimigo no seu estado atual
export function enemyAI(scenarioMatrix, px, py, vx, vy, difficulty, enemy) {
  const dx = px - this.x;
  const dy = py - this.y;
  const dist = Math.hypot(dx, dy);
  const avoidance = basicWallAvoidance(enemy.x, enemy.y, scenarioMatrix);
  

  switch(difficulty) {
    case 'easy':
        const path = dijkstraPathfind(scenarioMatrix, enemy.x, enemy.y, px, py);
        return {
            speed: 40,
            fireAngle: Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.2,
            movement: wallAwareVelocity(
                getPathDirection(path, enemy),
                avoidance
            )
        };
      
    case 'medium':
        const timeToReach = dist / 400;
        const predictedPos = {
            x: px + vx * timeToReach,
            y: py + vy * timeToReach
        };
        const path = aStarPathFind(scenarioMatrix, enemy.x, enemy.y, predictedPos.x, predictedPos.y);
        return {
            speed: 45,
            fireAngle: Math.atan2(predictedPos.y - enemy.y, predictedPos.x - enemy.x),
            movement: wallAwareVelocity(
                getPathDirection(path, enemy),
                avoidance
            )
        };
        
    case 'hard':
        const markovPath = markovDecisionProcess();
        return {
        speed: 50,
        fireAngle: predictiveAim(markovPath),
        path: markovPath,
        move: wallAwareVelocity()
        };
        
    case 'insane':
        return;
  }
}