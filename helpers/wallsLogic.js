export function wallAwareVelocity(baseVector, repulsion) {
    const avoidanceWeight = 0.7;
    const baseWeight = 0.3;
    
    return {
        x: (baseVector.x * baseWeight) + (repulsion.x * avoidanceWeight),
        y: (baseVector.y * baseWeight) + (repulsion.y * avoidanceWeight)
    };
}

export function getPathDirection(path, enemy) {
    if (path.length < 2) return { x: 0, y: 0 };
    
    const nextStep = path[1];
    const targetX = nextStep.x * 20 + 10;
    const targetY = nextStep.y * 20 + 10;
    
    return {
        x: targetX - enemy.x,
        y: targetY - enemy.y
    };
}

export function basicWallAvoidance(enemyX, enemyY, scenarioMatrix) {
    const gridSize = 20;
    const detectionRadius = 1; 
    
    const gridX = Math.floor(enemyX / gridSize);
    const gridY = Math.floor(enemyY / gridSize);
    
    let repulsion = { x: 0, y: 0 };
    
 
    for (let dx = -detectionRadius; dx <= detectionRadius; dx++) {
        for (let dy = -detectionRadius; dy <= detectionRadius; dy++) {
            if (dx === 0 && dy === 0) continue;
            
            const checkX = gridX + dx;
            const checkY = gridY + dy;
            
            if (scenarioMatrix[checkX]?.[checkY] === 1) {
          
                repulsion.x -= dx * (1 / Math.abs(dx || 1));
                repulsion.y -= dy * (1 / Math.abs(dy || 1));
            }
        }
    }
    
  
    const magnitude = Math.sqrt(repulsion.x**2 + repulsion.y**2);
    if (magnitude > 0) {
        repulsion.x /= magnitude;
        repulsion.y /= magnitude;
    }
    
    return repulsion; 
}