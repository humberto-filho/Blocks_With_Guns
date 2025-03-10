export function aStarPathFind(scenarioMatrix, startX, startY, goalX, goalY, options = {}, depth = 0) {
    const MAX_RECURSION_DEPTH = 3;
    const { 
        diagonalCost = 1.4, 
        heuristicWeight = 1,
        avoidRecent = [],
        tempWalls = []
    } = options;

    if (depth > MAX_RECURSION_DEPTH) return [];

    class Node {
        constructor(x, y, parent = null) {
            this.x = x;
            this.y = y;
            this.parent = parent;
            this.g = 0;
            this.h = 0;
            this.f = 0;
        }
    }

    const toGrid = (val) => Math.floor(val / 20);
    const start = new Node(toGrid(startX), toGrid(startY));
    const goal = new Node(toGrid(goalX), toGrid(goalY));

    const isWall = (x, y) => 
        scenarioMatrix[x]?.[y] === 1 || 
        tempWalls.some(w => w.x === x && w.y === y);

    const getNeighbors = (node) => {
        const neighbors = [];
        const directions = [
            {dx: 1, dy: 0, cost: 1},
            {dx: -1, dy: 0, cost: 1},
            {dx: 0, dy: 1, cost: 1},
            {dx: 0, dy: -1, cost: 1},
            {dx: 1, dy: 1, cost: diagonalCost},
            {dx: 1, dy: -1, cost: diagonalCost},
            {dx: -1, dy: 1, cost: diagonalCost},
            {dx: -1, dy: -1, cost: diagonalCost}
        ];

        for (const dir of directions) {
            const x = node.x + dir.dx;
            const y = node.y + dir.dy;
            const nodeKey = `${x},${y}`;
            
            if (avoidRecent.includes(nodeKey)) continue;
            
            if (x >= 0 && x < 25 && y >= 0 && y < 25 && !isWall(x, y)) {
                const neighbor = new Node(x, y, node);
                neighbor.g = node.g + dir.cost;
                neighbors.push(neighbor);
            }
        }
        return neighbors;
    };

    const heuristic = (a, b) => (
        Math.abs(a.x - b.x) + 
        Math.abs(a.y - b.y) + 
        (Math.sqrt(2) - 2) * Math.min(
            Math.abs(a.x - b.x), 
            Math.abs(a.y - b.y)
        )
    ) * heuristicWeight;

    const openSet = new PriorityQueue((a, b) => a.f - b.f);
    openSet.enqueue(start);
    const closedSet = new Set();

    let attempts = 0;
    const MAX_ATTEMPTS = 500;

    while (!openSet.isEmpty() && attempts++ < MAX_ATTEMPTS) {
        const current = openSet.dequeue();

        if (current.x === goal.x && current.y === goal.y) {
            const path = [];
            let node = current;
            while (node) {
                path.push({ 
                    x: node.x * 20 + 10, 
                    y: node.y * 20 + 10 
                });
                node = node.parent;
            }
            return path.reverse();
        }

        closedSet.add(`${current.x},${current.y}`);

        for (const neighbor of getNeighbors(current)) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            
            if (closedSet.has(neighborKey)) continue;

            neighbor.h = heuristic(neighbor, goal);
            neighbor.f = neighbor.g + neighbor.h;

            const existing = openSet.find(n => 
                n.x === neighbor.x && n.y === neighbor.y
            );
            
            if (!existing || neighbor.f < existing.f) {
                if (existing) openSet.remove(existing);
                openSet.enqueue(neighbor);
            }
        }
    }

    if (attempts >= MAX_ATTEMPTS && depth < MAX_RECURSION_DEPTH) {
        const newWall = getValidFallbackWall(start);
        return aStarPathFind(
            scenarioMatrix, 
            startX, 
            startY, 
            goalX, 
            goalY, 
            {
                ...options,
                avoidRecent: [],
                tempWalls: [...tempWalls, newWall]
            },
            depth + 1
        );
    }

    return [];
}

function getValidFallbackWall(startNode) {
    const directions = [
        {dx: 1, dy: 0}, {dx: -1, dy: 0},
        {dx: 0, dy: 1}, {dx: 0, dy: -1}
    ];
    
    for (const dir of directions) {
        const x = startNode.x + dir.dx;
        const y = startNode.y + dir.dy;
        if (x >= 0 && x < 25 && y >= 0 && y < 25) {
            return { x, y, expires: Date.now() + 5000 };
        }
    }
    return { x: startNode.x, y: startNode.y, expires: Date.now() + 5000 };
}

class PriorityQueue {
    constructor(comparator = (a, b) => a.f - b.f) {
        this.heap = [];
        this.comparator = comparator;
    }

    enqueue(item) {
        this.heap.push(item);
        this.heap.sort(this.comparator);
    }

    dequeue() {
        return this.heap.shift();
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    find(predicate) {
        return this.heap.find(predicate);
    }

    remove(item) {
        const index = this.heap.indexOf(item);
        if (index > -1) this.heap.splice(index, 1);
    }
}
