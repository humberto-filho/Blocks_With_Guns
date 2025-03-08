class Difficulties extends Phaser.Scene{
    constructor(){
        super({
            key: 'difficulties'
        });
    }

    preload(){
        this.load.image('difficulties', 'assets/difficulties.png');
        this.load.image('easy', 'assets/easy.png');
        this.load.image('medium', 'assets/medium.png');
        this.load.image('hard', 'assets/hard.png');
        this.load.image('insane', 'assets/insane.png');
        this.load.audio('selectplayer', 'assets/selectplayer.png');
        this.load.audio('button', 'assets/button_hover.mp3');
    }

    create(data){
        this.sound.play('selectplayer', {
            volume: 0.3,
            loop: true
        });
        this.add.image(250, 250, 'difficulties').setOrigin(0.5, 0.5);
        this.easyButton = this.add.image(102, 50, 'easy').setOrigin(0,0).setDepth(1).setInteractive({useHandCursor: true});
        this.mediumButton = this.add.image(85, 152, 'medium').setOrigin(0,0).setDepth(1).setInteractive({useHandCursor: true});
        this.hardButton = this.add.image(71, 268, 'hard').setOrigin(0,0).setDepth(1).setInteractive({useHandCursor: true});
      

        this.easyButton.on('pointerover', () => {
            this.easyButton.setTint(0xff7f7f);
            this.sound.play('button_hover');
        });

        this.easyButton.on('pointerout', () => {
            this.easyButton.setTint(0xffffff);
        });

        this.easyButton.on('pointerup', () => {
            this.sound.stopAll();
            let playerData = {player: data.player, difficulty : 'easy'};
            this.scene.start('battleground', playerData);
        });
        //
        this.mediumButton.on('pointerover', () => {
            this.mediumButton.setTint(0xff7f7f);
            this.sound.play('button_hover');
        });

        this.mediumButton.on('pointerout', () => {
            this.mediumButton.setTint(0xffffff);
        });

        this.mediumButton.on('pointerup', () => {
            this.sound.stopAll();
            let playerData = {player: data.player, difficulty : 'medium'};
            this.scene.start('battleground', playerData);
        });
        //
        this.hardButton.on('pointerover', () => {
            this.hardButton.setTint(0xff7f7f);
            this.sound.play('button_hover');
        });

        this.hardButton.on('pointerout', () => {
            this.hardButton.setTint(0xffffff);
        });

        this.hardButton.on('pointerup', () => {
            this.sound.stopAll();
            let playerData = {player: data.player, difficulty : 'hard'};
            this.scene.start('battleground', playerData);
        });


    }

    update(){

    }
}

window.Difficulties = Difficulties;