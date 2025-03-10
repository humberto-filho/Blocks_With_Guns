import { aStarPathFind } from "../helpers/aStarPathFind.js";
import { basicWallAvoidance } from "../helpers/wallsLogic.js";

const MEMORY_DURATION = 30000;
const AGGRESSION_BUFFER = 1500;

const STUCK_RADIUS = 50; // 50 pixel radius
const STUCK_DURATION = 3000; // 3 seconds

// Modified isEnemyStuck function
function isEnemyStuck(enemy) {
    const now = Date.now();
    
    // Initialize movement history
    if (!enemy.movementHistory) enemy.movementHistory = [];
    
    // Add current position with timestamp
    enemy.movementHistory.push({ 
        x: enemy.x, 
        y: enemy.y, 
        time: now 
    });
    
    // Keep only last 3 seconds of data
    enemy.movementHistory = enemy.movementHistory.filter(
        entry => now - entry.time <= STUCK_DURATION
    );
    
    // Need at least 2 seconds of data to check
    if (enemy.movementHistory.length < 2) return false;
    
    // Check if all positions within 50px of oldest position
    const referencePos = enemy.movementHistory[0];
    return enemy.movementHistory.every(pos => 
        Math.hypot(pos.x - referencePos.x, pos.y - referencePos.y) <= STUCK_RADIUS
    ) && (now - referencePos.time >= STUCK_DURATION);
}

// Updated handleStuckSituation with cooldown
function handleStuckSituation(enemy, scenarioMatrix) {
    // Reset movement history after handling
    enemy.movementHistory = [];
    enemy.lastStuckTime = Date.now();
    
    const currentTarget = enemy.currentPath?.[enemy.currentPath.length-1];
    if (!currentTarget) return [];
    
    // Try alternative path with node avoidance
    const alternativePath = aStarPathFind(
        scenarioMatrix,
        enemy.x, enemy.y,
        currentTarget.x, currentTarget.y,
        {
            avoidRecent: enemy.recentNodes || [],
            heuristicWeight: 1.8,
            backtrackLimit: 2
        }
    );
    
    // Fallback to original path if alternative fails
    return alternativePath.length > 0 ? alternativePath : 
        aStarPathFind(
            scenarioMatrix,
            enemy.x, enemy.y,
            currentTarget.x, currentTarget.y,
            { useStandard: true }
        );
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

function calculateAverageSpeed(positions) {
    if (positions.length < 2) return 0;

  
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

    return totalDistance / (totalWeight * 1000); 
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

export function generateObservantPatrol(scenarioMatrix, enemy, favoriteZones) {
 
    const basePoints = [
        {x: enemy.x + 300, y: enemy.y},
        {x: enemy.x - 300, y: enemy.y},
        {x: enemy.x, y: enemy.y + 300},
        {x: enemy.x, y: enemy.y - 300}
    ];

 
    const strategicPoints = favoriteZones
        .map(([zoneX, zoneY]) => ({
            x: zoneX * 200 + 100 + (Math.random() * 80 - 40),
            y: zoneY * 200 + 100 + (Math.random() * 80 - 40)
        }))
        .filter(p => isPositionValid(scenarioMatrix, p.x, p.y));

  
    const allPoints = [...basePoints, ...strategicPoints];
    
    
    const validPoints = allPoints.filter(p => {
        if (!isPositionValid(scenarioMatrix, p.x, p.y)) return false;
        const path = aStarPathFind(scenarioMatrix, enemy.x, enemy.y, p.x, p.y);
        return path.length > 0;
    });


    if (validPoints.length === 0) {
        return [{ x: enemy.x, y: enemy.y }];
    }

 
    const selectionWeights = validPoints.map(p => 
        strategicPoints.some(sp => sp.x === p.x && sp.y === p.y) ? 0.7 : 0.3
    );

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
    

    if (path.length === 0 || !isPositionValid(scenarioMatrix, target.x, target.y)) {
        path = [{ x: enemy.x, y: enemy.y }];
    }

    return path;
}

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

    
    if (shotInfo) {
        enemy.memory.playerShots = enemy.memory.playerShots || [];
        enemy.memory.playerShots.push(shotInfo);
        
      
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

  
    enemy.memory.playerPositions.push(newEntry);

  
    enemy.memory.averageSpeed = calculateAverageSpeed(enemy.memory.playerPositions);
    enemy.memory.favoriteZones = detectFavoriteZones(enemy.memory.playerPositions);
}

export function calculateDodge(enemy, scenarioMatrix, shotInfo) {
    const dodgeVector = { x: 0, y: 0 };
    const bulletSpeed = 200;
    const currentTime = Date.now();
    const personalityFactor = enemy.memory.aggression || 0.5;

 
    const threatAssessment = {
        immediateDanger: 0,
        preferredDodgeDirection: { x: 0, y: 0 },
        safeZones: []
    };

 
    enemy.memory.playerShots?.forEach(shot => {
        const timeAlive = (currentTime - shot.time) / 1000;
        const bulletTravel = bulletSpeed * timeAlive;
        const bulletLifetime = (currentTime - shot.time) / 1000;

      
        const bulletPath = {
            start: { x: shot.x, y: shot.y },
            end: {
                x: shot.x + Math.cos(shot.angle) * bulletSpeed * 2,
                y: shot.y + Math.sin(shot.angle) * bulletSpeed * 2
            }
        };

      
        const enemyToBulletPath = distanceToLine(
            { x: enemy.x, y: enemy.y },
            bulletPath.start,
            bulletPath.end
        );

        const timeToImpact = enemyToBulletPath.distance / bulletSpeed;
        const impactDanger = Math.max(0, 1 - (timeToImpact / 1.5));

   
        if (impactDanger > 0.3) {
            const avoidanceDirection = normalizeVector({
                x: -(bulletPath.end.y - bulletPath.start.y),
                y: bulletPath.end.x - bulletPath.start.x
            });

            
            const threatWeight = impactDanger * (1 + personalityFactor);
            dodgeVector.x += avoidanceDirection.x * threatWeight;
            dodgeVector.y += avoidanceDirection.y * threatWeight;

            threatAssessment.immediateDanger += impactDanger;
            threatAssessment.preferredDodgeDirection.x += avoidanceDirection.x;
            threatAssessment.preferredDodgeDirection.y += avoidanceDirection.y;
        }
    });

   
    if (threatAssessment.immediateDanger > 0) {
       
        threatAssessment.preferredDodgeDirection = normalizeVector(
            threatAssessment.preferredDodgeDirection
        );

      
        const momentumFactor = normalizeVector({
            x: enemy.velocity.x,
            y: enemy.velocity.y
        });

        dodgeVector.x += momentumFactor.x * 0.7 * personalityFactor;
        dodgeVector.y += momentumFactor.y * 0.7 * personalityFactor;

     
        const randomAngle = (Math.random() - 0.5) * Math.PI/4 * (1 - personalityFactor);
        dodgeVector.x = dodgeVector.x * Math.cos(randomAngle) - dodgeVector.y * Math.sin(randomAngle);
        dodgeVector.y = dodgeVector.x * Math.sin(randomAngle) + dodgeVector.y * Math.cos(randomAngle);
    }

  
    const wallPush = basicWallAvoidance(enemy.x, enemy.y, scenarioMatrix);
    const combinedVector = {
        x: dodgeVector.x * (1.5 + threatAssessment.immediateDanger) + wallPush.x * 0.5,
        y: dodgeVector.y * (1.5 + threatAssessment.immediateDanger) + wallPush.y * 0.5
    };

   
    if (threatAssessment.immediateDanger > 0.7) {
        const safetyCheckPath = aStarPathFind(
            scenarioMatrix,
            enemy.x, enemy.y,
            enemy.x + combinedVector.x * 200,
            enemy.y + combinedVector.y * 200,
            3 
        );

        if (safetyCheckPath.length < 3) {
           
            const fallbackDir = findSafeRetreatDirection(enemy, scenarioMatrix);
            combinedVector.x = fallbackDir.x;
            combinedVector.y = fallbackDir.y;
        }
    }

    return normalizeVector(combinedVector);
}

export function markovDecisionProcess(enemy, px, py, scenarioMatrix) {
    const memory = enemy.memory;
    const currentState = memory.lastState;
    const stateDuration = Date.now() - memory.stateStartTime;
    
    // Analyze player patterns from 30s memory
    const campingData = detectCampingPattern(memory.playerPositions);
    const distanceProfile = calculateDistanceProfile(memory);
    const zoneControl = calculateZoneControl(memory, enemy);
    if (isEnemyStuck(enemy) && Date.now() - (enemy.lastStuckTime || 0) > 5000) {
        return handleStuckSituation(enemy, scenarioMatrix);
    }
    
    // Dynamic aggression calculation
    const baseAggression = Math.min(1, 
        0.3 + (1 - distanceProfile.averageDistance / 400) * 0.7 +
        (campingData.isCamping ? 0.2 : -0.1)
    );
    
    // Adaptive strategy weights
    const strategyWeights = {
        attack: Math.min(0.6, baseAggression * 0.8),
        flanking: 0.4 + (zoneControl * 0.5),
        suppression: Math.min(0.7, memory.suppressionLevel * 1.2),
        patrol: 0.2 - (baseAggression * 0.3)
    };

    // State transition logic
    let nextState = currentState;
    if (campingData.isCamping) {
        nextState = weightedRandom(
            ['flanking', 'attack', 'suppression'], 
            [0.5, 0.3, 0.2]
        );
    } else if (stateDuration > 4000) {
        nextState = weightedRandom(
            ['attack', 'flanking', 'suppression', 'patrol'],
            [
                strategyWeights.attack,
                strategyWeights.flanking,
                strategyWeights.suppression,
                strategyWeights.patrol
            ]
        );
    }

    // Anti-camping measures
    if (campingData.isCamping && currentState !== 'flanking') {
        nextState = 'flanking';
        memory.forcedFlank = true;
    }

    // Update memory and state
    if (nextState !== currentState) {
        memory.lastState = nextState;
        memory.stateStartTime = Date.now();
        memory.lastCampPosition = campingData.campPosition;
        delete memory.currentPath;
    }

    // Execute state behaviors
    switch(nextState) {
        case 'flanking':
            return executeSmartFlank(enemy, px, py, scenarioMatrix, memory);
        case 'attack':
            return executePressureAttack(enemy, px, py, scenarioMatrix, memory);
        case 'suppression':
            return executeSuppressionFire(enemy, px, py, scenarioMatrix);
        default:
            return executeObservantPatrol(enemy, scenarioMatrix, memory);
    }
}

const STUCK_THRESHOLD = 3000; // Changed from 2000 to 3000 ms

// Update findAlternativePath to use different parameters
function findAlternativePath(enemy, scenarioMatrix) {
    const currentTarget = enemy.currentPath?.[enemy.currentPath.length-1];
    if (!currentTarget) return [];
    
    return aStarPathFind(scenarioMatrix, enemy.x, enemy.y, currentTarget.x, currentTarget.y, {
        diagonalCost: 3, // Discourage diagonal movement
        heuristicWeight: 1.5, // Balance search priority
        avoidRecent: enemy.recentNodes || [],
        backtrackLimit: 3 // Allow limited backtracking
    });
}

// New helper functions
function calculateDistanceProfile(memory) {
    const positions = memory.playerPositions;
    const distances = positions.map(p => 
        Math.hypot(p.x - memory.enemyBase.x, p.y - memory.enemyBase.y)
    );
    
    return {
        averageDistance: distances.reduce((a,b) => a + b, 0) / distances.length,
        minDistance: Math.min(...distances),
        maxDistance: Math.max(...distances)
    };
}

function executePressureAttack(enemy, px, py, scenarioMatrix, memory) {
    const attackPath = generateRushedAttack(scenarioMatrix, enemy, px, py, memory.aggression);
    
    // Add random fake-outs to prevent predictability
    if (Math.random() < 0.3) {
        const fakePath = generateFeintPath(scenarioMatrix, enemy, px, py);
        return combinePaths(attackPath, fakePath);
    }
    
    return attackPath;
}

function generateFeintPath(scenarioMatrix, enemy, targetX, targetY) {
    const feintAngle = Math.atan2(targetY - enemy.y, targetX - enemy.x) + (Math.PI/4);
    const feintDistance = 80 + Math.random() * 120;
    
    return aStarPathFind(
        scenarioMatrix,
        enemy.x,
        enemy.y,
        enemy.x + Math.cos(feintAngle) * feintDistance,
        enemy.y + Math.sin(feintAngle) * feintDistance
    );
}

function calculateZoneControl(memory, enemy) {
    const zoneSize = 300;
    const enemyZone = `${Math.floor(enemy.x/zoneSize)},${Math.floor(enemy.y/zoneSize)}`;
    
    return memory.playerPositions.filter(p => {
        const playerZone = `${Math.floor(p.x/zoneSize)},${Math.floor(p.y/zoneSize)}`;
        return playerZone === enemyZone;
    }).length / memory.playerPositions.length;
}

function executeSuppressionFire(enemy, px, py, scenarioMatrix) {
    const suppressionPositions = [];
    
    // Create cone-shaped suppression area
    for (let angle = -0.4; angle <= 0.4; angle += 0.1) {
        const fireAngle = Math.atan2(py - enemy.y, px - enemy.x) + angle;
        suppressionPositions.push({
            x: enemy.x + Math.cos(fireAngle) * 250,
            y: enemy.y + Math.sin(fireAngle) * 250
        });
    }

    // Find safest suppression point
    const safestPoint = suppressionPositions.reduce((best, point) => {
        const coverScore = calculateCoverScore(scenarioMatrix, point.x, point.y);
        return coverScore > best.score ? 
            { point, score: coverScore } : best;
    }, { score: -1 }).point;

    return aStarPathFind(scenarioMatrix, enemy.x, enemy.y, safestPoint.x, safestPoint.y);
}

function calculateCoverScore(scenarioMatrix, x, y) {
    let score = 0;
    const directions = [
        {dx: 1, dy: 0}, {dx: -1, dy: 0}, 
        {dx: 0, dy: 1}, {dx: 0, dy: -1}
    ];
    
    directions.forEach(dir => {
        if (scenarioMatrix[Math.floor((x + dir.dx*20)/20)]?.[Math.floor((y + dir.dy*20)/20)] === 1) {
            score += 0.25;
        }
    });
    
    return score;
}


export function generateFlankingPath(scenarioMatrix, startX, startY, targetX, targetY) {
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

export function generateStrategicCover(scenarioMatrix, enemy, favoriteZones) {
 
    const zoneCovers = favoriteZones.flatMap(([zoneX, zoneY]) => {
        const zoneCenter = {
            x: zoneX * 200 + 100,
            y: zoneY * 200 + 100
        };
        const cover = findNearbyCover(scenarioMatrix, zoneCenter.x, zoneCenter.y);
        return cover ? [cover] : [];
    });


    const nearbyCover = findNearbyCover(scenarioMatrix, enemy.x, enemy.y);
    const nearbyCovers = nearbyCover ? [nearbyCover] : [];

 
    const allCovers = [...zoneCovers, ...nearbyCovers];
    
    if (allCovers.length > 0) {
        const selectedCover = allCovers.reduce((nearest, cover) => {
            const dist = Math.hypot(cover.x - enemy.x, cover.y - enemy.y);
            return dist < nearest.dist ? { cover, dist } : nearest;
        }, { dist: Infinity }).cover;
        
        return aStarPathFind(
            scenarioMatrix, 
            enemy.x, 
            enemy.y, 
            selectedCover.x, 
            selectedCover.y
        );
    }
    
    return generateObservantPatrol(scenarioMatrix, enemy, favoriteZones);
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

function isInFavoriteZone(favoriteZones, x, y) {
    return favoriteZones.some(([zoneX, zoneY]) => 
        Math.abs(x - (zoneX*200 + 100)) < 150 &&
        Math.abs(y - (zoneY*200 + 100)) < 150
    );
}



export function predictiveAim(path, memory) {
    if (!path || path.length === 0) path = [memory.lastCampPosition || { x: 0, y: 0 }];
    
    const currentPos = memory.playerPositions[memory.playerPositions.length - 1] || { x: 0, y: 0 };
    const predictedPos = predictFromMemory(memory);
    
    if (isInFavoriteZone(memory.favoriteZones, currentPos.x, currentPos.y)) {
        predictedPos.x += (predictedPos.x - memory.favoriteZones[0][0]*200) * 0.3;
        predictedPos.y += (predictedPos.y - memory.favoriteZones[0][1]*200) * 0.3;
    }

    const vx = currentPos?.vx || 0;
    const vy = currentPos?.vy || 0;
    const pathStart = path[0] || { x: 0, y: 0 };
    
    const leadFactor = 1.5 + (calculateAggression(memory) * 0.7);
    
    return Math.atan2(
        predictedPos.y - pathStart.y + (vy * leadFactor),
        predictedPos.x - pathStart.x + (vx * leadFactor)
    );
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