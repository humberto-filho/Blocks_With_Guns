export function handleMovement(player, keyW, keyA, keyS, keyD, speed){
    if (!player.body){
        console.error("Corpo físico do jogador não encontrado");
        return;
    }

    player.body.setVelocity(0);

    const moveX = (keyA.isDown ? -1 : 0) + (keyD.isDown ? 1 : 0);
    const moveY = (keyW.isDown ? -1 : 0) + (keyS.isDown ? 1 : 0);
    player.body.velocity.set(
        moveX * speed,
        moveY * speed 
    );
    const playerX = player.body.position.x;
    const playerY = player.body.position.y;

    return {x: playerX, y: playerY};
}
