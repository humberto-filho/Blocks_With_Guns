// MarkovHard.js
export function markovDecisionProcess(enemy, px, py, scenarioMatrix) {
    const memory = enemy.memory;
    const currentState = memory.lastState;
    const stateDuration = Date.now() - memory.stateStartTime;
    
    // Enhanced camping detection with path validation
    const { isCamping, campPosition } = detectCampingPattern(memory.playerPositions);
    const inFavoriteZone = isInFavoriteZone(memory.favoriteZones, px, py);
    
    // Dynamic aggression calculation with suppression factor
    const baseAggression = calculateAggression(memory);
    const suppression = calculateSuppressionLevel(enemy);
    const effectiveAggression = Math.min(baseAggression * (1 - suppression), 1);

    // State transition matrix
    const stateWeights = {
        attack: 0.4 + effectiveAggression * 0.5,
        flanking: 0.3 + suppression * 0.4,
        cover: 0.2 - effectiveAggression * 0.1,
        patrol: 0.1 - suppression * 0.05
    };

    let nextState = currentState;
    
    // Immediate state transitions
    if (isCamping) {
        nextState = weightedRandom(['flanking', 'attack'], [0.7, 0.3]);
    } else if (stateDuration > 4000) {
        nextState = weightedRandom(
            ['attack', 'flanking', 'cover', 'patrol'],
            [
                stateWeights.attack,
                stateWeights.flanking,
                stateWeights.cover,
                stateWeights.patrol
            ]
        );
    }

    // Emergency transitions
    if (suppression > 0.7 && nextState !== 'cover') {
        nextState = 'cover';
    }

    // State change handling
    if (nextState !== currentState) {
        memory.lastState = nextState;
        memory.stateStartTime = Date.now();
        memory.lastCampPosition = campPosition;
        
        // Reset pathfinding cache
        delete memory.currentPath;
    }

    // Execute state behaviors
    switch(nextState) {
        case 'flanking':
            return maintainFlankingBehavior(enemy, px, py, scenarioMatrix, memory);
        case 'attack':
            return executeAttackBehavior(enemy, px, py, scenarioMatrix, effectiveAggression);
        case 'cover':
            return performCoverBehavior(enemy, scenarioMatrix, memory);
        default:
            return executePatrolBehavior(enemy, scenarioMatrix, memory);
    }
}

// State-specific behavior implementations
function maintainFlankingBehavior(enemy, targetX, targetY, scenarioMatrix, memory) {
    if (!memory.currentPath || Math.random() < 0.1) {
        memory.currentPath = generateSmartFlank(
            scenarioMatrix, 
            enemy, 
            targetX, 
            targetY, 
            memory.favoriteZones
        );
    }
    
    // Dynamic path refreshing
    if (pathProgress(enemy, memory.currentPath) > 0.8) {
        memory.currentPath = generateSmartFlank(
            scenarioMatrix, 
            enemy, 
            targetX, 
            targetY, 
            memory.favoriteZones
        );
    }
    
    return memory.currentPath;
}

function executeAttackBehavior(enemy, targetX, targetY, scenarioMatrix, aggression) {
    const attackPath = generateRushedAttack(scenarioMatrix, enemy, targetX, targetY, aggression);
    
    // Add suppression evasion
    if (calculateSuppressionLevel(enemy) > 0.4) {
        return combinePaths(
            attackPath,
            generateCoverPath(scenarioMatrix, enemy.x, enemy.y)
        );
    }
    
    return attackPath;
}

function performCoverBehavior(enemy, scenarioMatrix, memory) {
    if (!memory.currentCover || Math.random() < 0.2) {
        memory.currentCover = generateStrategicCover(
            scenarioMatrix, 
            enemy, 
            memory.favoriteZones
        );
    }
    
    // Add covering fire positions
    if (pathProgress(enemy, memory.currentCover) > 0.9) {
        return combinePaths(
            memory.currentCover,
            generateSuppressivePosition(scenarioMatrix, enemy)
        );
    }
    
    return memory.currentCover;
}

function executePatrolBehavior(enemy, scenarioMatrix, memory) {
    if (!memory.currentPatrolRoute || Math.random() < 0.05) {
        memory.currentPatrolRoute = generateObservantPatrol(
            scenarioMatrix, 
            enemy, 
            memory.favoriteZones
        );
    }
    
    return memory.currentPatrolRoute;
}

// Helper functions
function calculateSuppressionLevel(enemy) {
    return Math.min(1, 
        (enemy.memory.playerShots?.length || 0) / 10 +
        calculateBulletThreatLevel(enemy)
    );
}

function pathProgress(enemy, path) {
    if (!path || path.length < 2) return 0;
    const totalDistance = path.reduce((sum, p, i) => 
        sum + (i > 0 ? Math.hypot(p.x - path[i-1].x, p.y - path[i-1].y) : 0),
        0
    );
    const traveled = Math.hypot(
        enemy.x - path[0].x, 
        enemy.y - path[0].y
    );
    return traveled / totalDistance;
}

function combinePaths(mainPath, secondaryPath) {
    return [...mainPath.slice(0, 3), ...secondaryPath.slice(0, 3)];
}

function generateSuppressivePosition(scenarioMatrix, enemy) {
    const suppressionAngle = Math.atan2(
        enemy.memory.lastPlayerPosition.y - enemy.y,
        enemy.memory.lastPlayerPosition.x - enemy.x
    );
    
    return aStarPathFind(
        scenarioMatrix,
        enemy.x,
        enemy.y,
        enemy.x + Math.cos(suppressionAngle) * 200,
        enemy.y + Math.sin(suppressionAngle) * 200
    );
}

import { aStarPathFind } from "../helpers/aStarPathFind.js";
import { wallAwareVelocity, basicWallAvoidance } from "../helpers/wallsLogic.js";
const MEMORY_DURATION = 30000;

// In markovHard.js
export function predictFromMemory(memory) {
    if (!memory || !memory.playerPositions || memory.playerPositions.length === 0) {
        return { x: 0, y: 0 };
    }

    const positions = memory.playerPositions;
    const gamma = 0.85; 
    const timeWindow = 5000; 
    

    const weights = positions.map((pos, index) => {
        const age = Date.now() - pos.timestamp;
        return Math.pow(gamma, age / timeWindow);
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  
    let weightedX = 0;
    let weightedY = 0;
    let weightedVX = 0;
    let weightedVY = 0;

    positions.forEach((pos, index) => {
        weightedX += pos.x * weights[index];
        weightedY += pos.y * weights[index];
        
        if (index > 0) {
            const dt = pos.timestamp - positions[index-1].timestamp;
            if (dt > 0) {
                const vx = (pos.x - positions[index-1].x) / dt;
                const vy = (pos.y - positions[index-1].y) / dt;
                weightedVX += vx * weights[index];
                weightedVY += vy * weights[index];
            }
        }
    });


    weightedX /= totalWeight;
    weightedY /= totalWeight;
    weightedVX /= totalWeight;
    weightedVY /= totalWeight;

  
    const predictionTime = 1000;
    return {
        x: weightedX + weightedVX * predictionTime,
        y: weightedY + weightedVY * predictionTime
    };
}

export function updateMemory(enemy, px, py, vx, vy, shotInfo) {
    if (!enemy.memory) {
        initializeMemory(enemy);
    }

    const now = Date.now();
    const newEntry = {
        x: px,
        y: py,
        vx: vx,
        vy: vy,
        timestamp: now
    };

    // Apply exponential decay to existing entries
    if (shotInfo) {
        enemy.memory.playerShots = enemy.memory.playerShots || [];
        enemy.memory.playerShots.push(shotInfo);
        
        // Keep only shots from last 5 seconds
        enemy.memory.playerShots = enemy.memory.playerShots.filter(
            s => Date.now() - s.time < 5000
        );
    }
    const gamma = 0.85;
    enemy.memory.playerPositions = enemy.memory.playerPositions
        .map(entry => ({
            ...entry,
            vx: entry.vx * gamma,
            vy: entry.vy * gamma
        }))
        .filter(entry => now - entry.timestamp <= 30000);

    // Add new entry with full weight
    enemy.memory.playerPositions.push(newEntry);

    // Update derived metrics
    enemy.memory.averageSpeed = calculateAverageSpeed(enemy.memory.playerPositions);
    enemy.memory.favoriteZones = detectFavoriteZones(enemy.memory.playerPositions);
}

function calculateAverageSpeed(positions) {
    if (positions.length < 2) return 0;

    // Exponential decay parameters
    const gamma = 0.85;
    const weights = positions.map((_, i) => 
        Math.pow(gamma, positions.length - i - 1)
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let totalDistance = 0;
    for (let i = 1; i < positions.length; i++) {
        const distance = Math.hypot(
            positions[i].x - positions[i-1].x,
            positions[i].y - positions[i-1].y
        );
        totalDistance += distance * weights[i];
    }

    return totalDistance / (totalWeight * 1000); // Convert to units per millisecond
}

export function calculateDodge(enemy, scenarioMatrix, shotInfo) {
    const dodgeVector = { x: 0, y: 0 };
    const bulletSpeed = 200;
    const currentTime = Date.now();
    const personalityFactor = enemy.memory.aggression || 0.5;

    // Strategic assessment system
    const threatAssessment = {
        immediateDanger: 0,
        preferredDodgeDirection: { x: 0, y: 0 },
        safeZones: []
    };

    // Process all tracked shots
    enemy.memory.playerShots?.forEach(shot => {
        const timeAlive = (currentTime - shot.time) / 1000;
        const bulletTravel = bulletSpeed * timeAlive;
        const bulletLifetime = (currentTime - shot.time) / 1000;

        // Bullet path prediction
        const bulletPath = {
            start: { x: shot.x, y: shot.y },
            end: {
                x: shot.x + Math.cos(shot.angle) * bulletSpeed * 2,
                y: shot.y + Math.sin(shot.angle) * bulletSpeed * 2
            }
        };

        // Calculate interception parameters
        const enemyToBulletPath = distanceToLine(
            { x: enemy.x, y: enemy.y },
            bulletPath.start,
            bulletPath.end
        );

        const timeToImpact = enemyToBulletPath.distance / bulletSpeed;
        const impactDanger = Math.max(0, 1 - (timeToImpact / 1.5));

        // Threat classification
        if (impactDanger > 0.3) {
            const avoidanceDirection = normalizeVector({
                x: -(bulletPath.end.y - bulletPath.start.y),
                y: bulletPath.end.x - bulletPath.start.x
            });

            // Dynamic weighting based on threat level and personality
            const threatWeight = impactDanger * (1 + personalityFactor);
            dodgeVector.x += avoidanceDirection.x * threatWeight;
            dodgeVector.y += avoidanceDirection.y * threatWeight;

            threatAssessment.immediateDanger += impactDanger;
            threatAssessment.preferredDodgeDirection.x += avoidanceDirection.x;
            threatAssessment.preferredDodgeDirection.y += avoidanceDirection.y;
        }
    });

    // Intelligent escape pattern generation
    if (threatAssessment.immediateDanger > 0) {
        // Normalize preferred direction
        threatAssessment.preferredDodgeDirection = normalizeVector(
            threatAssessment.preferredDodgeDirection
        );

        // Add momentum-based evasion
        const momentumFactor = normalizeVector({
            x: enemy.velocity.x,
            y: enemy.velocity.y
        });

        dodgeVector.x += momentumFactor.x * 0.7 * personalityFactor;
        dodgeVector.y += momentumFactor.y * 0.7 * personalityFactor;

        // Strategic randomization
        const randomAngle = (Math.random() - 0.5) * Math.PI/4 * (1 - personalityFactor);
        dodgeVector.x = dodgeVector.x * Math.cos(randomAngle) - dodgeVector.y * Math.sin(randomAngle);
        dodgeVector.y = dodgeVector.x * Math.sin(randomAngle) + dodgeVector.y * Math.cos(randomAngle);
    }

    // Environmental awareness system
    const wallPush = basicWallAvoidance(enemy.x, enemy.y, scenarioMatrix);
    const combinedVector = {
        x: dodgeVector.x * (1.5 + threatAssessment.immediateDanger) + wallPush.x * 0.5,
        y: dodgeVector.y * (1.5 + threatAssessment.immediateDanger) + wallPush.y * 0.5
    };

    // Dynamic path validation
    if (threatAssessment.immediateDanger > 0.7) {
        const safetyCheckPath = aStarPathFind(
            scenarioMatrix,
            enemy.x, enemy.y,
            enemy.x + combinedVector.x * 200,
            enemy.y + combinedVector.y * 200,
            3 // Short path lookahead
        );

        if (safetyCheckPath.length < 3) {
            // Find alternative safe direction
            const fallbackDir = findSafeRetreatDirection(enemy, scenarioMatrix);
            combinedVector.x = fallbackDir.x;
            combinedVector.y = fallbackDir.y;
        }
    }

    return normalizeVector(combinedVector);
}

function findSafeRetreatDirection(enemy, scenarioMatrix) {
    const directions = [
        {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1},
        {x: 1, y: 1}, {x: -1, y: 1}, {x: 1, y: -1}, {x: -1, y: -1}
    ];

    return directions.reduce((best, dir) => {
        const checkX = enemy.x + dir.x * 100;
        const checkY = enemy.y + dir.y * 100;
        const path = aStarPathFind(scenarioMatrix, enemy.x, enemy.y, checkX, checkY, 5);
        
        if (path.length > best.score) {
            return { score: path.length, x: dir.x, y: dir.y };
        }
        return best;
    }, { score: -1, x: 0, y: 0 });
}

export function calculateBulletThreatLevel(enemy) {
    let maxThreat = 0;
    const now = Date.now();
    
    enemy.memory.playerShots?.forEach(shot => {
        const timeSinceShot = now - shot.time;
        const bulletAge = timeSinceShot / 1000;
        const bulletPos = {
            x: shot.x + Math.cos(shot.angle) * 200 * bulletAge,
            y: shot.y + Math.sin(shot.angle) * 200 * bulletAge
        };
        
        const distance = Math.hypot(bulletPos.x - enemy.x, bulletPos.y - enemy.y);
        const timeFactor = 1 - Math.min(bulletAge, 1);
        const threat = (1 - distance/150) * timeFactor;
        
        if (threat > maxThreat) maxThreat = threat;
    });
    
    return Math.min(1, maxThreat);
}

// Helper functions
function distanceToLine(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
        xx = lineStart.x;
        yy = lineStart.y;
    } else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    } else {
        xx = lineStart.x + param * C;
        yy = lineStart.y + param * D;
    }

    return Math.hypot(point.x - xx, point.y - yy);
}

export function normalizeVector(vec) {
    const length = Math.hypot(vec.x, vec.y);
    return length > 0 ? { 
        x: vec.x / length, 
        y: vec.y / length 
    } : { x: 0, y: 0 };
}

export function combineVectors(...vectors) {
    return vectors.reduce((acc, vec) => {
        return { x: acc.x + vec.x, y: acc.y + vec.y };
    }, { x: 0, y: 0 });
}

export function initializeMemory(enemy) {
    if (!enemy.memory) {
        enemy.memory = {
            playerPositions: [],
            lastState: 'patrol',
            stateStartTime: Date.now()
        };
    }
}


function weightedRandom(choices, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    const random = Math.random() * total;
    let current = 0;
    for (let i = 0; i < choices.length; i++) {
        current += weights[i];
        if (random < current) return choices[i];
    }
}


function calculateAggression(memory) {
    const positions = memory.playerPositions;
    if (positions.length < 10) return 0.5;
    
    const positionChanges = positions.slice(-10).map((p, i, arr) => 
        i > 0 ? Math.hypot(p.x - arr[i-1].x, p.y - arr[i-1].y) : 0
    );
    
    return positionChanges.reduce((a, b) => a + b, 0) / 1000;
}

// path-generation.js
export function generateFlankingPath(scenarioMatrix, startX, startY, targetX, targetY) { // Added matrix
    const flankAngle = Math.atan2(targetY - startY, targetX - startX) + (Math.PI/2);
    const flankDistance = 200;
    return aStarPathFind(
        scenarioMatrix,
        startX,
        startY,
        targetX + Math.cos(flankAngle) * flankDistance,
        targetY + Math.sin(flankAngle) * flankDistance
    );
}

export function generateAttackPath(enemy, targetX, targetY, scenarioMatrix) {
    const attackVector = {
        x: targetX - enemy.x,
        y: targetY - enemy.y
    };
    const attackDistance = Math.hypot(attackVector.x, attackVector.y);
    
    return aStarPathFind(
        scenarioMatrix,
        enemy.x,
        enemy.y,
        targetX + (attackVector.x/attackDistance) * 50,
        targetY + (attackVector.y/attackDistance) * 50
    );
}

export function generateCoverPath(scenarioMatrix, x, y) {
    const nearbyCover = findNearbyCover(scenarioMatrix, x, y);
    return nearbyCover ? 
        aStarPathFind(scenarioMatrix, x, y, nearbyCover.x, nearbyCover.y) :
        generatePatrolPath(scenarioMatrix, x, y);
}

export function generatePatrolPath(scenarioMatrix, x, y) {
    const patrolPoints = [
        {x: x + 300, y: y},
        {x: x - 300, y: y},
        {x: x, y: y + 300},
        {x: x, y: y - 300}
    ].filter(p => isPositionValid(scenarioMatrix, p.x, p.y));
    
    return aStarPathFind(
        scenarioMatrix,
        x,
        y,
        patrolPoints[Math.floor(Math.random() * patrolPoints.length)]
    );
}
function findNearbyCover(scenarioMatrix, x, y) {
    const gridX = Math.floor(x / 20);
    const gridY = Math.floor(y / 20);
    const searchRadius = 5;

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            const checkX = gridX + dx;
            const checkY = gridY + dy;
            
            if (scenarioMatrix[checkX]?.[checkY] === 1) {
                return {
                    x: checkX * 20 + 10,
                    y: checkY * 20 + 10
                };
            }
        }
    }
    return null;
}

function isPositionValid(scenarioMatrix, x, y) {
    const gridX = Math.floor(x / 20);
    const gridY = Math.floor(y / 20);
    return scenarioMatrix[gridX]?.[gridY] === 0;
}

function detectFavoriteZones(positions) {
    const zoneSize = 200;
    const zoneMap = new Map();
    
    positions.forEach(pos => {
        const zoneKey = `${Math.floor(pos.x/zoneSize)},${Math.floor(pos.y/zoneSize)}`;
        zoneMap.set(zoneKey, (zoneMap.get(zoneKey) || 0) + 1);
    });

    return Array.from(zoneMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([zone]) => zone.split(',').map(Number));
}

export function generateObservantPatrol(scenarioMatrix, enemy, favoriteZones) {
    // Combine standard patrol points with strategic positions
    const basePoints = [
        {x: enemy.x + 400, y: enemy.y},
        {x: enemy.x - 400, y: enemy.y},
        {x: enemy.x, y: enemy.y + 400},
        {x: enemy.x, y: enemy.y - 400}
    ];

    // Generate intelligent points based on player patterns
    const strategicPoints = favoriteZones
        .map(([zoneX, zoneY]) => ({
            x: zoneX * 200 + 100 + (Math.random() * 80 - 40), // Jitter within zone
            y: zoneY * 200 + 100 + (Math.random() * 80 - 40)
        }))
        .filter(p => isPositionValid(scenarioMatrix, p.x, p.y));

    // Combine all potential points
    const allPoints = [...basePoints, ...strategicPoints];
    
    // Filter valid positions with pathfinding check
    const validPoints = allPoints.filter(p => {
        if (!isPositionValid(scenarioMatrix, p.x, p.y)) return false;
        const path = aStarPathFind(scenarioMatrix, enemy.x, enemy.y, p.x, p.y);
        return path.length > 0;
    });

    // Fallback if no valid points
    if (validPoints.length === 0) {
        return [{ x: enemy.x, y: enemy.y }];
    }

    // Weighted selection preferring strategic points
    const selectionWeights = validPoints.map(p => 
        strategicPoints.some(sp => sp.x === p.x && sp.y === p.y) ? 0.7 : 0.3
    );
    
    // Select target using intelligent weighting
    const totalWeight = selectionWeights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let selectedIndex = 0;
    
    for (let i = 0; i < validPoints.length; i++) {
        random -= selectionWeights[i];
        if (random < 0) {
            selectedIndex = i;
            break;
        }
    }

    const target = validPoints[selectedIndex];
    let path = aStarPathFind(scenarioMatrix, enemy.x, enemy.y, target.x, target.y);
    
    // Ensure path remains valid
    if (path.length === 0 || !isPositionValid(scenarioMatrix, target.x, target.y)) {
        path = [{ x: enemy.x, y: enemy.y }];
    }

    return path;
}

const AGGRESSION_BUFFER = 1500;

export function markovDecisionProcess(enemy, px, py, scenarioMatrix) {
    const memory = enemy.memory;
    const currentState = memory.lastState;
    const stateDuration = Date.now() - memory.stateStartTime;
    

    const { isCamping, campPosition } = detectCampingPattern(memory.playerPositions);
    const inFavoriteZone = isInFavoriteZone(memory.favoriteZones, px, py);
    
   
    const baseAggression = calculateAggression(memory);
    const aggressionBoost = inFavoriteZone ? 0.3 : 0;
    const totalAggression = Math.min(baseAggression + aggressionBoost, 1);

    let nextState = currentState;
    

    if (isCamping) {
        nextState = weightedRandom(['flanking', 'attack'], [0.7, 0.3]);
    } else if (stateDuration > 3000 && currentState === 'attack' && !isProgressing(enemy, campPosition)) {
        nextState = 'flanking'; // Break out of attack if stuck
    } else if (!isCamping && stateDuration > 4000) {
        nextState = weightedRandom(
            ['attack', 'flanking', 'cover', 'patrol'],
            [0.5 + totalAggression, 0.3, 0.15 - (totalAggression/2), 0.05]
        );
    }

  
    if (isCamping && nextState === currentState) {
        nextState = 'flanking';
    }


    if (nextState !== currentState) {
        memory.lastState = nextState;
        memory.stateStartTime = Date.now();
        memory.lastCampPosition = campPosition;
    }

    switch(nextState) {
        case 'flanking':
            return generateSmartFlank(scenarioMatrix, enemy, px, py, memory.favoriteZones);
        case 'attack':
            return generateRushedAttack(scenarioMatrix, enemy, px, py, totalAggression);
        case 'cover':
            return generateStrategicCover(scenarioMatrix, enemy, memory.favoriteZones);
        default:
            return generateObservantPatrol(scenarioMatrix, enemy, memory.favoriteZones);
    }
}

function detectCampingPattern(positions) {
    if (positions.length < 15) return { isCamping: false, campPosition: null };
    
    const recent = positions.slice(-15);
    const avgX = recent.reduce((sum, p) => sum + p.x, 0) / recent.length;
    const avgY = recent.reduce((sum, p) => sum + p.y, 0) / recent.length;
    const variance = recent.reduce((sum, p) => sum + Math.hypot(p.x - avgX, p.y - avgY), 0) / recent.length;
    
    const timeInArea = positions[positions.length-1].timestamp - recent[0].timestamp;
    return {
        isCamping: variance < 100 && timeInArea > 7000,
        campPosition: { x: avgX, y: avgY }
    };
}

function generateSmartFlank(scenarioMatrix, enemy, targetX, targetY, favoriteZones) {
    const viableZones = favoriteZones.filter(zone => 
        isPositionValid(scenarioMatrix, zone[0]*200 + 100, zone[1]*200 + 100)
    );
    
    if (viableZones.length > 0) {
        const zone = viableZones[Math.floor(Math.random() * viableZones.length)];
        const flankTarget = {
            x: zone[0]*200 + 100,
            y: zone[1]*200 + 100
        };
        return aStarPathFind(scenarioMatrix, enemy.x, enemy.y, flankTarget.x, flankTarget.y);
    }
    
    return generateFlankingPath(scenarioMatrix, enemy.x, enemy.y, targetX, targetY);
}

function generateRushedAttack(scenarioMatrix, enemy, targetX, targetY, aggression) {
    const attackVector = {
        x: targetX - enemy.x,
        y: targetY - enemy.y
    };
    const attackDistance = Math.hypot(attackVector.x, attackVector.y);
    const rushDistance = 50 * (1 + aggression); 
    
    return aStarPathFind(
        scenarioMatrix,
        enemy.x,
        enemy.y,
        targetX + (attackVector.x/attackDistance) * rushDistance,
        targetY + (attackVector.y/attackDistance) * rushDistance
    );
}

// Enhanced predictive aiming
export function predictiveAim(path, memory) {
    if (!path || path.length === 0) path = [memory.lastCampPosition || { x: 0, y: 0 }];
    
    const currentPos = memory.playerPositions[memory.playerPositions.length - 1] || { x: 0, y: 0 };
    const predictedPos = predictFromMemory(memory);
    
    // Incorporate favorite zone prediction
    if (isInFavoriteZone(memory.favoriteZones, currentPos.x, currentPos.y)) {
        predictedPos.x += (predictedPos.x - memory.favoriteZones[0][0]*200) * 0.3;
        predictedPos.y += (predictedPos.y - memory.favoriteZones[0][1]*200) * 0.3;
    }

    const vx = currentPos?.vx || 0;
    const vy = currentPos?.vy || 0;
    const pathStart = path[0] || { x: 0, y: 0 };
    
    // Aggressive leading
    const leadFactor = 1.5 + (calculateAggression(memory) * 0.7);
    
    return Math.atan2(
        predictedPos.y - pathStart.y + (vy * leadFactor),
        predictedPos.x - pathStart.x + (vx * leadFactor)
    );
}

function isInFavoriteZone(favoriteZones, x, y) {
    return favoriteZones.some(([zoneX, zoneY]) => 
        Math.abs(x - (zoneX*200 + 100)) < 150 &&
        Math.abs(y - (zoneY*200 + 100)) < 150
    );
}

function isProgressing(enemy, target) {
    if (!target) return true;
    const lastDist = enemy.memory.lastDistance || Infinity;
    const currentDist = Math.hypot(target.x - enemy.x, target.y - enemy.y);
    enemy.memory.lastDistance = currentDist;
    return currentDist < lastDist * 0.95; 
}

export function generateStrategicCover(scenarioMatrix, enemy, favoriteZones) {
    const zoneCovers = favoriteZones.flatMap(([zoneX, zoneY]) => {
        const zoneCenter = {
            x: zoneX * 200 + 100,
            y: zoneY * 200 + 100
        };
        return findNearbyCover(scenarioMatrix, zoneCenter.x, zoneCenter.y);
    }).filter(Boolean);

    const nearbyCovers = findNearbyCover(scenarioMatrix, enemy.x, enemy.y) || [];
    
    const allCovers = [...new Set([...zoneCovers, ...nearbyCovers])];
    
    if (allCovers.length > 0) {
        const selectedCover = allCovers.reduce((nearest, cover) => {
            const dist = Math.hypot(cover.x - enemy.x, cover.y - enemy.y);
            return dist < nearest.dist ? { cover, dist } : nearest;
        }, { dist: Infinity }).cover;
        
        return aStarPathFind(scenarioMatrix, enemy.x, enemy.y, selectedCover.x, selectedCover.y);
    }
    
    return generateObservantPatrol(scenarioMatrix, enemy, favoriteZones);
}
