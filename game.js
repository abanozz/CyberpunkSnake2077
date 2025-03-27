// Three.js scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12); // Dark cyberpunk background
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Game variables
let snake = [];
let food = null;
let direction = new THREE.Vector3(1, 0, 0);
let nextDirection = new THREE.Vector3(1, 0, 0);
let score = 0;
let gameSpeed = 0.25;
let lastMoveTime = 0;
let gameStarted = false;
let gameLoop = null;
let isGameOver = false;
let keys = {};
let lastDirectionChange = 0;
const directionChangeDelay = 0.05;

// Cyberpunk colors
const colors = {
    neonPink: 0xff0080,
    neonBlue: 0x00ffd5,
    neonYellow: 0xf7ff00,
    darkBackground: 0x0a0a12
};

// Create grid with neon lines
function createGrid() {
    // Main grid
    const gridSize = 20;
    const gridDivisions = 20;
    const gridMaterial = new THREE.LineBasicMaterial({
        color: 0x1a1a2e,
        transparent: true,
        opacity: 0.8
    });
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x1a1a2e, 0x1a1a2e);
    gridHelper.position.y = -0.49;
    gridHelper.material = gridMaterial;
    scene.add(gridHelper);
    
    // Create neon accent lines
    createNeonLines();
}

// Create neon accent lines
function createNeonLines() {
    // Horizontal neon lines
    for (let i = -10; i <= 10; i += 5) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-10, -0.48, i),
            new THREE.Vector3(10, -0.48, i)
        ]);
        
        const lineMaterial = new THREE.LineBasicMaterial({
            color: i % 10 === 0 ? colors.neonPink : colors.neonBlue,
            transparent: true,
            opacity: 0.8
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
    }
    
    // Vertical neon lines
    for (let i = -10; i <= 10; i += 5) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(i, -0.48, -10),
            new THREE.Vector3(i, -0.48, 10)
        ]);
        
        const lineMaterial = new THREE.LineBasicMaterial({
            color: i % 10 === 0 ? colors.neonBlue : colors.neonPink,
            transparent: true,
            opacity: 0.8
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
    }
}

// Create ground with cyberpunk texture
function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x0a0a12,
        side: THREE.DoubleSide,
        shininess: 30
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Add border
    createBorder();
}

// Create border with neon effect
function createBorder() {
    // Create cyberpunk border with glow
    const borderMaterial = new THREE.MeshPhongMaterial({ 
        color: colors.neonBlue,
        emissive: colors.neonBlue,
        emissiveIntensity: 0.5,
        shininess: 100
    });
    
    // North border
    const northBorder = new THREE.Mesh(
        new THREE.BoxGeometry(20, 1, 0.5),
        borderMaterial
    );
    northBorder.position.set(0, 0, -10);
    northBorder.castShadow = true;
    scene.add(northBorder);
    
    // South border
    const southBorder = new THREE.Mesh(
        new THREE.BoxGeometry(20, 1, 0.5),
        borderMaterial
    );
    southBorder.position.set(0, 0, 10);
    southBorder.castShadow = true;
    scene.add(southBorder);
    
    // East border with different color
    const eastBorderMaterial = new THREE.MeshPhongMaterial({ 
        color: colors.neonPink,
        emissive: colors.neonPink,
        emissiveIntensity: 0.5,
        shininess: 100
    });
    
    const eastBorder = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1, 20),
        eastBorderMaterial
    );
    eastBorder.position.set(10, 0, 0);
    eastBorder.castShadow = true;
    scene.add(eastBorder);
    
    // West border with different color
    const westBorder = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1, 20),
        eastBorderMaterial
    );
    westBorder.position.set(-10, 0, 0);
    westBorder.castShadow = true;
    scene.add(westBorder);
}

// Create snake head with cyberpunk style
function createSnakeHead() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Create custom shader material for the snake head
    const material = new THREE.MeshPhongMaterial({ 
        color: colors.neonBlue,
        emissive: colors.neonBlue,
        emissiveIntensity: 0.5,
        shininess: 100,
        transparent: true,
        opacity: 0.9
    });
    
    const head = new THREE.Mesh(geometry, material);
    head.position.set(0, 0, 0);
    head.castShadow = true;
    
    // Add pulsing animation
    head.userData.pulseEffect = {
        time: 0,
        speed: 2,
        intensity: 0.2
    };
    
    scene.add(head);
    snake.push(head);
}

// Create snake body segment with cyberpunk style
function createSnakeSegment(position) {
    const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    
    // Alternate colors for snake segments
    const isEven = snake.length % 2 === 0;
    const segmentColor = isEven ? colors.neonBlue : colors.neonPink;
    
    const material = new THREE.MeshPhongMaterial({ 
        color: segmentColor,
        emissive: segmentColor,
        emissiveIntensity: 0.3,
        shininess: 80,
        transparent: true,
        opacity: 0.9
    });
    
    const segment = new THREE.Mesh(geometry, material);
    segment.position.copy(position);
    segment.castShadow = true;
    
    // Add glow effect data
    segment.userData.glowEffect = {
        time: Math.random() * 10,
        speed: 1 + Math.random(),
        intensity: 0.1 + Math.random() * 0.1
    };
    
    scene.add(segment);
    return segment;
}

// Create food with cyberpunk style
function createFood() {
    if (food) {
        scene.remove(food);
    }
    
    // Create more interesting food geometry
    const geometry = new THREE.OctahedronGeometry(0.5, 0);
    const material = new THREE.MeshPhongMaterial({ 
        color: colors.neonYellow,
        emissive: colors.neonYellow,
        emissiveIntensity: 0.8,
        shininess: 200,
        transparent: true,
        opacity: 0.9
    });
    
    food = new THREE.Mesh(geometry, material);
    
    // Random position for food within bounds
    let x, z;
    let isValidPosition = false;
    
    while (!isValidPosition) {
        x = Math.floor(Math.random() * 16) - 8;
        z = Math.floor(Math.random() * 16) - 8;
        
        // Check if position is occupied by snake
        isValidPosition = true;
        for (let segment of snake) {
            if (Math.abs(segment.position.x - x) < 1 && Math.abs(segment.position.z - z) < 1) {
                isValidPosition = false;
                break;
            }
        }
    }
    
    food.position.set(x, 0.5, z);
    food.castShadow = true;
    
    // Add floating animation
    food.userData.floatEffect = {
        time: 0,
        speed: 3,
        amplitude: 0.2
    };
    
    scene.add(food);
    
    // Add spotlight to the food for dramatic effect
    const spotlight = new THREE.SpotLight(colors.neonYellow, 1);
    spotlight.position.set(x, 5, z);
    spotlight.target = food;
    spotlight.angle = 0.3;
    spotlight.penumbra = 0.2;
    spotlight.decay = 1;
    spotlight.distance = 10;
    spotlight.castShadow = true;
    scene.add(spotlight);
    
    // Store the spotlight reference in the food object
    food.userData.spotlight = spotlight;
}

// Create cyberpunk lighting
function createLighting() {
    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.5);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    scene.add(mainLight);
    
    // Pink rim light
    const pinkLight = new THREE.DirectionalLight(colors.neonPink, 0.3);
    pinkLight.position.set(-10, 5, -10);
    scene.add(pinkLight);
    
    // Blue rim light
    const blueLight = new THREE.DirectionalLight(colors.neonBlue, 0.3);
    blueLight.position.set(10, 5, -10);
    scene.add(blueLight);
    
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x222233, 0.5);
    scene.add(ambientLight);
    
    // Add fog for depth
    scene.fog = new THREE.FogExp2(0x0a0a12, 0.035);
}

// Camera position and settings
function setupCamera() {
    camera.position.set(0, 20, 20);
    camera.lookAt(0, 0, 0);
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {
    if (isGameOver) return;
    
    if (!gameStarted) {
        gameStarted = true;
        startGame();
        playGlitchEffect();
    }
    
    const key = event.key.toLowerCase();
    keys[key] = true;
    
    const currentTime = performance.now();
    if (currentTime - lastDirectionChange < directionChangeDelay) return;
    
    lastDirectionChange = currentTime;
    
    // Update direction based on key press
    if ((key === 'arrowup' || key === 'w') && direction.z !== 1) {
        nextDirection.set(0, 0, -1);
        playGlitchEffect();
    } else if ((key === 'arrowdown' || key === 's') && direction.z !== -1) {
        nextDirection.set(0, 0, 1);
        playGlitchEffect();
    } else if ((key === 'arrowleft' || key === 'a') && direction.x !== 1) {
        nextDirection.set(-1, 0, 0);
        playGlitchEffect();
    } else if ((key === 'arrowright' || key === 'd') && direction.x !== -1) {
        nextDirection.set(1, 0, 0);
        playGlitchEffect();
    } else if (key === ' ') { // Space bar to pause/resume
        if (gameLoop) {
            cancelAnimationFrame(gameLoop);
            gameLoop = null;
        } else {
            startGame();
        }
        playGlitchEffect();
    }
});

document.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
});

// Play a glitch effect on the screen
function playGlitchEffect() {
    const glitchElement = document.getElementById('glitch-effect');
    glitchElement.style.animation = 'none';
    void glitchElement.offsetWidth; // Trigger reflow
    glitchElement.style.animation = 'glitch 1s';
}

// Game loop
function animate(currentTime) {
    if (isGameOver) return;
    
    gameLoop = requestAnimationFrame(animate);

    // Update food floating animation
    if (food && food.userData.floatEffect) {
        const effect = food.userData.floatEffect;
        effect.time += 0.016; // Assume ~60fps
        food.position.y = 0.5 + Math.sin(effect.time * effect.speed) * effect.amplitude;
        
        // Also update the spotlight
        if (food.userData.spotlight) {
            food.userData.spotlight.position.set(food.position.x, 5, food.position.z);
        }
    }
    
    // Update snake segments glow
    snake.forEach((segment, index) => {
        if (segment.userData.glowEffect) {
            const effect = segment.userData.glowEffect;
            effect.time += 0.016;
            
            if (index === 0 && segment.userData.pulseEffect) {
                // Head pulsing
                const pulseEffect = segment.userData.pulseEffect;
                pulseEffect.time += 0.016;
                const intensity = 0.4 + Math.sin(pulseEffect.time * pulseEffect.speed) * pulseEffect.intensity;
                segment.material.emissiveIntensity = intensity;
            } else {
                // Body segments
                const intensity = 0.2 + Math.sin(effect.time * effect.speed) * effect.intensity;
                segment.material.emissiveIntensity = intensity;
            }
        }
    });

    // Move snake
    if (currentTime - lastMoveTime > gameSpeed * 1000) { // Convert to milliseconds
        // Update direction
        direction.copy(nextDirection);
        
        // Move head
        const head = snake[0];
        const newHead = createSnakeSegment(head.position);
        newHead.position.add(direction);
        
        // Round positions to avoid floating point issues
        newHead.position.x = Math.round(newHead.position.x);
        newHead.position.z = Math.round(newHead.position.z);
        
        // Copy the pulse effect from old head
        newHead.userData.pulseEffect = head.userData.pulseEffect;
        
        snake.unshift(newHead);

        // Check collision with food
        if (newHead.position.distanceTo(food.position) < 1.2) {
            score += 10;
            document.getElementById('score').textContent = score;
            createFood();
            // Make game speed increase more gradual
            gameSpeed = Math.max(0.1, gameSpeed - 0.005);
            playGlitchEffect();
        } else {
            // Remove tail
            const tail = snake.pop();
            
            // Also remove its spotlight if it had one
            if (tail.userData.spotlight) {
                scene.remove(tail.userData.spotlight);
            }
            
            scene.remove(tail);
        }

        // Check collision with walls
        if (Math.abs(newHead.position.x) > 9.5 || Math.abs(newHead.position.z) > 9.5) {
            gameOver();
            return;
        }

        // Check collision with self
        for (let i = 1; i < snake.length; i++) {
            const segment = snake[i];
            if (Math.abs(newHead.position.x - segment.position.x) < 0.5 && 
                Math.abs(newHead.position.z - segment.position.z) < 0.5) {
                gameOver();
                return;
            }
        }

        lastMoveTime = currentTime;
    }

    renderer.render(scene, camera);
}

function startGame() {
    if (gameLoop) return;
    animate(performance.now());
}

function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(gameLoop);
    gameLoop = null;
    
    // Play more dramatic glitch on game over
    for (let i = 0; i < 5; i++) {
        setTimeout(() => playGlitchEffect(), i * 200);
    }
    
    setTimeout(() => {
        alert(`GAME OVER! SCORE: ${score}`);
        // Reset game
        snake.forEach(segment => {
            // Remove any associated spotlights
            if (segment.userData.spotlight) {
                scene.remove(segment.userData.spotlight);
            }
            scene.remove(segment);
        });
        snake = [];
        
        if (food) {
            if (food.userData.spotlight) {
                scene.remove(food.userData.spotlight);
            }
            scene.remove(food);
            food = null;
        }
        
        score = 0;
        gameSpeed = 0.25;
        gameStarted = false;
        isGameOver = false;
        direction.set(1, 0, 0);
        nextDirection.set(1, 0, 0);
        document.getElementById('score').textContent = score;
        
        createSnakeHead();
        createFood();
    }, 1000);
}

// Initialize game
createGround();
createGrid();
createLighting();
setupCamera();
createSnakeHead();
createFood();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}); 