export function generateScenario(){
      
    const rows = 25;
    const cols = 25;
    let matrix = [];

    for (let i = 0; i < rows; i++) {
        matrix[i] = [];
        for (let j = 0; j < cols; j++) {
            matrix[i][j] = 0;
        }
    }

 
    for (let j = 0; j < cols; j++) {
        matrix[0][j] = 1;           
        matrix[rows - 1][j] = 1;      
    }
    for (let i = 0; i < rows; i++) {
        matrix[i][0] = 1;
        matrix[i][cols - 1] = 1;      
    }


    let noise = [];
    for (let i = 0; i < rows; i++) {
        noise[i] = [];
        for (let j = 0; j < cols; j++) {
            noise[i][j] = Math.random();
        }
    }


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

    for (let i = 1; i < rows - 1; i++) {
        for (let j = 1; j < cols - 1; j++) {
            if (smooth[i][j] > 0.61) {
                matrix[i][j] = 1;
            }
        }
    }

    return matrix;
}