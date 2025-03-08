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