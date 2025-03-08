import { aStarPathFind } from "../helpers/aStarPathFind.js";
import { basicWallAvoidance } from "../helpers/wallsLogic.js";
import { 
    updateMemory, 
    predictFromMemory, 
    markovDecisionProcess, 
    predictiveAim,
    calculateDodge,
    combineVectors,
    normalizeVector,
    calculateBulletThreatLevel
} from "./markovHard.js";


function weightedAverageAngle(angle1, angle2, weight) {
    const x = Math.cos(angle1) * weight + Math.cos(angle2) * (1 - weight);
    const y = Math.sin(angle1) * weight + Math.sin(angle2) * (1 - weight);
    return Math.atan2(y, x);
}

function getPathDirection(path, enemy) {
    if (path.length < 2) return { x: 0, y: 0 };
    
    const nextStep = path[1];
    const targetX = nextStep.x * 20 + 10;
    const targetY = nextStep.y * 20 + 10;
    
    return {
        x: targetX - enemy.x,
        y: targetY - enemy.y
    };
}

const SMOOTHING_FACTOR = 0.15;
const MAX_BASE_SPEED = 10;

export function enemyAI(scenarioMatrix, px, py, vx, vy, difficulty, enemy, shotInfo) {
    const memoryPrediction = predictFromMemory(enemy.memory);
    if (!enemy.smoothedVelocity) enemy.smoothedVelocity = { x: 0, y: 0 };
    if (!enemy.engagementStart) enemy.engagementStart = Date.now();
    const engagementDuration = Date.now() - enemy.engagementStart;
    const dx = px - enemy.x;
    const dy = py - enemy.y;
    const dist = Math.hypot(dx, dy);
    const avoidance = basicWallAvoidance(enemy.x, enemy.y, scenarioMatrix);

    const maintainDistance = 150;
    let movementVector = { x: 0, y: 0 };

    const bulletSpeed = 200;
    var playerSpeed = 70;
              
    let physicsWeight = engagementDuration < 5000 ? 0.5 : 0.8;
    let memoryWeight = 1 - physicsWeight;
    var timeToReach = dist / bulletSpeed;

    if(shotInfo){
        updateMemory(enemy, px, py, vx, vy, shotInfo);
    }

    const dodgeVector = calculateDodge(enemy, scenarioMatrix);
    var physicsPrediction = {
        x: px + vx * timeToReach,
        y: py + vy * timeToReach
    };

    
    let hybridPrediction = {
        x: physicsPrediction.x * physicsWeight + memoryPrediction.x * memoryWeight,
        y: physicsPrediction.y * physicsWeight + memoryPrediction.y * memoryWeight
    };

    let markovPath = markovDecisionProcess(
        enemy, 
        hybridPrediction.x,
        hybridPrediction.y,
        scenarioMatrix
    );

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
                    speed: 10,
                    fireAngle: Math.atan2(dy, dx),
                    movement: movementVector
                };
            } else {
                let dxRandom = Math.random(2) + (-1);
                let dyRandom = Math.random(2) + (-1);
                return {
                    speed: 10,
                    fireAngle: Math.atan2(dy + dyRandom, dx + dxRandom),
                    movement: wallAwareVelocity(
                        movementVector,
                        avoidance
                    )
                };
            }
            break;
        case 'medium':
            let aPath = aStarPathFind(scenarioMatrix, enemy.x, enemy.y, px, py);
            if (dist < maintainDistance){
                const approachDirection ={
                    x : dx * (dist / 500),
                    y: dy * (dist / 500)
                }
                movementVector = wallAwareVelocity(approachDirection, avoidance);
                return {
                    speed: 12,
                    fireAngle: Math.atan2(physicsPrediction.y - enemy.y, physicsPrediction.x - enemy.x),
                    movement: movementVector
                }; 
            } else {
                return {
                    speed: 12,
                    fireAngle: Math.atan2(physicsPrediction.y - enemy.y, physicsPrediction.x - enemy.x),
                    movement: wallAwareVelocity(
                        getPathDirection(aPath, enemy),
                        avoidance
                    )
                };
            }
            break;
            case 'hard':
        
           const bulletThreat = calculateBulletThreatLevel(enemy);
           const physicsWeight = engagementDuration < 5000 ? 0.5 : 0.8;
           const memoryWeight = 1 - physicsWeight;
           const timeToReach = dist / 200; 
   
       
           const physicsPrediction = {
               x: px + vx * timeToReach,
               y: py + vy * timeToReach
           };
           const memoryPrediction = predictFromMemory(enemy.memory);
           
           const hybridPrediction = {
               x: physicsPrediction.x * physicsWeight + memoryPrediction.x * memoryWeight,
               y: physicsPrediction.y * physicsWeight + memoryPrediction.y * memoryWeight
           };
   
  
           const markovPath = markovDecisionProcess(
               enemy, 
               hybridPrediction.x,
               hybridPrediction.y,
               scenarioMatrix
           );
   
           const dodgeVector = calculateDodge(enemy, scenarioMatrix);
           const pathDirection = getPathDirection(markovPath, enemy);
           
    
           const dodgeWeight = Math.min(1.5, 0.8 + bulletThreat * 0.7);
           const pathWeight = 1.2 - bulletThreat * 0.5;
           const wallWeight = 1.0 - bulletThreat * 0.3;
   
   
           let rawMovement = combineVectors(
               { x: pathDirection.x * pathWeight, y: pathDirection.y * pathWeight },
               { x: dodgeVector.x * dodgeWeight, y: dodgeVector.y * dodgeWeight }
           );
   
           const wallAdjustment = basicWallAvoidance(enemy.x, enemy.y, scenarioMatrix);
           rawMovement.x += wallAdjustment.x * wallWeight;
           rawMovement.y += wallAdjustment.y * wallWeight;
   
           const currentMaxSpeed = MAX_BASE_SPEED * (1 + bulletThreat * 0.5);
           const dynamicSmoothing = SMOOTHING_FACTOR * (1 - bulletThreat * 0.5);
           
           enemy.smoothedVelocity.x = Phaser.Math.Linear(
               enemy.smoothedVelocity.x,
               rawMovement.x,
               dynamicSmoothing
           );
           enemy.smoothedVelocity.y = Phaser.Math.Linear(
               enemy.smoothedVelocity.y,
               rawMovement.y,
               dynamicSmoothing
           );
   
      
           const velocity = normalizeVector(enemy.smoothedVelocity);
           velocity.x *= currentMaxSpeed;
           velocity.y *= currentMaxSpeed;
   
    
           if (dist < 100) {
               const speedMod = dist / 200;
               velocity.x *= speedMod;
               velocity.y *= speedMod;
           }
   
    
           let aimPrediction;
           if (bulletThreat > 0.7) {
               aimPrediction = predictiveAim([], enemy.memory);
           } else {
               const physicsAim = Math.atan2(
                   physicsPrediction.y - enemy.y,
                   physicsPrediction.x - enemy.x
               );
               const memoryAim = predictiveAim(markovPath, enemy.memory);
               aimPrediction = weightedAverageAngle(
                   physicsAim,
                   memoryAim,
                   0.8 - bulletThreat * 0.3
               );
           }
   
           return {
               speed: currentMaxSpeed,
               fireAngle: aimPrediction,
               movement: velocity
         
            };
            break;
    }
}