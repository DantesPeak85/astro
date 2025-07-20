// Game Constants
const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;
const ASTEROID_ROTATION_SPEED = 0.002; // radians per frame
const STAR_COUNT = 200;
const JEZRIUM_START = 5;

// Game State
let jezrium = JEZRIUM_START;
let currentShot = 0;
let asteroidThreat = 100; // Percentage
let gamePhase = 'normal'; // 'normal', 'decision', 'win', 'lose', 'hyperjump', 'messageScreen', 'timePortal'
let gameActive = true;

// Data Table (from spec)
const dataTable = [
    { shot: 0, threat: 100, jezrium: 5, marginalUtility: null },
    { shot: 1, threat: 85, jezrium: 4, marginalUtility: 1000 },
    { shot: 2, threat: 67, jezrium: 3, marginalUtility: 200 },
    { shot: 3, threat: 50, jezrium: 2, marginalUtility: 45 },
    { shot: 4, threat: 25, jezrium: 1, marginalUtility: 8 },
    { shot: 5, threat: 5, jezrium: 0, marginalUtility: 2 }
];

// Canvas and Contexts
const mainCanvas = document.getElementById('mainCanvas');
const laserCanvas = document.getElementById('laserCanvas');
const timeVortexCanvas = document.getElementById('timeVortexCanvas');

const mainCtx = mainCanvas.getContext('2d');
const laserCtx = laserCanvas.getContext('2d');
const timeVortexCtx = timeVortexCanvas.getContext('2d');

// UI Elements
const jezriumCrystalsContainer = document.getElementById('jezriumCrystalsContainer');
const threatLevelSpan = document.getElementById('threatLevel');
const fireButton = document.getElementById('fireButton');
const messageDiv = document.getElementById('message');
const messageText = document.getElementById('messageText');
const messageButtons = document.getElementById('messageButtons');
const logGraphMessageDiv = document.getElementById('logGraphMessage');
const logGraphMessageText = document.getElementById('logGraphMessageText');
const logGraphMessageButton = document.getElementById('logGraphMessageButton');
const linearGraphCanvas = document.getElementById('linearGraphCanvas');
const logGraphCanvas = document.getElementById('logGraphCanvas');
const linearGraphCtx = linearGraphCanvas.getContext('2d');
const logGraphCtx = logGraphCanvas.getContext('2d');

// Images
const asteroidImage = new Image();
asteroidImage.src = 'assets/Astroid-Model.png';

const shipHudImage = new Image();
shipHudImage.src = 'assets/Ship-HUD.png';

const outerSpaceImage = new Image();
outerSpaceImage.src = 'assets/outer-space-refrence.png';

// Game Objects
let stars = [];
let asteroid = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 4,
    radius: 100, // Initial radius, scales with threat
    rotation: 0,
    glow: 'rgba(255, 100, 0, 0.5)'
};
let laser = { active: false, x: 0, y: 0, targetX: 0, targetY: 0, progress: 0 };
let explosions = [];

// Hyperjump Animation Variables
let hyperjump = {
    active: false,
    progress: 0,
    duration: 120, // frames
    starSpeedMultiplier: 5,
    starRadiusMultiplier: 3
};

// Time Portal Animation Variables
let timePortal = {
    active: false,
    progress: 0,
    duration: 180, // frames
    particles: []
};

// Image for the message screen
const girlsImage = new Image();
girlsImage.src = 'assets/Girls.svg';

// Utility Functions
function resizeCanvas() {
    mainCanvas.width = GAME_WIDTH;
    mainCanvas.height = GAME_HEIGHT;
    laserCanvas.width = GAME_WIDTH;
    laserCanvas.height = GAME_HEIGHT;
    timeVortexCanvas.width = GAME_WIDTH;
    timeVortexCanvas.height = GAME_HEIGHT;
}

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function initStars() {
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            radius: getRandom(0.5, 1.5),
            alpha: getRandom(0.5, 1),
            twinkleSpeed: getRandom(0.002, 0.01) // Made stars twinkle slower
        });
    }
}

function updateUI() {
    threatLevelSpan.textContent = `${asteroidThreat.toFixed(0)}%`;
    drawJezriumCrystals(); // Draw crystals dynamically
}

const jezriumCrystalImage = new Image();
jezriumCrystalImage.src = 'assets/purple jesarium full.svg';

// Ensure the image is loaded before attempting to draw it
jezriumCrystalImage.onload = () => {
    // Redraw the crystals once the image is loaded
    drawJezriumCrystals();
};

function drawJezriumCrystals() {
    jezriumCrystalsContainer.innerHTML = ''; // Clear existing crystals

    const totalCrystals = dataTable[0].jezrium; // Assuming initial jezrium count is total
    for (let i = 0; i < totalCrystals; i++) {
        const crystalImg = document.createElement('img');
        crystalImg.src = jezriumCrystalImage.src;
        crystalImg.alt = 'Jezrium Crystal';
        if (i >= jezrium) { // If current index is greater than or equal to remaining jezrium
            crystalImg.classList.add('desaturated-crystal');
        }
        jezriumCrystalsContainer.appendChild(crystalImg);
    }
}

function showMessage(text, buttons, imagePath = null, targetDiv = messageDiv, isGameOverImage = false) {
    gameActive = false; // Pause game logic
    
    if (targetDiv === messageDiv) {
        messageText.innerHTML = text; // Changed to innerHTML
        messageButtons.innerHTML = ''; // Clear existing buttons, as they might be embedded in text now

        if (imagePath) {
            const img = document.createElement('img');
            img.src = imagePath;
            if (isGameOverImage) {
                img.style.filter = 'grayscale(100%)'; // Apply grayscale filter only for game over
            } else {
                img.style.filter = 'none'; // Ensure image is in color for initial message
            }
            img.style.maxWidth = '100%'; // Ensure image fits
            img.style.height = 'auto';
            messageButtons.appendChild(img); // Add image above buttons
        }

        // Always iterate through buttons and append them. If text is embedded, the array will be empty.
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.onclick = () => {
                targetDiv.style.display = 'none';
                btn.action(); // This action might change gameActive or gamePhase
                if (gameActive || gamePhase === 'hyperjump' || gamePhase === 'timePortal') {
                    requestAnimationFrame(gameLoop);
                }
            };
            messageButtons.appendChild(button);
        });
    } else if (targetDiv === logGraphMessageDiv) {
        logGraphMessageText.innerHTML = text; // Changed to innerHTML
        logGraphMessageButton.textContent = buttons[0].text;
        logGraphMessageButton.onclick = () => {
            targetDiv.style.display = 'none';
            buttons[0].action();
            if (gameActive || gamePhase === 'hyperjump' || gamePhase === 'timePortal') {
                requestAnimationFrame(gameLoop);
            }
        };
    }
    
    targetDiv.style.display = 'block';
}

// Game Logic
const initialMessageText = `קפטן!<br>
אסטרואיד מתקרב לירח עליו נמצאות סול ו-ונוס! יש ברשותך חמישה גבישי ג'זריום סגולים, כל גביש יכול ליצור קרן לייזר שתסיר חתיכה מהאסטרואיד.  <br>
בתא הפיקוד אפשר לראות את התועלת השולית בגרף קו בעל סולם ליניארי וגרף קו בעל סולם לוגריתמי. <br>
לחצו על LASER, וצפו כיצד משתנים הגרפים והאסטרואיד לאחר כל ירייה. בצד שמאל למעלה מוצגים אחוזי הסכנה לסול וונוס שנמצאות על הכוכב.`;

function initGame() {
    jezrium = JEZRIUM_START;
    currentShot = 0;
    asteroidThreat = 100;
    gamePhase = 'normal';
    gameActive = true;
    asteroid.radius = 100; // Reset asteroid size
    asteroid.rotation = 0; // Reset asteroid rotation
    explosions = []; // Clear any lingering explosions
    messageDiv.style.display = 'none'; // Hide message
    updateUI();
    drawStaticGraph(linearGraphCtx, linearGraphCanvas, false, 0); // Draw only initial point
    drawStaticGraph(logGraphCtx, logGraphCanvas, true, 0); // Draw only initial point
    requestAnimationFrame(gameLoop);
}

function startGame() {
    showMessage(
        initialMessageText,
        [{ text: "כולם לעמדות הפיקוד", action: initGame }],
        'assets/Girls.svg'
    );
}

function fireLaser() {
    if (!gameActive || jezrium <= 0 || currentShot >= dataTable.length - 1) {
        return;
    }

    jezrium--;
    currentShot++;
    updateUI();

    fireButton.disabled = true; // Disable the button
    fireButton.classList.add('desaturated'); // Add desaturation class

    laser.active = true;
    laser.x = 455;
    laser.y = 453;
    laser.targetX = asteroid.x;
    laser.targetY = asteroid.y;
    laser.progress = 0;

    // Update asteroid threat based on dataTable
    const nextShotData = dataTable[currentShot];
    asteroidThreat = nextShotData.threat;

    // Trigger explosion effect after laser hits
    setTimeout(() => {
        asteroid.radius = 100 * (asteroidThreat / 100); // Scale radius proportionally
        explosions.push({
            x: asteroid.x + getRandom(-asteroid.radius / 2, asteroid.radius / 2),
            y: asteroid.y + getRandom(-asteroid.radius / 2, asteroid.radius / 2),
            size: getRandom(20, 50),
            particles: [],
            alpha: 1
        });
    }, 650); // Delay for laser to hit (approx 39 frames * 16.67ms/frame)

    // Animate graph updates
    animateGraphUpdate(linearGraphCtx, linearGraphCanvas, false, currentShot, () => {
        setTimeout(() => {
            animateGraphUpdate(logGraphCtx, logGraphCanvas, true, currentShot, () => {
                // Re-enable and re-saturate the button after log graph animation
                fireButton.disabled = false;
                fireButton.classList.remove('desaturated');

                // Check for decision point or win/lose after both animations
                if (currentShot === 3) {
                    gamePhase = 'decision';
                    highlightLinearGraph(); // Highlight linear graph
                    showMessage(
                        `קפטן!<br><br>
נותרו רק עוד שני גבישי ג'זריום סגול, אנחנו זקוקים להם כדי לטוס חזרה לכדור הארץ! אם נשתמש בהם ולא נשמיד את האסטרואיד, לא נוכל לכרות גבישים נוספים מהירח! עלינו לנסות לצפות מה תהיה האפקטיביות של שתי היריות הבאות.<br><br>
<button id="stayButton">נשארים עד הסוף!</button><p style="font-size: 0.8em; margin-top: 5px;">הגרף הלוגריתמי מראה שהאפקטיביות של כל ירייה נשארת זהה ביחס לקודמתה. בגלל שבכל פעם שאנו פוגעים באסטרואיד גודלו קטן, צריך למדוד את אפקטיביות הירייה ביחס לגודל האסטרואיד עליו נורתה ולא ביחס לגודל הראשוני של האסטרואיד.</p><br>
<button id="goHomeButton">חוזרים הביתה!</button><p style="font-size: 0.8em; margin-top: 5px;">הגרף הליניארי מראה שבכל ירייה התועלת השולית יורדת ולאחר שלושה גבישים גרף הקו כמעט ומתיישר. כלומר, הגבישים הנוספים כמעט ולא ישפיעו (יהיו בעלי תועלת שולית נמוכה).</p>`,
                        [] // No separate buttons array needed, as buttons are now in the text
                    );
                    // Attach event listeners to the newly created buttons within the message
                    document.getElementById('stayButton').onclick = () => {
                        removeGraphHighlights();
                        gamePhase = 'normal';
                        gameActive = true;
                        messageDiv.style.display = 'none';
                    };
                    document.getElementById('goHomeButton').onclick = () => {
                        removeGraphHighlights();
                        endGame('lose');
                        messageDiv.style.display = 'none';
                    };
                }
                else if (currentShot === 5) {
                    gamePhase = 'win';
                    endGame('win');
                }
            });
        }, 1000); // Wait 1 second before animating log graph
    });
}

function endGame(result) {
    gameActive = false;
    if (result === 'win') {
        showMessage(
            "האסטרואיד כבר לא מהווה סכנה! הצלחנו! כורי הג'זריום על הכוכב מודים לנו וכורים עבורנו חמישה גבישים נוספים!",
            [{ text: "התחל מחדש", action: startGame }]
        );
    } else {
        // Lose scenario (return home early) - initiate hyperjump
        gamePhase = 'hyperjump';
        initHyperjumpAnimation();
    }
}

function initHyperjumpAnimation() {
    hyperjump.active = true;
    hyperjump.progress = 0;
    // Reset stars for hyperjump effect
    stars = [];
    initStars();
}

function drawHyperjumpAnimation() {
    if (!hyperjump.active) return;

    mainCtx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // No background image during hyperjump, just stars

    hyperjump.progress++;

    // Animate stars for hyperjump effect
    stars.forEach(star => {
        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;

        const dx = star.x - centerX;
        const dy = star.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Move stars outwards
        star.x += dx * (hyperjump.starSpeedMultiplier * (hyperjump.progress / hyperjump.duration));
        star.y += dy * (hyperjump.starSpeedMultiplier * (hyperjump.progress / hyperjump.duration));

        // Increase radius and fade out
        star.radius += hyperjump.starRadiusMultiplier * (hyperjump.progress / hyperjump.duration);
        star.alpha = 1 - (hyperjump.progress / hyperjump.duration);

        // Draw star
        mainCtx.beginPath();
        mainCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        mainCtx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        mainCtx.fill();
    });

    // Remove stars that are off-screen
    stars = stars.filter(star =>
        star.x > -star.radius && star.x < GAME_WIDTH + star.radius &&
        star.y > -star.radius && star.y < GAME_HEIGHT + star.radius
    );

    // Add new stars to maintain density
    while (stars.length < STAR_COUNT) {
        stars.push({
            x: getRandom(GAME_WIDTH * 0.4, GAME_WIDTH * 0.6), // Spawn near center
            y: getRandom(GAME_HEIGHT * 0.4, GAME_HEIGHT * 0.6),
            radius: getRandom(0.5, 1.5),
            alpha: getRandom(0.5, 1),
            twinkleSpeed: getRandom(0.01, 0.05)
        });
    }

    if (hyperjump.progress >= hyperjump.duration) {
        hyperjump.active = false;
        gamePhase = 'messageScreen'; // Transition to message screen
        // Re-initialize stars for the black background with twinkling stars
        stars = [];
        initStars();
        showMessage(
            "לא הצלחת להציל את ונוס ו-סול. כדור הארץ מאוכזב מאוד ושולח אותך לטאטא אבק על הירח",
            [{ text: "חזור בזמן ונסה שוב", action: () => { gamePhase = 'timePortal'; initTimePortalAnimation(); } }],
            'assets/Girls.svg', // Pass image path
            messageDiv,
            true // Set isGameOverImage to true
        );
    }
}

function initTimePortalAnimation() {
    timePortal.active = true;
    timePortal.progress = 0;
    timePortal.particles = [];
    // Initialize particles for the time portal
    for (let i = 0; i < 100; i++) {
        timePortal.particles.push({
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            radius: getRandom(2, 5),
            color: `rgba(${getRandom(100, 255)}, ${getRandom(100, 255)}, ${getRandom(100, 255)}, 1)`,
            angle: Math.random() * Math.PI * 2,
            speed: getRandom(1, 5),
            alpha: 1
        });
    }
}

function drawTimePortalAnimation() {
    if (!timePortal.active) return;

    mainCtx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawBackground(); // Draw stars and space

    timePortal.progress++;

    // Draw time portal effect
    timePortal.particles.forEach(p => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.radius *= 1.02; // Expand
        p.alpha -= 0.005; // Fade out

        mainCtx.beginPath();
        mainCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        mainCtx.fillStyle = p.color.replace('1)', p.alpha + ')'); // Update alpha
        mainCtx.fill();
    });

    // Remove faded particles
    timePortal.particles = timePortal.particles.filter(p => p.alpha > 0);

    // Add new particles to maintain effect
    while (timePortal.particles.length < 100 && timePortal.progress < timePortal.duration * 0.8) {
        timePortal.particles.push({
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            radius: getRandom(2, 5),
            color: `rgba(${getRandom(100, 255)}, ${getRandom(100, 255)}, ${getRandom(100, 255)}, 1)`,
            angle: Math.random() * Math.PI * 2,
            speed: getRandom(1, 5),
            alpha: 1
        });
    }

    if (timePortal.progress >= timePortal.duration) {
        timePortal.active = false;
        // Reset game to decision point (shot 3)
        jezrium = dataTable[3].jezrium;
        currentShot = 3;
        asteroidThreat = dataTable[3].threat;
        gamePhase = 'decision';
        gameActive = true; // Ensure game is active to allow interaction
        asteroid.radius = 100 * (dataTable[currentShot].threat / 100); // Reset asteroid size to its size at x=3
        asteroid.rotation = 0;
        explosions = []; // Clear all particles
        messageDiv.style.display = 'none';
        updateUI();
        drawStaticGraph(linearGraphCtx, linearGraphCanvas, false, currentShot);
        drawStaticGraph(logGraphCtx, logGraphCanvas, true, currentShot);
        highlightLogarithmicGraph(); // Highlight the log graph as it's the decision point
        // Restore original stars for normal background
        stars = [];
        initStars();
    }
}

// Drawing Functions
function drawBackground() {
    mainCtx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (gamePhase === 'messageScreen') {
        // Draw black background with twinkling stars
        mainCtx.fillStyle = 'black';
        mainCtx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        stars.forEach(star => {
            star.alpha = Math.abs(Math.sin(Date.now() * star.twinkleSpeed));
            mainCtx.beginPath();
            mainCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            mainCtx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            mainCtx.fill();
        });
    } else {
        // Draw original outer space image
    mainCtx.drawImage(outerSpaceImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Twinkling stars for normal background
    stars.forEach(star => {
        star.alpha = Math.abs(Math.sin(Date.now() * star.twinkleSpeed));
        mainCtx.beginPath();
        mainCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        mainCtx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        mainCtx.fill();
    });
    }
}

function drawAsteroid() {
    mainCtx.save();
    mainCtx.translate(asteroid.x, asteroid.y);
    asteroid.rotation += ASTEROID_ROTATION_SPEED;
    mainCtx.rotate(asteroid.rotation);

    // Asteroid glow (orange-red) - Draw first to be behind
    const glowGradient = mainCtx.createRadialGradient(
        0, 0, asteroid.radius * 0.5,
        0, 0, asteroid.radius * 1.2
    );
    glowGradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
    glowGradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.4)');
    glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

    mainCtx.fillStyle = glowGradient;
    mainCtx.beginPath();
    mainCtx.arc(0, 0, asteroid.radius * 1.2, 0, Math.PI * 2);
    mainCtx.fill();

    // Draw asteroid image on top of the glow
    mainCtx.drawImage(
        asteroidImage,
        -asteroid.radius,
        -asteroid.radius,
        asteroid.radius * 2,
        asteroid.radius * 2
    );

    mainCtx.restore();
}

function drawLaser() {
    laserCtx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    if (laser.active) {
        laser.progress += 0.026; // Speed of laser (approx 1 second for 60 frames)
        const currentY = laser.y - (laser.y - laser.targetY) * laser.progress;
        const currentX = laser.x - (laser.x - laser.targetX) * laser.progress;

        // Laser beam (purple-red with white core)
        // Laser beam (purple-red with white core and glow)
        laserCtx.beginPath();
        laserCtx.moveTo(laser.x, laser.y);
        laserCtx.lineTo(currentX, currentY);
        laserCtx.lineWidth = 20; // Further increased width for more impact
        laserCtx.strokeStyle = 'rgba(255, 0, 255, 0.9)'; // Purple-red, slightly more opaque
        laserCtx.shadowBlur = 45; // Even stronger glow
        laserCtx.shadowColor = 'rgba(255, 0, 255, 1)';
        laserCtx.stroke();

        // Laser particles
        for (let i = 0; i < 10; i++) { // Increased number of particles per frame
            const particleX = laser.x + (currentX - laser.x) * Math.random();
            const particleY = laser.y + (currentY - laser.y) * Math.random();
            const particleSize = getRandom(1, 5); // Wider range of particle sizes
            const particleColor = `rgba(255, ${getRandom(100, 255)}, 255, ${getRandom(0.6, 1)})`; // More varied and opaque colors
            laserCtx.beginPath();
            laserCtx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
            laserCtx.fillStyle = particleColor;
            laserCtx.fill();
        }

        laserCtx.beginPath();
        laserCtx.moveTo(laser.x, laser.y);
        laserCtx.lineTo(currentX, currentY);
        laserCtx.lineWidth = 8; // Increased width for core
        laserCtx.strokeStyle = 'rgba(255, 255, 255, 1)'; // White core
        laserCtx.shadowBlur = 0; // Reset shadow for core
        laserCtx.stroke();

        // Subtle origin flash
        const flashRadius = 10 + (1 - laser.progress) * 20; // Larger at start, shrinks
        const flashAlpha = (1 - laser.progress) * 0.8; // Fades out
        laserCtx.beginPath();
        laserCtx.arc(laser.x, laser.y, flashRadius, 0, Math.PI * 2);
        laserCtx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        laserCtx.shadowBlur = 20;
        laserCtx.shadowColor = 'rgba(255, 255, 255, 1)';
        laserCtx.fill();
        laserCtx.shadowBlur = 0;

        if (laser.progress >= 1) {
            laser.active = false;
        }
    }
}

function drawExplosions() {
    explosions.forEach((explosion, index) => {
        if (explosion.alpha > 0) {
            explosion.alpha -= 0.02; // Fade out
            explosion.size += 1; // Expand

            // Particle system for explosion
            if (explosion.particles.length === 0) {
                // Initial flash effect
                mainCtx.fillStyle = `rgba(255, 165, 0, ${explosion.alpha * 0.8})`; // Orange flash
                mainCtx.beginPath();
                mainCtx.arc(explosion.x, explosion.y, explosion.size * 1.5, 0, Math.PI * 2);
                mainCtx.fill();

                for (let i = 0; i < 50; i++) { // Increased number of particles
                    const angle = Math.random() * Math.PI * 2;
                    const speed = getRandom(1, 7); // Varied speed
                    explosion.particles.push({
                        x: explosion.x,
                        y: explosion.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        color: `rgba(${getRandom(200, 255)}, ${getRandom(50, 200)}, ${getRandom(0, 50)}, 1)`, // Fiery colors
                        size: getRandom(3, 8), // Varied size
                        life: 60 // Particle lifespan
                    });
                }
            }

            explosion.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.size *= 0.98; // Shrink over time
                p.life--;
                p.color = p.color.replace(/[^,]+(?=\))/, (p.life / 60).toFixed(2)); // Fade out

                if (p.life > 0 && p.size > 0.5) {
                    mainCtx.beginPath();
                    mainCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    mainCtx.fillStyle = p.color;
                    mainCtx.fill();
                }
            });

            // Remove dead particles
            explosion.particles = explosion.particles.filter(p => p.life > 0 && p.size > 0.5);

        } else {
            explosions.splice(index, 1); // Remove faded explosions
        }
    });
}

// Graph Drawing Functions
const GRAPH_PADDING = 30; // Increased padding for axis titles
const DOT_RADIUS = 3;
const LINE_COLOR = '#9a41e8';
const HIGHLIGHT_COLOR = '#f185cf';
const GLOW_COLOR = '#9a41e8'; // For dot glow
const POINT_GLOW_COLOR = 'rgba(154, 65, 232, 1)'; // A more intense glow color for points

function getGraphDimensions(canvas) {
    const graphWidth = canvas.width - 2 * GRAPH_PADDING;
    const graphHeight = canvas.height - 2 * GRAPH_PADDING;
    return { graphWidth, graphHeight };
}

function getGraphCoordinates(index, data, isLogarithmic, graphWidth, graphHeight) {
    const maxMarginalUtility = 1000;
    const maxThreat = 100;
    const maxLogMarginalUtility = Math.log10(1000);

    const x = GRAPH_PADDING + (index / (dataTable.length - 1)) * graphWidth;
    let y;

    if (index === 0) {
        if (isLogarithmic) {
            const initialLogThreat = Math.log10(maxThreat);
            y = GRAPH_PADDING + graphHeight - (initialLogThreat / maxLogMarginalUtility) * graphHeight;
        } else {
            y = GRAPH_PADDING + graphHeight - (maxThreat / maxThreat) * graphHeight;
        }
    } else {
        if (isLogarithmic) {
            let logMarginalUtility = data.marginalUtility > 0 ? Math.log10(data.marginalUtility) : 0;
            y = GRAPH_PADDING + graphHeight - (logMarginalUtility / maxLogMarginalUtility) * graphHeight;
        } else {
            y = GRAPH_PADDING + graphHeight - (data.marginalUtility / maxMarginalUtility) * graphHeight;
        }
    }
    return { x, y };
}

function drawGraphBackground(ctx, canvas, isLogarithmic = false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
    ctx.strokeStyle = '#584a51'; // Grid line color
    ctx.lineWidth = 0.5;
    ctx.font = '10px Arial';
    ctx.fillStyle = '#d1d2da';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const { graphWidth, graphHeight } = getGraphDimensions(canvas);

    // Y-axis labels and horizontal grid lines
    const yLabels = isLogarithmic ? [1, 10, 100, 1000] : [0, 250, 500, 750, 1000];
    const maxVal = isLogarithmic ? Math.log10(1000) : 1000;

    yLabels.forEach(label => {
        const yValue = isLogarithmic ? Math.log10(label) : label;
        const y = GRAPH_PADDING + graphHeight - (yValue / maxVal) * graphHeight;

        ctx.beginPath();
        ctx.moveTo(GRAPH_PADDING, y);
        ctx.lineTo(graphWidth + GRAPH_PADDING, y);
        ctx.stroke();

        ctx.fillText(label.toString(), GRAPH_PADDING - 10, y); // Adjusted X position for Y-axis labels
    });

    // X-axis labels and vertical grid lines
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < dataTable.length; i++) {
        const x = GRAPH_PADDING + (i / (dataTable.length - 1)) * graphWidth;
        
        ctx.beginPath();
        ctx.moveTo(x, GRAPH_PADDING);
        ctx.lineTo(x, graphHeight + GRAPH_PADDING);
        ctx.stroke();

        ctx.fillText(i.toString(), x, graphHeight + GRAPH_PADDING + 10); // Adjusted Y position for X-axis labels
    }

    // Draw main axes (thicker)
    ctx.strokeStyle = '#d1d2da';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GRAPH_PADDING, GRAPH_PADDING);
    ctx.lineTo(GRAPH_PADDING, graphHeight + GRAPH_PADDING);
    ctx.lineTo(graphWidth + GRAPH_PADDING, graphHeight + GRAPH_PADDING);
    ctx.stroke();
}

function drawStaticGraph(ctx, canvas, isLogarithmic, maxShotIndex) {
    drawGraphBackground(ctx, canvas, isLogarithmic);

    const { graphWidth, graphHeight } = getGraphDimensions(canvas);

    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i <= maxShotIndex; i++) {
        const data = dataTable[i];
        const { x, y } = getGraphCoordinates(i, data, isLogarithmic, graphWidth, graphHeight);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke(); // Draw the line

    // Draw dots on top of the line
    for (let i = 0; i <= maxShotIndex; i++) {
        const data = dataTable[i];
        const { x, y } = getGraphCoordinates(i, data, isLogarithmic, graphWidth, graphHeight);
        ctx.beginPath();
        ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = LINE_COLOR;
        ctx.fill();
    }
}

function animateGraphUpdate(ctx, canvas, isLogarithmic, shotIndex, callback) {
    if (shotIndex === 0) { // No animation for the first point
        drawStaticGraph(ctx, canvas, isLogarithmic, shotIndex);
        if (callback) callback();
        return;
    }

    const { graphWidth, graphHeight } = getGraphDimensions(canvas);
    const prevData = dataTable[shotIndex - 1];
    const currentData = dataTable[shotIndex];

    const { x: x1, y: y1 } = getGraphCoordinates(shotIndex - 1, prevData, isLogarithmic, graphWidth, graphHeight);
    const { x: x2, y: y2 } = getGraphCoordinates(shotIndex, currentData, isLogarithmic, graphWidth, graphHeight);

    let animationProgress = 0;
    const animationDuration = 60; // frames

    function animate() {
        animationProgress++;

        // Redraw static part of the graph
        drawStaticGraph(ctx, canvas, isLogarithmic, shotIndex - 1);

        // Animate line segment
        const currentLineX = x1 + (x2 - x1) * (animationProgress / animationDuration);
        const currentLineY = y1 + (y2 - y1) * (animationProgress / animationDuration);

        ctx.strokeStyle = LINE_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(currentLineX, currentLineY);
        ctx.stroke();

        // Animate dot fade-in and glow
        if (animationProgress >= animationDuration) {
            // Draw final dot with glow
            ctx.beginPath();
            ctx.arc(x2, y2, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = LINE_COLOR;
            ctx.shadowBlur = 25; // Increased glow strength
            ctx.shadowColor = POINT_GLOW_COLOR; // More eye-catching glow color
            ctx.fill();
            ctx.shadowBlur = 0; // Reset shadow

            if (callback) callback();
        } else {
            // Draw dot with increasing opacity and glow
            const alpha = animationProgress / animationDuration;
            const glowStrength = 25 * alpha; // Increased glow strength during animation

            ctx.beginPath();
            ctx.arc(x2, y2, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(154, 65, 232, ${alpha})`; // LINE_COLOR with alpha
            ctx.shadowBlur = glowStrength;
            ctx.shadowColor = POINT_GLOW_COLOR; // More eye-catching glow color
            ctx.fill();
            ctx.shadowBlur = 0; // Reset shadow for next draw
            requestAnimationFrame(animate);
        }
    }
    requestAnimationFrame(animate);
}

// Highlight Logarithmic Graph if needed (this function is now separate)
function highlightLinearGraph() {
    document.getElementById('linearGraphContainer').classList.add('graph-glow');
}

function removeGraphHighlights() {
    document.getElementById('linearGraphContainer').classList.remove('graph-glow');
    document.getElementById('logGraphContainer').classList.remove('graph-glow'); // Ensure log graph highlight is also removed
}

function highlightLogarithmicGraph() {
    document.getElementById('logGraphContainer').classList.add('graph-glow');
}

// Game Loop
function gameLoop() {
    if (gamePhase === 'hyperjump') {
        drawHyperjumpAnimation();
    } else if (gamePhase === 'timePortal') {
        drawTimePortalAnimation();
    } else {
        drawBackground();
        drawAsteroid();
        drawExplosions();
        drawLaser(); // Laser is drawn on its own canvas
    }

    // Draw Ship HUD (always on top)
    mainCtx.drawImage(shipHudImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Keep loop active during normal play, animation, or decision phase
    if (gameActive || gamePhase === 'hyperjump' || gamePhase === 'timePortal' || gamePhase === 'decision' || gamePhase === 'messageScreen') {
        requestAnimationFrame(gameLoop);
    }
}

// Event Listeners
fireButton.addEventListener('click', fireLaser);

// Initialization
resizeCanvas();
initStars();
startGame(); // Start the game when the script loads
