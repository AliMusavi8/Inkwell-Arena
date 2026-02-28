import { useState, useEffect, useRef } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import { useWebSocket } from '../context/WebSocketContext';
import { apiCompleteChallenge } from '../api';
import './ChickenRunner.css';

interface ChickenRunnerProps {
    challengeId: number;
    currentUserId: number;
    currentUsername: string;
    opponentId: number;
    opponentUsername: string;
    isChallenger: boolean;
    onComplete: (winnerId: number | null) => void;
    cpuMode?: boolean;
}

// ── Game constants ──
const CANVAS_W = 700;
const CANVAS_H = 260;
const GROUND_Y = CANVAS_H - 35;
const GRAVITY = 0.8;
const JUMP_FORCE = -14;
const INITIAL_SPEED = 6;
const SPEED_INCREMENT = 0.005;
const MIN_OBSTACLE_GAP = 60;
const CHICKEN_W = 45;
const CHICKEN_H = 45;
const CHICKEN_DUCK_H = 28;

type GamePhase = 'waiting' | 'countdown' | 'playing' | 'dead' | 'result';

interface Obstacle {
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'cactus-small' | 'cactus-tall' | 'cactus-cluster';
}

interface GameState {
    chickenY: number;
    velocityY: number;
    isJumping: boolean;
    isDucking: boolean;
    speed: number;
    obstacles: Obstacle[];
    frameCount: number;
    score: number;
    dead: boolean;
    groundOffset: number;
    lastObstacleFrame: number;
    runFrame: number;
}

function createGameState(): GameState {
    return {
        chickenY: GROUND_Y - CHICKEN_H,
        velocityY: 0,
        isJumping: false,
        isDucking: false,
        speed: INITIAL_SPEED,
        obstacles: [],
        frameCount: 0,
        score: 0,
        dead: false,
        groundOffset: 0,
        lastObstacleFrame: 0,
        runFrame: 0,
    };
}

export default function ChickenRunner({
    challengeId,
    currentUserId,
    currentUsername,
    opponentId,
    opponentUsername,
    onComplete,
    cpuMode = false,
}: ChickenRunnerProps) {
    const { sendMessage, lastMessage } = useWebSocket();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const oppCanvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const cpuDeathTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const [phase, setPhase] = useState<GamePhase>('waiting');
    const [countdown, setCountdown] = useState(5);
    const [score, setScore] = useState(0);
    const [opponentAlive, setOpponentAlive] = useState(true);
    const [opponentScore, setOpponentScore] = useState(0);
    const [winnerId, setWinnerId] = useState<number | null>(null);
    const [iAmReady, setIAmReady] = useState(false);
    const [opponentReady, setOpponentReady] = useState(false);
    const [gameOverReported, setGameOverReported] = useState(false);

    // Player game state
    const gameRef = useRef<GameState>(createGameState());
    // CPU/Opponent game state (separate simulation)
    const cpuGameRef = useRef<GameState>(createGameState());

    // Sprite refs
    const spritesRef = useRef<{
        run1: HTMLImageElement | null;
        run2: HTMLImageElement | null;
        jump: HTMLImageElement | null;
        duck: HTMLImageElement | null;
        cactusSmall: HTMLImageElement | null;
        cactusTall: HTMLImageElement | null;
        cactusCluster: HTMLImageElement | null;
    }>({ run1: null, run2: null, jump: null, duck: null, cactusSmall: null, cactusTall: null, cactusCluster: null });

    // Load sprites
    useEffect(() => {
        const loadImg = (src: string): Promise<HTMLImageElement> =>
            new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(img);
                img.src = src;
            });

        Promise.all([
            loadImg('/sprites/chicken-run1.png'),
            loadImg('/sprites/chicken-run2.png'),
            loadImg('/sprites/chicken-jump.png'),
            loadImg('/sprites/chicken-duck.png'),
            loadImg('/sprites/cactus-small.png'),
            loadImg('/sprites/cactus-tall.png'),
            loadImg('/sprites/cactus-cluster.png'),
        ]).then(([run1, run2, jump, duck, cactusSmall, cactusTall, cactusCluster]) => {
            spritesRef.current = { run1, run2, jump, duck, cactusSmall, cactusTall, cactusCluster };
        });
    }, []);

    // ── WebSocket: send ready (skip in CPU mode) ──
    useEffect(() => {
        if (cpuMode) {
            setIAmReady(true);
            setOpponentReady(true);
            return;
        }
        if (iAmReady) return;
        setIAmReady(true);
        sendMessage({
            type: 'runner_ready',
            opponent_id: opponentId,
            challenge_id: challengeId,
        });
    }, []);

    // ── WebSocket: listen for messages (skip in CPU mode) ──
    useEffect(() => {
        if (cpuMode) return;
        if (!lastMessage) return;
        if (lastMessage.challenge_id !== challengeId) return;

        if (lastMessage.type === 'runner_ready' && lastMessage.from_user_id === opponentId) {
            setOpponentReady(true);
        } else if (lastMessage.type === 'runner_dead' && lastMessage.from_user_id === opponentId) {
            setOpponentAlive(false);
            setOpponentScore(lastMessage.score || 0);
            // Kill the opponent simulation so their canvas shows death
            cpuGameRef.current.dead = true;
            cpuGameRef.current.score = lastMessage.score || 0;
        }
    }, [lastMessage, challengeId, opponentId, cpuMode]);

    // ── Both ready → start countdown ──
    useEffect(() => {
        if (iAmReady && opponentReady && phase === 'waiting') {
            setPhase('countdown');
        }
    }, [iAmReady, opponentReady, phase]);

    // ── Countdown timer ──
    useEffect(() => {
        if (phase !== 'countdown') return;
        if (countdown <= 0) {
            setPhase('playing');
            return;
        }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [phase, countdown]);

    // ── Keyboard controls ──
    useEffect(() => {
        if (phase !== 'playing') return;
        const game = gameRef.current;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (game.dead) return;
            if ((e.code === 'ArrowUp' || e.code === 'Space') && !game.isJumping) {
                e.preventDefault();
                game.velocityY = JUMP_FORCE;
                game.isJumping = true;
                game.isDucking = false;
            }
            if (e.code === 'ArrowDown') {
                e.preventDefault();
                if (!game.isJumping) {
                    game.isDucking = true;
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'ArrowDown') {
                game.isDucking = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [phase]);

    // ── Shared drawing functions ──
    function spawnObstacle(game: GameState) {
        const types: Obstacle['type'][] = ['cactus-small', 'cactus-tall', 'cactus-cluster'];
        const type = types[Math.floor(Math.random() * types.length)];
        let w = 30, h = 50;
        if (type === 'cactus-small') { w = 25; h = 40; }
        if (type === 'cactus-tall') { w = 25; h = 60; }
        if (type === 'cactus-cluster') { w = 50; h = 35; }

        game.obstacles.push({
            x: CANVAS_W + 10,
            y: GROUND_Y - h,
            w, h, type,
        });
    }

    function checkCollision(game: GameState): boolean {
        const chickenH = game.isDucking ? CHICKEN_DUCK_H : CHICKEN_H;
        const chickenY = game.isDucking ? GROUND_Y - CHICKEN_DUCK_H : game.chickenY;
        const cx = 60 + 8;
        const cy = chickenY + 8;
        const cw = CHICKEN_W - 16;
        const ch = chickenH - 12;

        for (const obs of game.obstacles) {
            if (
                cx < obs.x + obs.w &&
                cx + cw > obs.x &&
                cy < obs.y + obs.h &&
                cy + ch > obs.y
            ) {
                return true;
            }
        }
        return false;
    }

    function drawGround(ctx: CanvasRenderingContext2D, game: GameState) {
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(CANVAS_W, GROUND_Y);
        ctx.stroke();

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        const spacing = 20;
        for (let x = -game.groundOffset % spacing; x < CANVAS_W; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, GROUND_Y + 8);
            ctx.lineTo(x + 8, GROUND_Y + 8);
            ctx.stroke();
        }
    }

    function drawChicken(ctx: CanvasRenderingContext2D, game: GameState, sprites: typeof spritesRef.current) {
        const chickenX = 60;

        if (game.dead) {
            // Draw dead chicken (red tint)
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(chickenX, game.chickenY, CHICKEN_W, CHICKEN_H);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ff3333';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('💀', chickenX + CHICKEN_W / 2, game.chickenY + CHICKEN_H / 2 + 7);
            return;
        }

        if (game.isJumping && sprites.jump) {
            ctx.drawImage(sprites.jump, chickenX, game.chickenY, CHICKEN_W, CHICKEN_H);
        } else if (game.isDucking && sprites.duck) {
            ctx.drawImage(sprites.duck, chickenX, GROUND_Y - CHICKEN_DUCK_H, CHICKEN_W, CHICKEN_DUCK_H);
        } else if (sprites.run1 && sprites.run2) {
            const useFrame2 = Math.floor(game.runFrame / 8) % 2 === 1;
            const runSprite = useFrame2 ? sprites.run2 : sprites.run1;
            ctx.drawImage(runSprite, chickenX, game.chickenY, CHICKEN_W, CHICKEN_H);
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(chickenX, game.chickenY, CHICKEN_W, CHICKEN_H);
        }
    }

    function drawObstacles(ctx: CanvasRenderingContext2D, game: GameState, sprites: typeof spritesRef.current) {
        for (const obs of game.obstacles) {
            let sprite: HTMLImageElement | null = null;
            if (obs.type === 'cactus-small') sprite = sprites.cactusSmall;
            else if (obs.type === 'cactus-tall') sprite = sprites.cactusTall;
            else sprite = sprites.cactusCluster;

            if (sprite) {
                ctx.drawImage(sprite, obs.x, obs.y, obs.w, obs.h);
            } else {
                ctx.fillStyle = '#228B22';
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            }
        }
    }

    function drawScene(ctx: CanvasRenderingContext2D, game: GameState) {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#16213e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const sprites = spritesRef.current;
        drawGround(ctx, game);
        drawObstacles(ctx, game, sprites);
        drawChicken(ctx, game, sprites);

        // Score on canvas
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Score: ${game.score}`, CANVAS_W - 15, 25);

        // Speed indicator
        ctx.fillStyle = '#aaa';
        ctx.font = '11px monospace';
        ctx.fillText(`Speed: ${game.speed.toFixed(1)}`, CANVAS_W - 15, 42);
    }

    function updateGame(game: GameState): boolean {
        if (game.dead) return false;

        game.frameCount++;
        game.runFrame++;

        // Increase speed
        game.speed = INITIAL_SPEED + game.frameCount * SPEED_INCREMENT;

        // Physics
        if (game.isJumping) {
            game.velocityY += GRAVITY;
            game.chickenY += game.velocityY;
            if (game.chickenY >= GROUND_Y - CHICKEN_H) {
                game.chickenY = GROUND_Y - CHICKEN_H;
                game.isJumping = false;
                game.velocityY = 0;
            }
        }

        // Obstacle spawning
        const gap = Math.max(20, MIN_OBSTACLE_GAP - game.frameCount * 0.03);
        if (game.frameCount - game.lastObstacleFrame > gap) {
            if (Math.random() < 0.4 + game.frameCount * 0.001) {
                spawnObstacle(game);
                game.lastObstacleFrame = game.frameCount;
            }
        }

        // Move obstacles
        for (const obs of game.obstacles) {
            obs.x -= game.speed;
        }
        game.obstacles = game.obstacles.filter(o => o.x + o.w > -10);

        // Ground scroll
        game.groundOffset += game.speed;

        // Collision
        if (checkCollision(game)) {
            game.dead = true;
            game.score = Math.floor(game.frameCount / 5);
            return true; // died
        }

        // Score
        game.score = Math.floor(game.frameCount / 5);
        return false;
    }

    // ── CPU AI: jump/duck decisions ──
    function updateCPUInput(game: GameState) {
        if (game.dead) return;

        // Look ahead for obstacles
        for (const obs of game.obstacles) {
            const dist = obs.x - 60; // distance to chicken
            if (dist > 0 && dist < 150) {
                // Tall obstacle on the ground → jump
                if (obs.type === 'cactus-tall' || obs.type === 'cactus-small') {
                    if (!game.isJumping && dist < 120) {
                        game.velocityY = JUMP_FORCE;
                        game.isJumping = true;
                        game.isDucking = false;
                    }
                }
                // Cluster → jump
                if (obs.type === 'cactus-cluster') {
                    if (!game.isJumping && dist < 100) {
                        game.velocityY = JUMP_FORCE;
                        game.isJumping = true;
                        game.isDucking = false;
                    }
                }
                break; // only react to nearest obstacle
            }
        }

        // Occasionally make mistakes (miss jumps) — ~5% chance of not reacting
        if (Math.random() < 0.0008) {
            // Do nothing, simulating a mistake
        }
    }

    // ── Main game loop ──
    useEffect(() => {
        if (phase !== 'playing') return;

        const canvas = canvasRef.current;
        const oppCanvas = oppCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const oppCtx = oppCanvas?.getContext('2d') || null;

        const game = gameRef.current;
        const cpuGame = cpuGameRef.current;

        // Reset player game state
        Object.assign(game, createGameState());
        // Reset CPU/opponent game state
        Object.assign(cpuGame, createGameState());

        function gameLoop() {
            if (!ctx) return;

            // Update player
            const playerDied = updateGame(game);
            if (playerDied) {
                setScore(game.score);
                setPhase('dead');
            } else {
                setScore(game.score);
            }

            // Update opponent simulation (both CPU and multiplayer)
            if (!cpuGame.dead) {
                updateCPUInput(cpuGame);
                const cpuDied = updateGame(cpuGame);
                if (cpuDied && cpuMode) {
                    setOpponentAlive(false);
                    setOpponentScore(cpuGame.score);
                }
            }

            // Draw player canvas
            drawScene(ctx, game);

            // Draw opponent canvas (always)
            if (oppCtx) {
                drawScene(oppCtx, cpuGame);
            }

            if (!game.dead) {
                animFrameRef.current = requestAnimationFrame(gameLoop);
            }
        }

        animFrameRef.current = requestAnimationFrame(gameLoop);

        // Send score updates periodically (multiplayer only)
        let scoreInterval: ReturnType<typeof setInterval> | undefined;
        if (!cpuMode) {
            scoreInterval = setInterval(() => {
                if (!game.dead) {
                    sendMessage({
                        type: 'runner_score',
                        opponent_id: opponentId,
                        score: game.score,
                        challenge_id: challengeId,
                    });
                }
            }, 500);
        }

        return () => {
            cancelAnimationFrame(animFrameRef.current);
            if (scoreInterval) clearInterval(scoreInterval);
            if (cpuDeathTimer.current) clearTimeout(cpuDeathTimer.current);
        };
    }, [phase, challengeId, opponentId, sendMessage, cpuMode]);

    // ── When I die → notify opponent (skip in CPU mode) ──
    useEffect(() => {
        if (phase !== 'dead') return;
        if (!cpuMode) {
            sendMessage({
                type: 'runner_dead',
                opponent_id: opponentId,
                score: score,
                challenge_id: challengeId,
            });
        }
    }, [phase]);

    // ── Determine winner when both are done ──
    useEffect(() => {
        if (gameOverReported) return;

        if (phase === 'dead' && !opponentAlive) {
            let winner: number | null = null;
            if (score > opponentScore) winner = currentUserId;
            else if (opponentScore > score) winner = opponentId;

            setWinnerId(winner);
            setPhase('result');
            setGameOverReported(true);
            if (!cpuMode) {
                apiCompleteChallenge(challengeId, winner || 0).catch(() => { });
                sendMessage({
                    type: 'game_over',
                    opponent_id: opponentId,
                    winner_id: winner,
                    challenge_id: challengeId,
                });
            }
        } else if (phase === 'dead' && opponentAlive) {
            setWinnerId(opponentId);
            setPhase('result');
            setGameOverReported(true);
            if (!cpuMode) {
                apiCompleteChallenge(challengeId, opponentId).catch(() => { });
                sendMessage({
                    type: 'game_over',
                    opponent_id: opponentId,
                    winner_id: opponentId,
                    challenge_id: challengeId,
                });
            }
        }
    }, [phase, opponentAlive]);

    // ── Opponent died while I'm still playing → I win ──
    useEffect(() => {
        if (gameOverReported) return;
        if (!opponentAlive && phase === 'playing') {
            const game = gameRef.current;
            game.dead = true;
            cancelAnimationFrame(animFrameRef.current);
            setWinnerId(currentUserId);
            setPhase('result');
            setGameOverReported(true);
            if (!cpuMode) {
                apiCompleteChallenge(challengeId, currentUserId).catch(() => { });
                sendMessage({
                    type: 'game_over',
                    opponent_id: opponentId,
                    winner_id: currentUserId,
                    challenge_id: challengeId,
                });
            }
        }
    }, [opponentAlive, phase]);

    const handleClose = () => {
        onComplete(winnerId);
    };

    const getResultText = () => {
        if (cpuMode) {
            if (winnerId === currentUserId) {
                return `🎉 You Won! The CPU hit an obstacle first! Great practice run!`;
            } else if (winnerId === opponentId) {
                return `😔 You hit an obstacle! The CPU survived longer. Try again!`;
            }
            return '🤝 It\'s a Draw! Both crashed at the same time!';
        }
        if (winnerId === currentUserId) {
            return `🎉 You Won! @${opponentUsername} hit an obstacle first! You have 10 minutes of access to their account!`;
        } else if (winnerId === opponentId) {
            return `😔 You Lost! You hit an obstacle. @${opponentUsername} now has 10 minutes of access to your account.`;
        }
        return '🤝 It\'s a Draw!';
    };

    return (
        <div className="runner-overlay">
            <div className="runner-modal">
                <button className="runner-close" onClick={handleClose}><HiOutlineX /></button>

                <div className="runner-header">
                    <h2>🐔 Chicken Runner</h2>
                    <div className="runner-players">
                        <div className="runner-player">
                            <span className="runner-player-name">{currentUsername}</span>
                            <span className="runner-player-score">Score: {score}</span>
                        </div>
                        <span className="runner-vs">VS</span>
                        <div className="runner-player">
                            <span className="runner-player-name">{opponentUsername}</span>
                            <span className={`runner-player-score ${!opponentAlive ? 'dead' : ''}`}>
                                {opponentAlive ? `Score: ${opponentScore}` : `💀 Dead (${opponentScore})`}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="runner-split-screens">
                    {/* Player screen */}
                    <div className="runner-screen">
                        <div className="runner-screen-label">{currentUsername}</div>
                        <div className="runner-canvas-wrapper">
                            <canvas
                                ref={canvasRef}
                                width={CANVAS_W}
                                height={CANVAS_H}
                                className="runner-canvas"
                            />

                            {/* Waiting overlay */}
                            {phase === 'waiting' && (
                                <div className="runner-waiting-overlay">
                                    <div className="runner-waiting-spinner" />
                                    <p>Waiting for <strong>@{opponentUsername}</strong> to be ready...</p>
                                </div>
                            )}

                            {/* Countdown overlay */}
                            {phase === 'countdown' && (
                                <div className="runner-countdown-overlay">
                                    <div className="runner-countdown-number" key={countdown}>
                                        {countdown > 0 ? countdown : 'GO!'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Opponent / CPU screen */}
                    <div className="runner-screen">
                        <div className="runner-screen-label">{opponentUsername}</div>
                        <div className="runner-canvas-wrapper">
                            <canvas
                                ref={oppCanvasRef}
                                width={CANVAS_W}
                                height={CANVAS_H}
                                className="runner-canvas"
                            />

                            {/* Waiting overlay for opponent canvas */}
                            {phase === 'waiting' && (
                                <div className="runner-waiting-overlay">
                                    <div className="runner-waiting-spinner" />
                                    <p>Waiting...</p>
                                </div>
                            )}

                            {/* Countdown overlay for opponent canvas */}
                            {phase === 'countdown' && (
                                <div className="runner-countdown-overlay">
                                    <div className="runner-countdown-number" key={countdown}>
                                        {countdown > 0 ? countdown : 'GO!'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Controls hint */}
                {phase === 'playing' && (
                    <div className="runner-controls-hint">
                        <span>⬆️ / Space = Jump</span>
                        <span>⬇️ = Duck</span>
                    </div>
                )}

                {/* Result */}
                {phase === 'result' && (
                    <div className="runner-result">
                        <div className="runner-result-text">{getResultText()}</div>
                        <div className="runner-final-scores">
                            <span>Your score: <strong>{score}</strong></span>
                            <span>Opponent: <strong>{opponentScore}</strong></span>
                        </div>
                        <button className="btn btn-primary runner-done-btn" onClick={handleClose}>
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
