export function handleShooting(bullet, mouseX, mouseY, playerX, playerY) {
    
    const dx = mouseX - playerX;
    const dy = mouseY - playerY;
    const angle = Math.atan2(dy, dx); 
    bullet.setPosition(playerX + 10, playerY + 10);
    bullet.setRotation(angle);
    const speed = 300; 
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    bullet.body.setVelocity(velocityX, velocityY);
    bullet.body.enable = true;
    bullet.body.onWorldBounds = true; 
}