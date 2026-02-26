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
const CANVAS_W = 800;
const CANVAS_H = 300;
const GROUND_Y = CANVAS_H - 40;
const GRAVITY = 0.8;
const JUMP_FORCE = -14;
const INITIAL_SPEED = 6;
const SPEED_INCREMENT = 0.005; // aggressive ramp
const MIN_OBSTACLE_GAP = 60; // frames between obstacles (shrinks)
const CHICKEN_W = 50;
const CHICKEN_H = 50;
const CHICKEN_DUCK_H = 30;

type GamePhase = 'waiting' | 'countdown' | 'playing' | 'dead' | 'result';

interface Obstacle {
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'cactus-small' | 'cactus-tall' | 'cactus-cluster';
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

    // Game state refs (used inside animation loop)
    const gameRef = useRef({
        chickenY: GROUND_Y - CHICKEN_H,
        velocityY: 0,
        isJumping: false,
        isDucking: false,
        speed: INITIAL_SPEED,
        obstacles: [] as Obstacle[],
        frameCount: 0,
        score: 0,
        dead: false,
        groundOffset: 0,
        lastObstacleFrame: 0,
        runFrame: 0,
    });

    // Sprite refs — individual images, not spritesheets
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
            // In CPU mode, both sides are instantly "ready"
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

    // ── Main game loop ──
    useEffect(() => {
        if (phase !== 'playing') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const game = gameRef.current;
        // Reset game state
        game.chickenY = GROUND_Y - CHICKEN_H;
        game.velocityY = 0;
        game.isJumping = false;
        game.isDucking = false;
        game.speed = INITIAL_SPEED;
        game.obstacles = [];
        game.frameCount = 0;
        game.score = 0;
        game.dead = false;
        game.groundOffset = 0;
        game.lastObstacleFrame = 0;
        game.runFrame = 0;

        function spawnObstacle() {
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

        function checkCollision(): boolean {
            const chickenH = game.isDucking ? CHICKEN_DUCK_H : CHICKEN_H;
            const chickenY = game.isDucking ? GROUND_Y - CHICKEN_DUCK_H : game.chickenY;
            // Chicken hitbox (slightly inset for fairness)
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

        function drawGround(ctx: CanvasRenderingContext2D) {
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, GROUND_Y);
            ctx.lineTo(CANVAS_W, GROUND_Y);
            ctx.stroke();

            // Scrolling ground detail
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

        function drawChicken(ctx: CanvasRenderingContext2D) {
            const sprites = spritesRef.current;
            const chickenX = 60;

            if (game.isJumping && sprites.jump) {
                ctx.drawImage(sprites.jump, chickenX, game.chickenY, CHICKEN_W, CHICKEN_H);
            } else if (game.isDucking && sprites.duck) {
                ctx.drawImage(sprites.duck, chickenX, GROUND_Y - CHICKEN_DUCK_H, CHICKEN_W, CHICKEN_DUCK_H);
            } else if (sprites.run1 && sprites.run2) {
                // Alternate between two individual run frames
                const useFrame2 = Math.floor(game.runFrame / 8) % 2 === 1;
                const runSprite = useFrame2 ? sprites.run2 : sprites.run1;
                ctx.drawImage(runSprite, chickenX, game.chickenY, CHICKEN_W, CHICKEN_H);
            } else {
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(chickenX, game.chickenY, CHICKEN_W, CHICKEN_H);
            }
        }

        function drawObstacles(ctx: CanvasRenderingContext2D) {
            const sprites = spritesRef.current;
            for (const obs of game.obstacles) {
                // Pick the individual sprite for this obstacle type
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

        function gameLoop() {
            if (!ctx || game.dead) return;

            game.frameCount++;
            game.runFrame++;

            // Increase speed aggressively
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
                // Random chance to spawn (gets higher)
                if (Math.random() < 0.4 + game.frameCount * 0.001) {
                    spawnObstacle();
                    game.lastObstacleFrame = game.frameCount;
                }
            }

            // Move obstacles
            for (const obs of game.obstacles) {
                obs.x -= game.speed;
            }
            // Remove off-screen
            game.obstacles = game.obstacles.filter(o => o.x + o.w > -10);

            // Ground scroll
            game.groundOffset += game.speed;

            // Collision
            if (checkCollision()) {
                game.dead = true;
                setScore(game.score);
                setPhase('dead');
                return;
            }

            // Score
            game.score = Math.floor(game.frameCount / 5);
            setScore(game.score);

            // ── Draw ──
            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

            // Sky gradient
            const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
            grad.addColorStop(0, '#1a1a2e');
            grad.addColorStop(1, '#16213e');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

            drawGround(ctx);
            drawObstacles(ctx);
            drawChicken(ctx);

            // Score on canvas
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`Score: ${game.score}`, CANVAS_W - 20, 30);

            // Speed indicator
            ctx.fillStyle = '#aaa';
            ctx.font = '12px monospace';
            ctx.fillText(`Speed: ${game.speed.toFixed(1)}`, CANVAS_W - 20, 50);

            animFrameRef.current = requestAnimationFrame(gameLoop);
        }

        animFrameRef.current = requestAnimationFrame(gameLoop);

        // Send score updates periodically (skip in CPU mode)
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

        // CPU mode: schedule CPU death at random time (15–45 seconds = 900–2700 frames at 60fps)
        if (cpuMode) {
            const cpuDeathDelay = (15 + Math.random() * 30) * 1000;
            cpuDeathTimer.current = setTimeout(() => {
                setOpponentAlive(false);
                setOpponentScore(Math.floor(cpuDeathDelay / 1000 * 12)); // approximate score
            }, cpuDeathDelay);
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
