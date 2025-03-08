//trainEnemy.js

class InsaneAI {
    constructor() {
      this.brain = new NeuralNetwork([
        {input: 12, output: 8, activation: 'relu'},
        {input: 8, output: 4, activation: 'sigmoid'}
      ]);
      
      this.memory = new ExperienceReplay(1000);
    }
  
    async train() {
      const hardAI = new HardAI();
      let bestScore = -Infinity;
      
      for(let gen = 0; gen < 1000; gen++) {
        const {reward, steps} = this.runEpisode(hardAI);
        this.memory.addEpisode(reward);
        
        if(reward > bestScore) {
          bestScore = reward;
          this.brain.save('best-weights.json');
        }
        
      
        if(gen % 100 === 0) {
          this.evolvePopulation();
        }
      }
    }
  
    rewardFunction() {
      return (
        5 * this.health +
        3 * this.damageDealt -
        2 * this.damageTaken -
        this.timeAlive * 0.1
      );
    }
  
    evolvePopulation() {
      const mutationRate = 0.05 * (1 - this.bestScore / 500);
      this.brain.mutate(mutationRate);
    }
  }