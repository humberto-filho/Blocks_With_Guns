export function handleGun(gun, mouseX, mouseY, playerX, playerY) {

    gun.setOrigin(0, 0.5); 

    const dx = mouseX - playerX;
    const dy = mouseY - playerY;
    const angle = Math.atan2(dy, dx);
    
    gun.setPosition(playerX + 10, playerY + 10);
    gun.setRotation(angle);
}