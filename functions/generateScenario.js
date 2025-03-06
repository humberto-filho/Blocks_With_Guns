export function generateScenario(){
      
    const rows = 25;
    const cols = 25;
    let matrix = [];

    // Initialize matrix with 0's
    for (let i = 0; i < rows; i++) {
        matrix[i] = [];
        for (let j = 0; j < cols; j++) {
            matrix[i][j] = 0;
        }
    }

    // Fill the top, bottom, left, and right borders with 1's
    for (let j = 0; j < cols; j++) {
        matrix[0][j] = 1;           // Top border
        matrix[rows - 1][j] = 1;      // Bottom border
    }
    for (let i = 0; i < rows; i++) {
        matrix[i][0] = 1;           // Left border
        matrix[i][cols - 1] = 1;      // Right border
    }

    // Generate noise for inner cells (values between 0 and 1)
    let noise = [];
    for (let i = 0; i < rows; i++) {
        noise[i] = [];
        for (let j = 0; j < cols; j++) {
            noise[i][j] = Math.random();
        }
    }

    // Smooth the noise using a simple neighborhood average
    let smooth = [];
    for (let i = 0; i < rows; i++) {
        smooth[i] = [];
        for (let j = 0; j < cols; j++) {
            let sum = 0;
            let count = 0;
            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    let ni = i + di;
                    let nj = j + dj;
                    if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
                        sum += noise[ni][nj];
                        count++;
                    }
                }
            }
            smooth[i][j] = sum / count;
        }
    }

    // For inner cells (not borders), use the smoothed noise to randomly place walls.
    // A higher threshold means fewer walls. Adjust threshold to get desired labyrinth look.
    for (let i = 1; i < rows - 1; i++) {
        for (let j = 1; j < cols - 1; j++) {
            if (smooth[i][j] > 0.6) {
                matrix[i][j] = 1;
            }
        }
    }

    return matrix;
}