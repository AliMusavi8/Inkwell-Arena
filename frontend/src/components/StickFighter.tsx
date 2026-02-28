import { useState, useEffect, useRef, useCallback } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import { useWebSocket } from '../context/WebSocketContext';
import { apiCompleteChallenge } from '../api';
import './StickFighter.css';

interface StickFighterProps {
    challengeId: number;
    currentUserId: number;
    currentUsername: string;
    opponentId: number;
    opponentUsername: string;
    isChallenger: boolean;
    onComplete: (winnerId: number | null) => void;
    cpuMode?: boolean;
}

// ── Constants ──
const CANVAS_W = 800;
const CANVAS_H = 400;
const GROUND_Y = CANVAS_H - 60;
const GRAVITY = 0.7;
const JUMP_FORCE = -13;
const MOVE_SPEED = 4;
const FIGHTER_W = 40;
const FIGHTER_H = 80;

const MAX_HEALTH = 100;
const MAX_ENERGY = 100;
const ENERGY_REGEN = 0.35;   // per frame passive
const ENERGY_ON_HIT = 15;    // burst on landing a hit
const PUNCH_DMG = 8;
const KICK_DMG = 12;
const SPECIAL_DMG = 30;
const PUNCH_RANGE = 55;
const KICK_RANGE = 65;
const PROJECTILE_SPEED = 10;
const PROJECTILE_RADIUS = 10;
const ATTACK_COOLDOWN = 20;  // frames
const MATCH_DURATION = 120;  // seconds

type GamePhase = 'waiting' | 'countdown' | 'fighting' | 'result';
type AttackType = 'punch' | 'kick' | 'special' | null;

interface Projectile {
    x: number;
    y: number;
    dir: 1 | -1;
    owner: 'me' | 'opp';
}

interface Fighter {
    x: number;
    y: number;
    vy: number;
    health: number;
    energy: number;
    facing: 1 | -1; // 1 = right, -1 = left
    attacking: AttackType;
    attackFrame: number;  // frames left in current attack animation
    cooldown: number;
    isJumping: boolean;
    hurtFrame: number;    // flash when hit
    walkFrame: number;
}

export default function StickFighter({
    challengeId,
    currentUserId,
    currentUsername,
    opponentId,
    opponentUsername,
    onComplete,
    cpuMode = false,
}: StickFighterProps) {
    const { sendMessage, lastMessage } = useWebSocket();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);

    const [phase, setPhase] = useState<GamePhase>('waiting');
    const [countdown, setCountdown] = useState(5);
    const [timeLeft, setTimeLeft] = useState(MATCH_DURATION);
    const [winnerId, setWinnerId] = useState<number | null>(null);
    const [iAmReady, setIAmReady] = useState(false);
    const [opponentReady, setOpponentReady] = useState(false);
    const [gameOverReported, setGameOverReported] = useState(false);

    // Display health/energy in React (updated from game loop)
    const [myHealth, setMyHealth] = useState(MAX_HEALTH);
    const [myEnergy, setMyEnergy] = useState(0);
    const [oppHealth, setOppHealth] = useState(MAX_HEALTH);
    const [oppEnergy, setOppEnergy] = useState(0);

    // Input state ref
    const keysRef = useRef<Set<string>>(new Set());

    // Game state refs
    const meRef = useRef<Fighter>({
        x: 150, y: GROUND_Y - FIGHTER_H, vy: 0,
        health: MAX_HEALTH, energy: 0, facing: 1,
        attacking: null, attackFrame: 0, cooldown: 0,
        isJumping: false, hurtFrame: 0, walkFrame: 0,
    });
    const oppRef = useRef<Fighter>({
        x: CANVAS_W - 150 - FIGHTER_W, y: GROUND_Y - FIGHTER_H, vy: 0,
        health: MAX_HEALTH, energy: 0, facing: -1,
        attacking: null, attackFrame: 0, cooldown: 0,
        isJumping: false, hurtFrame: 0, walkFrame: 0,
    });
    const timerRef = useRef(MATCH_DURATION);
    const gameOverRef = useRef(false);
    const projectilesRef = useRef<Projectile[]>([]);

    // ── Ready / Countdown ──
    useEffect(() => {
        if (cpuMode) {
            setIAmReady(true);
            setOpponentReady(true);
        } else {
            // Signal ready to opponent
            sendMessage({
                type: 'fighter_ready',
                opponent_id: opponentId,
                challenge_id: challengeId,
            });
            setIAmReady(true);
        }
    }, []);

    useEffect(() => {
        if (iAmReady && opponentReady && phase === 'waiting') {
            setPhase('countdown');
        }
    }, [iAmReady, opponentReady, phase]);

    // Countdown timer
    useEffect(() => {
        if (phase !== 'countdown') return;
        if (countdown <= 0) {
            setPhase('fighting');
            return;
        }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [phase, countdown]);

    // ── WebSocket messages ──
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'fighter_ready' && lastMessage.challenge_id === challengeId) {
            setOpponentReady(true);
        }

        if (lastMessage.type === 'fighter_state' && lastMessage.challenge_id === challengeId) {
            const opp = oppRef.current;
            opp.x = lastMessage.x ?? opp.x;
            opp.y = lastMessage.y ?? opp.y;
            opp.facing = lastMessage.facing ?? opp.facing;
            opp.attacking = lastMessage.attacking ?? null;
            opp.attackFrame = lastMessage.attackFrame ?? 0;
            opp.health = lastMessage.health ?? opp.health;
            opp.energy = lastMessage.energy ?? opp.energy;
            setOppHealth(opp.health);
            setOppEnergy(opp.energy);
        }

        if (lastMessage.type === 'fighter_hit' && lastMessage.challenge_id === challengeId) {
            // I got hit by opponent
            const me = meRef.current;
            const dmg = lastMessage.damage ?? 0;
            me.health = Math.max(0, me.health - dmg);
            me.hurtFrame = 10;
            setMyHealth(me.health);

            if (me.health <= 0 && !gameOverRef.current) {
                gameOverRef.current = true;
                endGame(opponentId);
            }
        }

        if (lastMessage.type === 'game_over' && lastMessage.challenge_id === challengeId) {
            if (!gameOverRef.current) {
                gameOverRef.current = true;
                setWinnerId(lastMessage.winner_id ?? null);
                setPhase('result');
                setGameOverReported(true);
            }
        }
    }, [lastMessage]);

    // ── End game helper ──
    const endGame = useCallback((winner: number | null) => {
        if (gameOverReported) return;
        gameOverRef.current = true;
        setWinnerId(winner);
        setPhase('result');
        setGameOverReported(true);
        cancelAnimationFrame(animFrameRef.current);

        if (!cpuMode) {
            apiCompleteChallenge(challengeId, winner || 0).catch(() => { });
            sendMessage({
                type: 'game_over',
                opponent_id: opponentId,
                winner_id: winner,
                challenge_id: challengeId,
            });
        }
    }, [gameOverReported, cpuMode, challengeId, opponentId, sendMessage]);

    // ── Key listeners ──
    useEffect(() => {
        const handleDown = (e: KeyboardEvent) => {
            keysRef.current.add(e.key.toLowerCase());
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        };
        const handleUp = (e: KeyboardEvent) => {
            keysRef.current.delete(e.key.toLowerCase());
        };
        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);
        return () => {
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
        };
    }, []);

    // ── Draw stickman ──
    const drawStickman = useCallback((ctx: CanvasRenderingContext2D, f: Fighter, color: string, isMe: boolean) => {
        const cx = f.x + FIGHTER_W / 2;
        const footY = f.y + FIGHTER_H;
        const headR = 12;
        const headY = f.y + headR;
        const shoulderY = f.y + headR * 2 + 4;
        const hipY = f.y + FIGHTER_H - 20;

        ctx.save();
        ctx.strokeStyle = f.hurtFrame > 0 ? '#ff4444' : color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        // Head
        ctx.beginPath();
        ctx.arc(cx, headY, headR, 0, Math.PI * 2);
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.moveTo(cx, headY + headR);
        ctx.lineTo(cx, hipY);
        ctx.stroke();

        // Legs — walking animation
        const legAngle = f.isJumping ? 0.3 : Math.sin(f.walkFrame * 0.15) * 0.4;
        // Left leg
        ctx.beginPath();
        ctx.moveTo(cx, hipY);
        ctx.lineTo(cx - Math.sin(legAngle) * 25, footY + Math.cos(legAngle) * 2);
        ctx.stroke();
        // Right leg
        ctx.beginPath();
        ctx.moveTo(cx, hipY);
        ctx.lineTo(cx + Math.sin(legAngle) * 25, footY + Math.cos(legAngle) * 2);
        ctx.stroke();

        // Arms
        const armAttachY = shoulderY + 4;
        if (f.attacking === 'punch' && f.attackFrame > 0) {
            // Punching arm extended
            ctx.beginPath();
            ctx.moveTo(cx, armAttachY);
            ctx.lineTo(cx + f.facing * 50, armAttachY);
            ctx.stroke();
            // Draw fist
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(cx + f.facing * 52, armAttachY, 5, 0, Math.PI * 2);
            ctx.fill();
            // Other arm normal
            ctx.beginPath();
            ctx.moveTo(cx, armAttachY);
            ctx.lineTo(cx - f.facing * 15, armAttachY + 20);
            ctx.stroke();
        } else if (f.attacking === 'kick' && f.attackFrame > 0) {
            // Normal arms
            ctx.beginPath();
            ctx.moveTo(cx, armAttachY);
            ctx.lineTo(cx + f.facing * 15, armAttachY + 20);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx, armAttachY);
            ctx.lineTo(cx - f.facing * 15, armAttachY + 20);
            ctx.stroke();
            // Kick leg extended
            ctx.lineWidth = 4;
            ctx.strokeStyle = f.hurtFrame > 0 ? '#ff4444' : color;
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx + f.facing * 55, hipY + 10);
            ctx.stroke();
            // Foot
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(cx + f.facing * 57, hipY + 10, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 3;
        } else if (f.attacking === 'special' && f.attackFrame > 0) {
            // Special — both arms forward with energy ball
            ctx.beginPath();
            ctx.moveTo(cx, armAttachY);
            ctx.lineTo(cx + f.facing * 45, armAttachY - 5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx, armAttachY);
            ctx.lineTo(cx + f.facing * 45, armAttachY + 5);
            ctx.stroke();
            // Energy ball
            const gradient = ctx.createRadialGradient(
                cx + f.facing * 60, armAttachY, 2,
                cx + f.facing * 60, armAttachY, 14
            );
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(0.5, '#ff8800');
            gradient.addColorStop(1, 'rgba(255, 136, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx + f.facing * 60, armAttachY, 14, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Idle / guard arms
            ctx.beginPath();
            ctx.moveTo(cx, armAttachY);
            ctx.lineTo(cx + f.facing * 15, armAttachY + 20);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx, armAttachY);
            ctx.lineTo(cx - f.facing * 10, armAttachY + 18);
            ctx.stroke();
        }

        // Name label
        ctx.fillStyle = color;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isMe ? 'YOU' : 'OPP', cx, f.y - 8);

        ctx.restore();
    }, []);

    // ── CPU AI (easy difficulty) ──
    const updateCPU = useCallback((cpu: Fighter, player: Fighter) => {
        const dist = Math.abs(cpu.x - player.x);

        // Move toward player — slower
        if (dist > 90) {
            if (cpu.x < player.x) { cpu.x += 1.8; cpu.facing = 1; }
            else { cpu.x -= 1.8; cpu.facing = -1; }
        } else if (dist < 40) {
            cpu.x -= cpu.facing * 1.5;
        } else {
            // Face the player even when idle
            cpu.facing = player.x > cpu.x ? 1 : -1;
        }

        // Random attacks — lower frequency
        if (cpu.cooldown <= 0 && dist < 80) {
            const roll = Math.random();
            if (roll < 0.012 && cpu.energy >= MAX_ENERGY) {
                cpu.attacking = 'special';
                cpu.attackFrame = 20;
                cpu.cooldown = ATTACK_COOLDOWN + 20;
                cpu.energy = 0;
                // Spawn CPU ki blast
                projectilesRef.current.push({
                    x: cpu.x + FIGHTER_W / 2 + cpu.facing * 30,
                    y: cpu.y + 36,
                    dir: cpu.facing,
                    owner: 'opp',
                });
            } else if (roll < 0.03) {
                cpu.attacking = 'kick';
                cpu.attackFrame = 15;
                cpu.cooldown = ATTACK_COOLDOWN + 5;
            } else if (roll < 0.05) {
                cpu.attacking = 'punch';
                cpu.attackFrame = 10;
                cpu.cooldown = ATTACK_COOLDOWN + 5;
            }
        }

        // Random jump — less frequent
        if (!cpu.isJumping && Math.random() < 0.004) {
            cpu.vy = JUMP_FORCE;
            cpu.isJumping = true;
        }

        // Walk frame
        if (dist > 30) cpu.walkFrame++;
    }, []);

    // ── Main game loop ──
    useEffect(() => {
        if (phase !== 'fighting') return;

        let frameCount = 0;
        let lastTimerUpdate = 0;
        let lastStateSync = 0;

        const gameLoop = () => {
            if (gameOverRef.current) return;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const me = meRef.current;
            const opp = oppRef.current;
            frameCount++;

            // ── Input ──
            const keys = keysRef.current;
            if (keys.has('arrowleft')) { me.x -= MOVE_SPEED; me.facing = -1; me.walkFrame++; }
            if (keys.has('arrowright')) { me.x += MOVE_SPEED; me.facing = 1; me.walkFrame++; }
            if (keys.has('arrowup') && !me.isJumping) {
                me.vy = JUMP_FORCE;
                me.isJumping = true;
            }

            // Attacks
            if (me.cooldown <= 0 && me.attackFrame <= 0) {
                if (keys.has('a')) {
                    me.attacking = 'punch';
                    me.attackFrame = 10;
                    me.cooldown = ATTACK_COOLDOWN;
                } else if (keys.has('s')) {
                    me.attacking = 'kick';
                    me.attackFrame = 15;
                    me.cooldown = ATTACK_COOLDOWN;
                } else if (keys.has('d') && me.energy >= MAX_ENERGY) {
                    me.attacking = 'special';
                    me.attackFrame = 20;
                    me.cooldown = ATTACK_COOLDOWN + 10;
                    me.energy = 0;
                    setMyEnergy(0);
                    // Spawn ki blast projectile
                    projectilesRef.current.push({
                        x: me.x + FIGHTER_W / 2 + me.facing * 30,
                        y: me.y + 36,
                        dir: me.facing,
                        owner: 'me',
                    });
                }
            }

            // ── Physics ──
            // Me
            me.vy += GRAVITY;
            me.y += me.vy;
            if (me.y >= GROUND_Y - FIGHTER_H) {
                me.y = GROUND_Y - FIGHTER_H;
                me.vy = 0;
                me.isJumping = false;
            }
            // Clamp to canvas
            me.x = Math.max(0, Math.min(CANVAS_W - FIGHTER_W, me.x));

            // CPU opponent physics
            if (cpuMode) {
                updateCPU(opp, me);
            }
            opp.vy += GRAVITY;
            opp.y += opp.vy;
            if (opp.y >= GROUND_Y - FIGHTER_H) {
                opp.y = GROUND_Y - FIGHTER_H;
                opp.vy = 0;
                opp.isJumping = false;
            }
            opp.x = Math.max(0, Math.min(CANVAS_W - FIGHTER_W, opp.x));

            // ── Attack timers ──
            if (me.attackFrame > 0) me.attackFrame--;
            else me.attacking = null;
            if (me.cooldown > 0) me.cooldown--;
            if (me.hurtFrame > 0) me.hurtFrame--;

            if (opp.attackFrame > 0) opp.attackFrame--;
            else opp.attacking = null;
            if (opp.cooldown > 0) opp.cooldown--;
            if (opp.hurtFrame > 0) opp.hurtFrame--;

            // ── Hit detection (melee: punch/kick only) ──
            if (me.attacking && me.attacking !== 'special' && me.attackFrame > 0) {
                const dist = Math.abs((me.x + FIGHTER_W / 2) - (opp.x + FIGHTER_W / 2));
                const dirCorrect = (me.facing === 1 && opp.x > me.x) || (me.facing === -1 && opp.x < me.x);
                let range = 0;
                let dmg = 0;
                let hitFrame = 0;

                if (me.attacking === 'punch') { range = PUNCH_RANGE; dmg = PUNCH_DMG; hitFrame = 5; }
                else if (me.attacking === 'kick') { range = KICK_RANGE; dmg = KICK_DMG; hitFrame = 8; }

                if (dirCorrect && dist < range && me.attackFrame === hitFrame) {
                    me.energy = Math.min(MAX_ENERGY, me.energy + ENERGY_ON_HIT);
                    setMyEnergy(me.energy);

                    if (cpuMode) {
                        opp.health = Math.max(0, opp.health - dmg);
                        opp.hurtFrame = 10;
                        setOppHealth(opp.health);

                        if (opp.health <= 0 && !gameOverRef.current) {
                            gameOverRef.current = true;
                            endGame(currentUserId);
                            return;
                        }
                    } else {
                        sendMessage({
                            type: 'fighter_hit',
                            opponent_id: opponentId,
                            damage: dmg,
                            challenge_id: challengeId,
                        });
                    }
                }
            }

            // CPU melee hit detection (punch/kick only)
            if (cpuMode && opp.attacking && opp.attacking !== 'special' && opp.attackFrame > 0) {
                const dist = Math.abs((opp.x + FIGHTER_W / 2) - (me.x + FIGHTER_W / 2));
                const dirCorrect = (opp.facing === 1 && me.x > opp.x) || (opp.facing === -1 && me.x < opp.x);
                let range = 0;
                let dmg = 0;
                let hitFrame = 0;

                if (opp.attacking === 'punch') { range = PUNCH_RANGE; dmg = PUNCH_DMG; hitFrame = 5; }
                else if (opp.attacking === 'kick') { range = KICK_RANGE; dmg = KICK_DMG; hitFrame = 8; }

                if (dirCorrect && dist < range && opp.attackFrame === hitFrame) {
                    opp.energy = Math.min(MAX_ENERGY, opp.energy + ENERGY_ON_HIT);
                    me.health = Math.max(0, me.health - dmg);
                    me.hurtFrame = 10;
                    setMyHealth(me.health);
                    setOppEnergy(opp.energy);

                    if (me.health <= 0 && !gameOverRef.current) {
                        gameOverRef.current = true;
                        endGame(opponentId);
                        return;
                    }
                }
            }

            // ── Projectile (ki blast) update ──
            const projs = projectilesRef.current;
            for (let i = projs.length - 1; i >= 0; i--) {
                const p = projs[i];
                p.x += p.dir * PROJECTILE_SPEED;

                // Off-screen removal
                if (p.x < -20 || p.x > CANVAS_W + 20) {
                    projs.splice(i, 1);
                    continue;
                }

                // Collision check
                const target = p.owner === 'me' ? opp : me;
                const targetCx = target.x + FIGHTER_W / 2;
                const targetCy = target.y + FIGHTER_H / 2;
                const dx = p.x - targetCx;
                const dy = p.y - targetCy;
                if (Math.abs(dx) < FIGHTER_W / 2 + PROJECTILE_RADIUS && Math.abs(dy) < FIGHTER_H / 2 + PROJECTILE_RADIUS) {
                    // Hit!
                    projs.splice(i, 1);
                    if (p.owner === 'me') {
                        me.energy = Math.min(MAX_ENERGY, me.energy + ENERGY_ON_HIT);
                        setMyEnergy(me.energy);
                        if (cpuMode) {
                            opp.health = Math.max(0, opp.health - SPECIAL_DMG);
                            opp.hurtFrame = 12;
                            setOppHealth(opp.health);
                            if (opp.health <= 0 && !gameOverRef.current) {
                                gameOverRef.current = true;
                                endGame(currentUserId);
                                return;
                            }
                        } else {
                            sendMessage({
                                type: 'fighter_hit',
                                opponent_id: opponentId,
                                damage: SPECIAL_DMG,
                                challenge_id: challengeId,
                            });
                        }
                    } else if (cpuMode) {
                        // CPU ki blast hit me
                        me.health = Math.max(0, me.health - SPECIAL_DMG);
                        me.hurtFrame = 12;
                        setMyHealth(me.health);
                        if (me.health <= 0 && !gameOverRef.current) {
                            gameOverRef.current = true;
                            endGame(opponentId);
                            return;
                        }
                    }
                }
            }

            // ── Energy regen ──
            me.energy = Math.min(MAX_ENERGY, me.energy + ENERGY_REGEN);
            setMyEnergy(me.energy);
            if (cpuMode) {
                opp.energy = Math.min(MAX_ENERGY, opp.energy + ENERGY_REGEN);
                setOppEnergy(opp.energy);
            }

            // ── Timer ──
            if (frameCount - lastTimerUpdate >= 60) {
                lastTimerUpdate = frameCount;
                timerRef.current--;
                setTimeLeft(timerRef.current);

                if (timerRef.current <= 0 && !gameOverRef.current) {
                    // Time's up — determine winner by health
                    let winner: number | null = null;
                    if (me.health > opp.health) winner = currentUserId;
                    else if (opp.health > me.health) winner = opponentId;
                    endGame(winner);
                    return;
                }
            }

            // ── Sync state to opponent ──
            if (!cpuMode && frameCount - lastStateSync >= 6) {
                lastStateSync = frameCount;
                sendMessage({
                    type: 'fighter_state',
                    opponent_id: opponentId,
                    challenge_id: challengeId,
                    x: me.x,
                    y: me.y,
                    facing: me.facing,
                    attacking: me.attacking,
                    attackFrame: me.attackFrame,
                    health: me.health,
                    energy: me.energy,
                });
            }

            // Update health display
            setMyHealth(me.health);

            // ── Draw ──
            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

            // Background gradient
            const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
            bg.addColorStop(0, '#0a0e1a');
            bg.addColorStop(1, '#141a2e');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

            // Ground
            ctx.fillStyle = '#1a2040';
            ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
            ctx.strokeStyle = 'rgba(200, 120, 20, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, GROUND_Y);
            ctx.lineTo(CANVAS_W, GROUND_Y);
            ctx.stroke();

            // Timer on canvas
            const mins = Math.floor(timerRef.current / 60);
            const secs = timerRef.current % 60;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, CANVAS_W / 2, 30);

            // Draw fighters
            drawStickman(ctx, me, '#00ccff', true);
            drawStickman(ctx, opp, '#ff4466', false);

            // Draw projectiles (ki blasts)
            for (const p of projectilesRef.current) {
                const pColor = p.owner === 'me' ? '#00ccff' : '#ff4466';
                // Trail
                const trailGrad = ctx.createLinearGradient(p.x - p.dir * 30, p.y, p.x, p.y);
                trailGrad.addColorStop(0, 'rgba(255, 200, 0, 0)');
                trailGrad.addColorStop(1, 'rgba(255, 200, 0, 0.4)');
                ctx.strokeStyle = trailGrad;
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(p.x - p.dir * 30, p.y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
                // Ki ball
                const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, PROJECTILE_RADIUS);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.3, '#ffff00');
                grad.addColorStop(0.6, pColor);
                grad.addColorStop(1, 'rgba(255, 136, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }

            animFrameRef.current = requestAnimationFrame(gameLoop);
        };

        animFrameRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [phase, cpuMode, endGame, drawStickman, updateCPU, currentUserId, opponentId, challengeId, sendMessage]);

    // ── Result ──
    const handleClose = () => onComplete(winnerId);

    const getResultText = () => {
        if (cpuMode) {
            if (winnerId === currentUserId) return '🎉 You Won! Great fighting skills!';
            if (winnerId === opponentId) return '😔 You Lost! The CPU defeated you. Try again!';
            return '🤝 Draw! Both fighters stood their ground!';
        }
        if (winnerId === currentUserId) {
            return `🎉 You Won! @${opponentUsername} has been defeated! You have 10 minutes of access to their account!`;
        }
        if (winnerId === opponentId) {
            return `😔 You Lost! @${opponentUsername} now has 10 minutes of access to your account.`;
        }
        return '🤝 Draw! Neither fighter could claim victory!';
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        return `${m}:${(s % 60).toString().padStart(2, '0')}`;
    };

    return (
        <div className="fighter-overlay">
            <div className="fighter-modal">
                <button className="fighter-close" onClick={handleClose}><HiOutlineX /></button>

                <div className="fighter-header">
                    <h2>⚔️ Stick Fighter</h2>
                </div>

                {/* HUD — Health & Energy bars */}
                <div className="fighter-hud">
                    <div className="fighter-hud-player left">
                        <span className="fighter-hud-name">{currentUsername}</span>
                        <div className="fighter-bar-group">
                            <div className="fighter-health-bar">
                                <div className="fighter-health-fill" style={{ width: `${(myHealth / MAX_HEALTH) * 100}%` }} />
                            </div>
                            <div className="fighter-energy-bar">
                                <div
                                    className={`fighter-energy-fill ${myEnergy >= MAX_ENERGY ? 'full' : ''}`}
                                    style={{ width: `${(myEnergy / MAX_ENERGY) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="fighter-hud-timer">{formatTime(timeLeft)}</div>

                    <div className="fighter-hud-player right">
                        <span className="fighter-hud-name">{opponentUsername}</span>
                        <div className="fighter-bar-group">
                            <div className="fighter-health-bar">
                                <div className="fighter-health-fill opp" style={{ width: `${(oppHealth / MAX_HEALTH) * 100}%` }} />
                            </div>
                            <div className="fighter-energy-bar">
                                <div
                                    className={`fighter-energy-fill opp ${oppEnergy >= MAX_ENERGY ? 'full' : ''}`}
                                    style={{ width: `${(oppEnergy / MAX_ENERGY) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Canvas */}
                <div className="fighter-canvas-wrapper">
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_W}
                        height={CANVAS_H}
                        className="fighter-canvas"
                    />

                    {/* Waiting overlay */}
                    {phase === 'waiting' && (
                        <div className="fighter-waiting-overlay">
                            <div className="fighter-waiting-spinner" />
                            <p>Waiting for <strong>@{opponentUsername}</strong> to be ready...</p>
                        </div>
                    )}

                    {/* Countdown overlay */}
                    {phase === 'countdown' && (
                        <div className="fighter-countdown-overlay">
                            <div className="fighter-countdown-number" key={countdown}>
                                {countdown > 0 ? countdown : 'FIGHT!'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls hint */}
                {phase === 'fighting' && (
                    <div className="fighter-controls-hint">
                        <span>← → Move</span>
                        <span>↑ Jump</span>
                        <span><kbd>A</kbd> Punch</span>
                        <span><kbd>S</kbd> Kick</span>
                        <span><kbd>D</kbd> Special{myEnergy < MAX_ENERGY ? ' (charge!)' : ' ⚡ READY!'}</span>
                    </div>
                )}

                {/* Result */}
                {phase === 'result' && (
                    <div className="fighter-result">
                        <div className="fighter-result-text">{getResultText()}</div>
                        <div className="fighter-final-stats">
                            <span>Your HP: <strong>{Math.round(myHealth)}</strong></span>
                            <span>Opponent HP: <strong>{Math.round(oppHealth)}</strong></span>
                        </div>
                        <button className="btn btn-primary fighter-done-btn" onClick={handleClose}>
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
