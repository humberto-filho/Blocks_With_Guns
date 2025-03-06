class SelectPlayer extends Phaser.Scene {
    constructor(){
        super({
            key : 'select_player'
        })
    }

    init(){
        this.select = null;
    }

    preload(){
        this.load.image('select', 'assets/selectplayer.png');
        this.load.image('yellow', 'assets/yellow.png');
        this.load.image('green', 'assets/green.png');
        this.load.image('blue', 'assets/blue.png');
        this.load.audio('selectplayer', 'assets/select_player.mp3');
        this.load.audio('button_hover', 'assets/button_hover.mp3');
    }   

    create(){
        this.sound.play('selectplayer',{
            loop: true,
            volume: 0.5
        });
        this.select = this.add.image(250, 250, 'select').setOrigin(0.5, 0.5).setDepth(0);

        let yellowButton = this.add.image(45, 186, 'yellow').setDepth(1).setOrigin(0,0).setInteractive({useHandCursor: true});
        let greenButton = this.add.image(184, 186,  'green').setDepth(1).setOrigin(0,0).setInteractive({useHandCursor: true});
        let blueButton = this.add.image(335, 186, 'blue').setDepth(1).setOrigin(0,0).setInteractive({useHandCursor: true});

        yellowButton.on('pointerover', () => {
            yellowButton.setTint(0xff7f7f);
            this.sound.play('button_hover');
        });

        yellowButton.on('pointerout', () => {
            yellowButton.setTint(0xffffff);
        });

        yellowButton.on('pointerup', () => {
            this.sound.stopAll();
            let playerData = {player: 'yellow'};
            this.scene.start('battleground', playerData);
        });

        greenButton.on('pointerover', () => {
            greenButton.setTint(0xff7f7f);
            this.sound.play('button_hover');
        });

        greenButton.on('pointerout', () => {
            greenButton.setTint(0xffffff);
        });

        greenButton.on('pointerup', () => {
            this.sound.stopAll();
            let playerData = {player : 'green'};
            this.scene.start('battleground', playerData);
        });

        blueButton.on('pointerover', () => {
            blueButton.setTint(0xff7f7f);
            this.sound.play('button_hover');
        });

        blueButton.on('pointerout', () => {
            blueButton.setTint(0xffffff);

        });

        blueButton.on('pointerup', () =>{
            this.sound.stopAll();
            let playerData = {player: 'blue'};
            this.scene.start('battleground', playerData);
        });
    }

    update(){

    }
}

window.SelectPlayer = SelectPlayer;