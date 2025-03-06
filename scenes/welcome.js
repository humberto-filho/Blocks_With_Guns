class Welcome extends Phaser.Scene {
    constructor() {
      super({ key: "welcome" });
    }
  
    init() {
      this.bg = null;
      this.welcome = null;
    }
  
    preload() {
      this.load.image('bg', 'assets/background.png');
      this.load.spritesheet('welcome', 'assets/welcome.png', {
        frameWidth: 500,
        frameHeight: 500
      });
      this.load.audio('welcome_song', 'assets/welcome_song.mp3');
      this.load.image('button', 'assets/playbutton.png');
      this.load.audio('button_hover', 'assets/button_hover.mp3');
    }
  
    create() {
        this.sound.play('welcome_song', {
            loop: true,
            volume : 0.5
        });
        this.bg = this.add.image(250, 250, 'bg')
        .setOrigin(0.5)
        .setDepth(0);


        this.welcome = this.add.sprite(250, 250, 'welcome')
        .setOrigin(0.5)
        .setDepth(1);
        let playButton = this.add.image(92, 227, 'button').setOrigin(0,0).setInteractive({useHandCursor: true}).setDepth(2);

        playButton.on('pointerover', () => {
            playButton.setTint(0x00ffff);
            this.sound.play('button_hover');
        }); 

        playButton.on('pointerout', () => {
            playButton.setTint(0xffffff);
        });

        playButton.on('pointerup', () => {
            this.time.delayedCall(400, () => {
                this.bg.destroy(true);
                this.sound.stopAll();
                this.scene.start('select_player', {}, {
                    remove: true,
                    clearCache: false
                });
            });
        }); 

        this.anims.create({
        key: 'shine',
        frames: this.anims.generateFrameNumbers('welcome', { start: 0, end: 2 }),
        frameRate: 2,
        repeat: -1
        });

        this.welcome.play('shine');
    }
  
    update() {
  
    }
  }
  

  window.Welcome = Welcome;
  