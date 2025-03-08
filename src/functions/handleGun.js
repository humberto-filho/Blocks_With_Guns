export function handleGun(gun, mouseX, mouseY, spriteX, spriteY) {

    gun.setOrigin(0, 0.5); 

    const dx = mouseX - spriteX;
    const dy = mouseY - spriteY;
    const angle = Math.atan2(dy, dx);
    
    gun.setPosition(spriteX + 10, spriteY + 10);
    gun.setRotation(angle);
}