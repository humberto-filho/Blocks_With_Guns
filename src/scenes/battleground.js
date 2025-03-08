import { generateScenario } from "../functions/generateScenario.js";
import { handleGun } from "../functions/handleGun.js";
import { handleMovement } from "../functions/handleMovement.js";
import { handleShooting } from "../functions/handleShooting.js";
import { enemyAI } from "../functions/enemyAI.js";
import { hasLineOfSight} from "../functions/hasLineOfSight.js";
import { initializeMemory } from "../functions/markovHard.js";
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
        this.scenarioMatrix = null;
        this.angleCooldown = 50;
        this.playerHearts = 5;
        this.enemyHearts = 5;
        this.currentTime = 0;
        this.colorCooldown = 500;
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
        this.load.image('heart', 'assets/heart.png');
        this.load.audio('shot', 'assets/shot.mp3');
        this.load.audio('battleground', 'assets/battleground.mp3');
        this.load.image('bg', 'assets/battlegroundbg.png');
        this.load.audio('error', 'assets/error.mp3');
        this.load.audio('winning_sound', 'assets/winning_sound.mp3');
        this.load.audio('defeated_sound', 'assets/defeated_sound.mp3');
    }

    create(data){
        this.add.image(250, 250, 'bg').setOrigin(0.5,0.5).setDepth(0).setAlpha(0.25);
        this.sound.play('battleground', {
            volume: 0.7,
            loop: true
        });
        let scenarioMatrix = generateScenario();
        this.walls = this.physics.add.staticGroup();
        for(let i = 0; i < 25; i++){
            for(let j = 0; j < 25; j++){
                if (scenarioMatrix[i][j] === 1){
                  this.walls.create(i * 20, j * 20, 'wall').setOrigin(0, 0).setScale(0.4).refreshBody();
                }
            }
        }

        this.add.text(70, 15, 'Player', { 
            fontSize: '25px', 
            fill: '#fff' 
        }).setOrigin(0.5);

      
        this.add.text(430, 15, 'Enemy', {
            fontSize: '25px', 
            fill: '#fff'
        }).setOrigin(0.5);

        this.playerHeartsGroup = this.add.group();
        for (let i = 0; i < 5; i++) {
            this.playerHeartsGroup.add(
                this.add.sprite(20 + i * 30, 40, 'heart')
                    .setScale(3)
            );
        }

        this.enemyHeartsGroup = this.add.group();
        for (let i = 0; i < 5; i++) {
            this.enemyHeartsGroup.add(
                this.add.sprite(475 - i * 30, 40, 'heart')
                    .setScale(3)
            );
        }


        this.playerBullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 10,
            collideWorldBounds: true,
            removeCallback: (bullet) => {
                bullet.setActive(false);
                bullet.setVisible(false);
                bullet.body.enable = false; 
            }
        });

        this.enemyBullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 10,
            collideWorldBounds: true,
            removeCallback: (bullet) => {
                bullet.setActive(false);
                bullet.setVisible(false);
                bullet.body.enable = false; 
            }
        });

        this.physics.add.collider(this.playerBullets, this.walls, (bullet, wall) => {
            bullet.setActive(false);
            bullet.setVisible(false);
            bullet.body.enable = false; 
        });
    
        this.physics.add.collider(this.enemyBullets, this.walls, (bullet, wall) => {
            bullet.setActive(false);
            bullet.setVisible(false);
            bullet.body.enable = false; 
        });

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
            this.player = this.physics.add.sprite(this.playerX, this.playerY, 'player', 0).setOrigin(0.5, 0.5).setDepth(1).setScale(1).setAlpha(0.8);
        } else if (data.player == 'green'){
            this.player = this.physics.add.sprite(this.playerX, this.playerY, 'player', 1).setOrigin(0.5, 0.5).setDepth(1).setScale(1).setAlpha(0.8);
        } else if (data.player == 'blue'){
            this.player = this.physics.add.sprite(this.playerX, this.playerY, 'player', 2).setOrigin(0.5, 0.5).setDepth(1).setScale(1).setAlpha(0.8);
        } else { 
            alert("data not found");
        }

        this.enemy = this.physics.add.sprite(enemyX, enemyY, 'enemy').setScale(1.25).setDepth(1).setOrigin(0.5, 0.5).setScale(1)
        this.gun = this.physics.add.sprite(this.playerX, this.playerY, 'gun').setScale(1).setDepth(2).setOrigin(0.5, 0.5);
        this.enemyGun = this.physics.add.sprite(this.enemyX, this.enemyY, 'gun').setScale(1).setDepth(2).setOrigin(0.5, 0.5);
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.enemy, this.walls);
        this.enemy.canShoot = true;
        this.enemy.shootCooldown = 0;

        this.physics.add.overlap(this.enemy, this.playerBullets, (enemy, bullet) => {
            bullet.disableBody(true, true); 
            this.enemyHearts = Math.max(this.enemyHearts - 1, 0);
            this.updateHearts(this.enemyHeartsGroup, this.enemyHearts);
            if (this.enemyHearts <= 0) this.gameOver(true);
        });


        this.physics.add.overlap(this.player, this.enemyBullets, (player, bullet) => {
            bullet.disableBody(true, true); 
            this.playerHearts = Math.max(this.playerHearts - 1, 0);
            this.updateHearts(this.playerHeartsGroup, this.playerHearts);
            if (this.playerHearts <= 0) this.gameOver(false);
        });

        this.physics.world.on('worldbounds', (body) => {
            body.gameObject.destroy();
        });

        this.physics.world.on('worldbounds', (body) => {
            if (body.gameObject.texture.key === 'bullet') {
                body.gameObject.setActive(false);
                body.gameObject.setVisible(false);
                body.gameObject.body.enable = false; 
            }
        });
        
        this.input.on('pointerup', () => {
            this.shoot();
        });

        this.scenarioMatrix = scenarioMatrix;
        this.difficulty = data.difficulty;
        this.borderGr = this.add.graphics();

        if (data.difficulty == 'hard'){
            initializeMemory(this.enemy);
        }
    }


    update(){
        let mouseX = this.input.activePointer.x;
        let mouseY = this.input.activePointer.y;
        let speed = 70;
        let infosPlayer = handleMovement(this.player, this.keyW, this.keyA, this.keyS, this.keyD, speed, this.playerX, this.playerY);
        handleGun(this.gun,mouseX, mouseY, infosPlayer.x, infosPlayer.y);
        
        const shotInfo = {
            time: this.time.now,
            angle: this.gun.rotation,
            x: this.player.x,
            y: this.player.y
        };
        
        const aiDecision = enemyAI(
            this.scenarioMatrix,
            infosPlayer.x,
            infosPlayer.y,
            infosPlayer.vx,
            infosPlayer.vy,
            this.difficulty,
            this.enemy,
            shotInfo 
        );

        
        this.canShoot = hasLineOfSight(this.scenarioMatrix, this.enemy.x, this.enemy.y, infosPlayer.x, infosPlayer.y);

        this.enemy.body.setVelocity(
            aiDecision.movement.x * aiDecision.speed,
            aiDecision.movement.y * aiDecision.speed
        );
        
        if (this.enemy.shootCooldown <= 0){
            this.enemy.shootCooldown = 0;
        }

        if (this.canShoot && this.enemy.shootCooldown <= 0) {
            this.enemyShoot(aiDecision.fireAngle);
        }
        

    
        if (this.enemy.shootCooldown > 0) {
            this.enemy.shootCooldown -= 1;
        }

        if(this.angleCooldown > 0 && this.difficulty == 'easy'){
            this.angleCooldown -= 1;
        }

        if(this.angleCooldown <= 0 && this.difficulty == 'easy'){
            this.angleCooldown = 50;
        }
        
        this.handleEnemyGun(aiDecision.fireAngle, this.enemyGun, this.enemy.x, this.enemy.y);
        this.timeRn = this.time.now;
        
        if(this.timeRn - this.currentTime >= 500){
            this.borderGr.clear();
            this.player.setTint(0xffffff);
            
        } else{
            this.drawBorder();
        }
    }

    drawBorder() {
   
        this.borderGr.clear();
    
  
        this.borderGr.lineStyle(1, 0x000000); 
        this.borderGr.strokeRect(
            this.player.x - this.player.displayWidth / 2 + 1, 
            this.player.y - this.player.displayHeight / 2 + 1, 
            this.player.displayWidth - 2, 
            this.player.displayHeight - 2 
        ).setDepth(2);
    }

    updateHearts(heartsGroup, currentHearts) {
        heartsGroup.getChildren().forEach((heart, index) => {
            if (index >= currentHearts){
                heart.setTintFill(0x000000);
            }
        });
    }
    

    gameOver(playerWon) {
        this.sound.stopAll();
        this.physics.pause();
        if (playerWon){
            this.sound.play('winning_sound', {
                volume : 0.5
            });
        } else { 
            this.sound.play('defeated_sound', {
                volume : 0.5
            });
        }

        this.add.rectangle(240, 240, 400, 100, 0x000000).setDepth(2);
        this.add.rectangle(240, 290, 400, 100, 0x000000).setDepth(2);

        this.add.text(250, 250, playerWon ? 'Vitória !!' : 'Derrota :(', { 
            backgroundColor : 'white',
            fontSize: '20px', 
            fill: 'red' 
        }).setOrigin(0.5, 0.5).setDepth(3);
        
        this.add.text(250, 300, 'Clique para ir à tela inicial', { 
            backgroundColor: 'white',
            fontSize: '20px', 
            fill: 'red' 
        }).setOrigin(0.5, 0.5).setDepth(3);
        
        this.input.once('pointerdown', () => {
            this.textures.remove('bg');
            this.scene.start('welcome');
        });
    }
    

    handleEnemyGun(fireAngle, gun, x, y){
        gun.setOrigin(0, 0.5);
        gun.setPosition(x, y);
        if (this.angleCooldown == 50){
        gun.setRotation(fireAngle);
        }
    }

    enemyShoot(fireAngle) {
        const bullet = this.enemyBullets.get();
        if (bullet && this.canShoot) {
            this.sound.play('shot',{
                volume: 0.1
            });
            this.enemy.shootCooldown = 500;
            bullet.setPosition(this.enemy.x, this.enemy.y);
            bullet.setRotation(fireAngle);
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.body.enable = true;
            bullet.body.setVelocity(0, 0); 
            const bulletSpeed = 200;
            bullet.body.setVelocity(
                Math.cos(fireAngle) * bulletSpeed,
                Math.sin(fireAngle) * bulletSpeed
            );
        }
    }

    shoot() {
        this.currentTime = this.time.now; 
      
        if (this.currentTime - this.lastShotTime < this.shootCooldown) {
            this.lastShotTime = this.currentTime;
            this.player.setTintFill(0xff0000);
            this.borderGr.lineStyle(1, 0x000000);
            this.borderGr.strokeRect(
                this.player.x - this.player.displayWidth / 2, 
                this.player.y - this.player.displayHeight / 2,
                this.player.displayWidth, 
                this.player.displayHeight 
            );
            this.sound.play('error');
            return;
        }
        else{
        const bullet = this.playerBullets.get();
        if (bullet) {
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.body.enable = true;
            this.sound.play('shot', {
                volume: 0.2
            });
            const mouseX = this.input.activePointer.x;
            const mouseY = this.input.activePointer.y;
            const playerX = this.player.body.position.x;
            const playerY = this.player.body.position.y;
            handleShooting(bullet, mouseX, mouseY, playerX, playerY);
            this.lastShotTime = this.currentTime;
        }}
    }
}

window.Battleground = Battleground;