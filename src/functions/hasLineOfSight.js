export function hasLineOfSight(scenarioMatrix, px, py, ex, ey) {
    const toGrid = (val) => Math.floor(val / 20); 
    const gridX1 = toGrid(px);
    const gridY1 = toGrid(py);
    const gridX2 = toGrid(ex);
    const gridY2 = toGrid(ey);

    const dx = gridX2 - gridX1;
    const dy = gridY2 - gridY1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    for (let i = 0; i <= steps; i++) {
        const x = gridX1 + Math.round((dx / steps) * i);
        const y = gridY1 + Math.round((dy / steps) * i);

        if (scenarioMatrix[x]?.[y] === 1) {
            return false; 
        }
    }

    return true; 

}