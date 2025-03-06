export function aStarPathFind(scenarioMatrix, startX, startY, goalX, goalY) {
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

    const isWall = (x, y) => scenarioMatrix[x]?.[y] === 1;

    const getNeighbors = (node) => {
        const neighbors = [];
        const directions = [
            {dx: 1, dy: 0},  
            {dx: -1, dy: 0},
            {dx: 0, dy: 1},  
            {dx: 0, dy: -1} 
        ];

        for (const dir of directions) {
            const x = node.x + dir.dx;
            const y = node.y + dir.dy;
      
            if (x >= 0 && x < 25 && y >= 0 && y < 25 && !isWall(x, y)) {
                neighbors.push(new Node(x, y, node));
            }
        }
        return neighbors;
    };


    const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    const openSet = [start];
    const closedSet = new Set();

    while (openSet.length > 0) {
     
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();

     
        if (current.x === goal.x && current.y === goal.y) {
  
            const path = [];
            let temp = current;
            while (temp) {
                path.push({x: temp.x, y: temp.y});
                temp = temp.parent;
            }
            return path.reverse();
        }

        closedSet.add(`${current.x},${current.y}`);


        for (const neighbor of getNeighbors(current)) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            
            if (closedSet.has(neighborKey)) continue;

   
            const tentativeG = current.g + 1;

            let inOpen = openSet.find(n => 
                n.x === neighbor.x && n.y === neighbor.y
            );
            
            if (!inOpen || tentativeG < inOpen.g) {
                neighbor.g = tentativeG;
                neighbor.h = heuristic(neighbor, goal);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = current;

                if (!inOpen) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    return [];
}