import { aStarPathFind } from "../helpers/aStarPathFind.js";
import {djikstraPathFind} from '../helpers/djikstraPathFind.js';
import { basicWallAvoidance, wallAwareVelocity } from "../helpers/wallsLogic.js";

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
    // Handle empty or invalid path first
    if (!path || path.length === 0) {
        return { x: 0, y: 0 };
    }
    if (!enemy?.x || !enemy?.y) return { x: 0, y: 0 };
    // Always normalize the first valid point we find
    const firstValidPoint = path.find(p => p !== undefined);
    if (!firstValidPoint) {
        return { x: 0, y: 0 };
    }

    // Use immediate goal for direction if short path
    if (path.length === 1) {
        return normalizeVector({
            x: firstValidPoint.x * 20 + 10 - enemy.x,
            y: firstValidPoint.y * 20 + 10 - enemy.y
        });
    }

    // Look 3 steps ahead for better direction
    const lookAheadIndex = Math.min(3, path.length - 1);
    const target = path[lookAheadIndex] || firstValidPoint;
    
    return normalizeVector({
        x: target.x * 20 + 10 - enemy.x,
        y: target.y * 20 + 10 - enemy.y
    });
}


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
    

    if(shotInfo){
        updateMemory(enemy, px, py, vx, vy, shotInfo);
    }
    



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
            let mReach = dist / 200; 
            let aPath = djikstraPathFind(scenarioMatrix, enemy.x, enemy.y, px, py);
            let bPos = {
                x: px + vx * mReach,
                y: py + vy * mReach
            };
    
        
            if (dist < 300){
                const approachDirection ={
                    x : dx * (dist / 300),
                    y: dy * (dist / 300)
                }
                movementVector = wallAwareVelocity(approachDirection, avoidance);
                return {
                    speed: 12,
                    fireAngle: Math.atan2(bPos.y - enemy.y, bPos.x - enemy.x),
                    movement: movementVector
                }; 
            } else {
                return {
                    speed: 80,
                    fireAngle: Math.atan2(bPos.y - enemy.y, bPos.x - enemy.x),
                    movement: wallAwareVelocity(
                        getPathDirection(aPath, enemy),
                        avoidance
                    )
                };
            }
            break;
            case 'hard':
                const bulletSpeed = 200;
                const playerSpeed = 70;
                const enemySpeed = 80;
                const DODGE_DISTANCE = 80;
                const OPTIMAL_DISTANCE = 150;
            
                // Calculate bullet threat and dodge vector
                const bulletThreat = calculateBulletThreatLevel(enemy);
                const dodgeVector = calculateDodge(enemy, scenarioMatrix);
                const now = Date.now();
            
                // Check for immediate bullet threats
                let immediateDanger = false;
                enemy.memory.playerShots?.forEach(shot => {
                    const timeAlive = (now - shot.time) / 1000;
                    const bulletPos = {
                        x: shot.x + Math.cos(shot.angle) * bulletSpeed * timeAlive,
                        y: shot.y + Math.sin(shot.angle) * bulletSpeed * timeAlive
                    };
                    if (Math.hypot(bulletPos.x - enemy.x, bulletPos.y - enemy.y) < DODGE_DISTANCE) {
                        immediateDanger = true;
                    }
                });
            
                // Improved prediction logic with enemy movement consideration
                let predictedX = px;
                let predictedY = py;
                if (!immediateDanger) {
                    let timeToReach = Math.hypot(px - enemy.x, py - enemy.y) / (bulletSpeed + enemySpeed);
                    for (let i = 0; i < 3; i++) {
                        const enemyMoveX = (enemy.speed || 0) * Math.cos(enemy.rotation || 0);
                        const enemyMoveY = (enemy.speed || 0) * Math.sin(enemy.rotation || 0);
                        
                        if (isNaN(enemyMoveX) || isNaN(enemyMoveY)) break;
                        
                        predictedX = px + vx * timeToReach - enemyMoveX * timeToReach;
                        predictedY = py + vy * timeToReach - enemyMoveY * timeToReach;
                        timeToReach = Math.hypot(predictedX - enemy.x, predictedY - enemy.y) / bulletSpeed;
                    }
                }
                            
                // Movement calculation
                let movement = { x: 0, y: 0 };
                const wallAdjust = basicWallAvoidance(enemy.x, enemy.y, scenarioMatrix);
                    // Improved pathfinding with approach forcing
                    const path = aStarPathFind(scenarioMatrix, enemy.x, enemy.y, predictedX, predictedY, {
                    diagonalCost: 1.4,
                    heuristicWeight: 1.2,
                    avoidRecent: enemy.recentNodes || []
                });
                if (immediateDanger) {
                    // Dodge behavior with forward momentum preservation
                    movement = {
                        x: dodgeVector.x * 1.5 + wallAdjust.x * 0.3,
                        y: dodgeVector.y * 1.5 + wallAdjust.y * 0.3
                    };
                } else {
             
            
                   // Store recent path nodes for 2 seconds
                    enemy.recentNodes = path.slice(0, 3).map(p => `${Math.floor(p.x/20)},${Math.floor(p.y/20)}`);
                    
                    const pathDir = getPathDirection(path, enemy);
                    const currentDist = Math.hypot(dx, dy);
                    
                    // Dynamic approach weighting
                    const approachForce = Math.min(1, currentDist / OPTIMAL_DISTANCE);
                    const pathWeight = 0.8 + (approachForce * 0.4);
                    const directWeight = 0.4 - (approachForce * 0.2);
            
                    movement = {
                        x: (pathDir.x * pathWeight) + (dx/currentDist) * directWeight,
                        y: (pathDir.y * pathWeight) + (dy/currentDist) * directWeight
                    };
            
                    // Add wall avoidance
                    movement.x += wallAdjust.x * 0.4;
                    movement.y += wallAdjust.y * 0.4;
                    }
                    // Add validation for weapon position
                    const WEAPON_OFFSET = 15; // Reduced for better visibility
                    const calculateWeaponPosition = (fireAngle) => {
                        const WEAPON_OFFSET = 25;
                        const enemyX = typeof enemy.x === 'number' ? enemy.x : 0;
                        const enemyY = typeof enemy.y === 'number' ? enemy.y : 0;
                        const validAngle = typeof fireAngle === 'number' ? fireAngle : 0;
                        
                        return {
                            x: enemyX + Math.cos(validAngle) * WEAPON_OFFSET,
                            y: enemyY + Math.sin(validAngle) * WEAPON_OFFSET,
                            rotation: validAngle
                        };
                    };

                    // Add null check before using path
                    if (!path || path.length === 0) {
                        // Fallback movement
                        movement = {
                            x: (dx/dist) * 0.8 + wallAdjust.x * 0.4,
                            y: (dy/dist) * 0.8 + wallAdjust.y * 0.4
                        };
                    }

                    // Speed adjustments with distance-based modulation
                    const normalizedMove = normalizeVector(movement);
                    let dynamicSpeed = enemySpeed * (immediateDanger ? 1.3 : Math.min(1.2, Math.max(0.8, dist/OPTIMAL_DISTANCE)));
                    const hardFireAngle = immediateDanger ? enemy.rotation : Math.atan2(predictedY - enemy.y, predictedX - enemy.x);
                    return {
                        speed: dynamicSpeed,
                        fireAngle: hardFireAngle,
                        movement: normalizedMove,
                        shouldFire: !immediateDanger && dist < 500,
                        weapon: calculateWeaponPosition(hardFireAngle)
                    };
                    break;
                }  
}