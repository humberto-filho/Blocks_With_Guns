//enemyAI.js

import { aStarPathFind } from "../helpers/aStarPathFind.js";
import { djikstraPathFind } from "../helpers/djikstraPathFind.js";
import { basicWallAvoidance,  wallAwareVelocity, getPathDirection} from "../helpers/wallsLogic.js";

//scenarioMatrix matriz de 1's e 0's que representam o grid do cenário
//px, py. coordenadas x e y do jogador
//vx, vy. velocidades do jogador em x e y.
//difficulty. dificuldade
//enemy. O objeto inimigo no seu estado atual
export function enemyAI(scenarioMatrix, px, py, vx, vy, difficulty = 'easy', enemy) {
    const dx = px - enemy.x;
    const dy = py - enemy.y;
    const dist = Math.hypot(dx, dy);
    const avoidance = basicWallAvoidance(enemy.x, enemy.y, scenarioMatrix);

    const maintainDistance = 150;
    let movementVector = { x: 0, y: 0 };

    switch(difficulty) {
    case 'easy':
        let dPath = djikstraPathFind(scenarioMatrix, enemy.x, enemy.y, px, py);
        movementVector = getPathDirection(dPath, enemy);
        if (dist < maintainDistance){
            const fleeDirection = {
                x: - dx * 0.4 ,
                y: - dy * 0.4
            };
            movementVector = wallAwareVelocity(fleeDirection, avoidance);
            return {
                speed: 15, // Faster speed when retreating
                fireAngle: Math.atan2(dy, dx),
                movement: movementVector
            };
        } else {
        return {
            speed: 10,
            fireAngle: Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.2,
            movement: wallAwareVelocity(
                movementVector,
                avoidance
            )
        };
        }
        break;
    case 'medium':
        const timeToReach = dist / 400;
        const predictedPos = {
            x: px + vx * timeToReach,
            y: py + vy * timeToReach
        };
        let path = aStarPathFind(scenarioMatrix, enemy.x, enemy.y, predictedPos.x, predictedPos.y);
        return {
            speed: 12,
            fireAngle: Math.atan2(predictedPos.y - enemy.y, predictedPos.x - enemy.x),
            movement: wallAwareVelocity(
                getPathDirection(path, enemy),
                avoidance
            )
        };
        break;
    case 'hard':
        let markovPath = markovDecisionProcess();
        return {
        speed: 12,
        fireAngle: predictiveAim(markovPath),
        path: markovPath,
        move: wallAwareVelocity()
        };
        break;
    case 'insane':
        return;
        break;
    }
}