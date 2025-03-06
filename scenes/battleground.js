import { generateScenario } from "../functions/generateScenario.js";
import { handleGun } from "../functions/handleGun.js";
import { handleMovement } from "../functions/handleMovement.js";
import { handleShooting } from "../functions/handleShooting.js";
class Battleground extends Phaser.Scene {
    constructor(){
        super({
            key : 'battleground'
        })
    }

    init(){
        this.player = null;
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyW= this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.player = null;
        this.enemy = null;
        this.gun = null;
        this.shootCooldown = 300;
        this.lastShotTime = 0;
    }

    preload(){
        this.load.spritesheet('player', 'assets/player.png', {
            frameWidth: 20,
            frameHeight: 20
        });
        this.load.image('wall', 'assets/wall.png');
        this.load.image('enemy', 'assets/enemy.png');
        this.load.image('gun', 'assets/gun.png');
        this.load.image('bullet', 'assets/bullet.png');
    }

    create(data){
        
        let scenarioMatrix = generateScenario();
        this.walls = this.physics.add.staticGroup();
        for(let i = 0; i < 25; i++){
            for(let j = 0; j < 25; j++){
                if (scenarioMatrix[i][j] === 1){
                  this.walls.create(i * 20, j * 20, 'wall').setOrigin(0, 0).setScale(0.4).refreshBody();
                }
            }
        }

    
        this.playerX = 75;
        this.playerY = 75;
        
        let playerIndexX = Math.floor(this.playerX / 20);
        let playerIndexY = Math.floor(this.playerY / 20);

        
    
        while (scenarioMatrix[playerIndexX] && scenarioMatrix[playerIndexX][playerIndexY] === 1) {
            playerIndexX++;
            playerIndexY++;
        
            if (playerIndexX >= 25 || playerIndexY >= 25) {
                playerIndexX = 0;
                playerIndexY = 0;
                break;
            }
        }

        this.playerX = playerIndexX * 20 + 10;
        this.playerY = playerIndexY * 20 + 10;

        let enemyX = 425;
        let enemyY = 425;

        let enemyIndexX = Math.floor(enemyX / 20);
        let enemyIndexY = Math.floor(enemyY / 20);

        while(scenarioMatrix[enemyIndexX] && scenarioMatrix[enemyIndexX][enemyIndexY] == 1){
            enemyIndexX--;
            enemyIndexY--;

            if(enemyIndexX >= 25 || enemyIndexY >= 25){
                enemyIndexX = 0;
                enemyIndexY = 0;
                break;
            }
        }

        enemyX = enemyIndexX * 20 + 10;
        enemyY = enemyIndexY * 20 + 10;

        if (data.player == 'yellow'){
            this.player = this.physics.add.sprite(this.playerX, this.playerY, 'player', 0).setOrigin(0.5, 0.5).setDepth(1).setScale(1);
        } else if (data.player == 'green'){
            this.player = this.physics.add.sprite(this.playerX, this.playerY, 'player', 1).setOrigin(0.5, 0.5).setDepth(1).setScale(1);
        } else if (data.player == 'blue'){
            this.player = this.physics.add.sprite(this.playerX, this.playerY, 'player', 2).setOrigin(0.5, 0.5).setDepth(1).setScale(1);
        } else { 
            alert("data not found");
        }

        this.enemy = this.physics.add.sprite(enemyX, enemyY, 'enemy').setScale(1.25).setDepth(1).setOrigin(0.5, 0.5).setScale(1)
        this.gun = this.physics.add.sprite(this.playerX, this.playerY, 'gun').setScale(1).setDepth(2).setOrigin(0.5, 0.5);
        this.physics.add.collider(this.player, this.walls);

        this.bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 10,
        collideWorldBounds: true,
        removeCallback: (bullet) => {
            bullet.body.enable = false;
        }
        });

        this.physics.add.collider(this.bullets, this.walls, (bullet, wall) => {
            bullet.destroy();
        });
    
        this.physics.world.on('worldbounds', (body) => {
            body.gameObject.destroy();
        });
        
        this.input.on('pointerup', () => {
            this.shoot();
        });
    }


    update(){
        let mouseX = this.input.activePointer.x;
        let mouseY = this.input.activePointer.y;
        let speed = 70;
        let playerCoordinates = handleMovement(this.player, this.keyW, this.keyA, this.keyS, this.keyD, speed, this.playerX, this.playerY);
        handleGun(this.gun,mouseX, mouseY, playerCoordinates.x, playerCoordinates.y);
    }

    shoot() {
        const currentTime = this.time.now; 
        if (currentTime - this.lastShotTime < this.shootCooldown) {
            return;
        }
    
        const bullet = this.bullets.get();
        if (bullet) {
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.body.enable = true;
            
            const mouseX = this.input.activePointer.x;
            const mouseY = this.input.activePointer.y;
            const playerX = this.player.body.position.x;
            const playerY = this.player.body.position.y;
            
            handleShooting(bullet, mouseX, mouseY, playerX, playerY);
            this.lastShotTime = currentTime;
        }
    }
}

window.Battleground = Battleground;