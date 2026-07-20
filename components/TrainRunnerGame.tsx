// Tap-to-jump endless runner: the train stays on a fixed x position,
// obstacles (signal poles / rocks) scroll in from the right, tapping
// makes the train jump, score increases over time, collision ends the
// run and shows a restart prompt.
//
// Dependencies: none beyond react-native itself.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SCENE_HEIGHT = 220;
const GROUND_Y = 40; // distance from bottom of scene to the track line
const TRAIN_X = 50; // fixed left position of the train
const TRAIN_WIDTH = 64; // collision + layout width of the train's bounding box
const OBSTACLE_WIDTH = 18;
const OBSTACLE_HEIGHT = 34;

const JUMP_HEIGHT = 70;
const JUMP_DURATION = 520; // ms

const BASE_SPEED = 180; // px/sec, obstacle scroll speed
const SPEED_RAMP_PER_SEC = 4; // difficulty ramps up slowly
const MIN_SPAWN_GAP = 900; // ms
const MAX_SPAWN_GAP = 1700; // ms

type Obstacle = { id: number; x: number };

function randomSpawnGap() {
  return MIN_SPAWN_GAP + Math.random() * (MAX_SPAWN_GAP - MIN_SPAWN_GAP);
}

function SteamPuff({ delayMs }: { delayMs: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    );
    const sequence = Animated.sequence([Animated.delay(delayMs), loop]);
    sequence.start();
    return () => sequence.stop();
  }, [anim, delayMs]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -24],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.7, 0],
  });
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.3],
  });

  return (
    <Animated.View
      style={[
        styles.steamPuff,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    />
  );
}

function BigWheel() {
  return (
    <View style={styles.bigWheel}>
      <View style={styles.bigWheelHub} />
      <View style={[styles.spoke, { transform: [{ rotate: "0deg" }] }]} />
      <View style={[styles.spoke, { transform: [{ rotate: "60deg" }] }]} />
      <View style={[styles.spoke, { transform: [{ rotate: "120deg" }] }]} />
    </View>
  );
}

function PilotWheel() {
  return <View style={styles.pilotWheel} />;
}

export default function TrainRunnerGame() {
  const [trainY, setTrainY] = useState(0); // 0 = on the ground
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const jumpStartRef = useRef<number | null>(null);
  const spawnTimerRef = useRef(0);
  const nextSpawnGapRef = useRef(randomSpawnGap());
  const speedRef = useRef(BASE_SPEED);
  const scoreAccumRef = useRef(0);
  const obstacleIdRef = useRef(0);
  const isGameOverRef = useRef(false);

  const resetGame = useCallback(() => {
    setTrainY(0);
    setObstacles([]);
    setScore(0);
    setIsGameOver(false);
    setHasStarted(true);
    lastTsRef.current = null;
    jumpStartRef.current = null;
    spawnTimerRef.current = 0;
    nextSpawnGapRef.current = randomSpawnGap();
    speedRef.current = BASE_SPEED;
    scoreAccumRef.current = 0;
    isGameOverRef.current = false;
  }, []);

  const endGame = useCallback(() => {
    isGameOverRef.current = true;
    setIsGameOver(true);
    setBest((prevBest) => Math.max(prevBest, Math.floor(scoreAccumRef.current)));
  }, []);

  const jump = useCallback(() => {
    if (jumpStartRef.current === null && !isGameOverRef.current) {
      jumpStartRef.current = performance.now();
    }
  }, []);

  const handleTap = useCallback(() => {
    if (!hasStarted || isGameOver) {
      resetGame();
      return;
    }
    jump();
  }, [hasStarted, isGameOver, resetGame, jump]);

  // keep refs mirroring latest state so the RAF closure can read current
  // values without re-subscribing the effect every frame
  const obstaclesRef = useRef(obstacles);
  useEffect(() => {
    obstaclesRef.current = obstacles;
  }, [obstacles]);

  function currentJumpY() {
    if (jumpStartRef.current === null) return 0;
    const elapsed = performance.now() - jumpStartRef.current;
    const t = Math.min(elapsed / JUMP_DURATION, 1);
    return 4 * JUMP_HEIGHT * t * (1 - t);
  }

  useEffect(() => {
    if (!hasStarted || isGameOver) return;

    const tick = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05); // clamp for tab-out
      lastTsRef.current = ts;

      // difficulty ramp
      speedRef.current += SPEED_RAMP_PER_SEC * dt;

      // jump arc (parabolic)
      if (jumpStartRef.current !== null) {
        const elapsed = ts - jumpStartRef.current;
        const t = Math.min(elapsed / JUMP_DURATION, 1);
        const y = 4 * JUMP_HEIGHT * t * (1 - t);
        setTrainY(y);
        if (t >= 1) {
          jumpStartRef.current = null;
          setTrainY(0);
        }
      }

      // move obstacles, spawn new ones, cull off-screen ones
      spawnTimerRef.current += dt * 1000;
      let spawned: Obstacle | null = null;
      if (spawnTimerRef.current >= nextSpawnGapRef.current) {
        spawnTimerRef.current = 0;
        nextSpawnGapRef.current = randomSpawnGap();
        obstacleIdRef.current += 1;
        spawned = { id: obstacleIdRef.current, x: SCREEN_WIDTH + OBSTACLE_WIDTH };
      }

      setObstacles((prev) => {
        const moved = prev
          .map((o) => ({ ...o, x: o.x - speedRef.current * dt }))
          .filter((o) => o.x > -OBSTACLE_WIDTH);
        return spawned ? [...moved, spawned] : moved;
      });

      // score ticks with time survived
      scoreAccumRef.current += dt * 10;
      setScore(Math.floor(scoreAccumRef.current));

      // collision check — only obstacles near the train's x range matter.
      // "airborne" means the jump arc has cleared the obstacle's height.
      const trainLeft = TRAIN_X;
      const trainRight = TRAIN_X + TRAIN_WIDTH;
      const airborne = currentJumpY() > OBSTACLE_HEIGHT - 10;

      for (const o of obstaclesRef.current) {
        const oLeft = o.x;
        const oRight = o.x + OBSTACLE_WIDTH;
        const overlapsX = oRight > trainLeft && oLeft < trainRight;
        if (overlapsX && !airborne) {
          endGame();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, isGameOver]);

  return (
    <Pressable style={styles.scene} onPress={handleTap}>
      {/* sky */}
      <View style={styles.sky}>
        <View style={styles.sun} />
      </View>

      {/* ground line */}
      <View style={[styles.ground, { bottom: GROUND_Y }]} />

      {/* obstacles */}
      {obstacles.map((o) => (
        <View
          key={o.id}
          style={[
            styles.obstacle,
            { left: o.x, bottom: GROUND_Y },
          ]}
        />
      ))}

      {/* train */}
      <View
        style={[
          styles.train,
          { left: TRAIN_X, bottom: GROUND_Y + trainY },
        ]}
      >
        <SteamPuff delayMs={0} />
        <SteamPuff delayMs={450} />

        <View style={styles.chimneyCap} />
        <View style={styles.chimney} />
        <View style={styles.dome} />

        <View style={styles.upperBody}>
          <View style={styles.cab}>
            <View style={styles.cabWindow} />
          </View>
          <View style={styles.boiler} />
        </View>

        <View style={styles.cowcatcher} />

        <View style={styles.connectingRod} />

        <View style={styles.wheelsRow}>
          <BigWheel />
          <BigWheel />
          <PilotWheel />
        </View>
      </View>

      {/* HUD */}
      <View style={styles.hud}>
        <Text style={styles.scoreText}>{score}</Text>
        {best > 0 && <Text style={styles.bestText}>Best {best}</Text>}
      </View>

      {!hasStarted && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>No Internet Connection</Text>
          <Text style={styles.overlayHint}>Tap to play while you wait</Text>
        </View>
      )}

      {isGameOver && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Derailed!</Text>
          <Text style={styles.overlayScore}>Score: {score}</Text>
          <Text style={styles.overlayHint}>Tap to try again</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: "100%",
    height: SCENE_HEIGHT,
    overflow: "hidden",
    backgroundColor: "#cfefff",
    borderRadius: 16,
  },
  sky: { ...StyleSheet.absoluteFillObject },
  sun: {
    position: "absolute",
    top: 16,
    right: 24,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ffd76a",
  },
  ground: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: 3,
    backgroundColor: "#555b66",
  },
  obstacle: {
    position: "absolute",
    width: OBSTACLE_WIDTH,
    height: OBSTACLE_HEIGHT,
    backgroundColor: "#4c4f57",
    borderRadius: 3,
  },
  train: {
    position: "absolute",
    width: TRAIN_WIDTH,
    height: 62,
    alignItems: "flex-end",
  },

  // steam
  steamPuff: {
    position: "absolute",
    top: -4,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#e8e8e8",
  },

  // chimney (tapered: narrow base + flared cap)
  chimney: {
    position: "absolute",
    top: 2,
    right: 12,
    width: 8,
    height: 16,
    backgroundColor: "#222",
    borderRadius: 2,
  },
  chimneyCap: {
    position: "absolute",
    top: 0,
    right: 9,
    width: 14,
    height: 5,
    backgroundColor: "#222",
    borderRadius: 2,
  },

  // dome sits on top of the boiler, behind the chimney
  dome: {
    position: "absolute",
    top: 16,
    right: 30,
    width: 14,
    height: 8,
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },

  upperBody: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 22,
  },
  cab: {
    width: 22,
    height: 30,
    backgroundColor: "#7a1f1f",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -2,
    zIndex: 1,
  },
  cabWindow: {
    width: 12,
    height: 12,
    backgroundColor: "#cfefff",
    borderRadius: 2,
  },
  boiler: {
    width: 38,
    height: 22,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
  },

  // cowcatcher: angled plow at the front (right side, facing oncoming obstacles)
  cowcatcher: {
    position: "absolute",
    bottom: 8,
    right: -2,
    width: 16,
    height: 10,
    backgroundColor: "#3a3a3a",
    borderRadius: 2,
    transform: [{ rotate: "20deg" }],
  },

  connectingRod: {
    position: "absolute",
    bottom: 12,
    right: 10,
    width: 26,
    height: 3,
    backgroundColor: "#3a3a3a",
    borderRadius: 2,
  },

  wheelsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  bigWheel: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  bigWheelHub: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#c0392b",
  },
  spoke: {
    position: "absolute",
    width: 16,
    height: 2,
    backgroundColor: "#444",
  },
  pilotWheel: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#1a1a1a",
  },
  hud: {
    position: "absolute",
    top: 10,
    right: 14,
    alignItems: "flex-end",
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  bestText: {
    fontSize: 11,
    color: "#666",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  overlayScore: {
    marginTop: 4,
    fontSize: 14,
    color: "#444",
  },
  overlayHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
  },
});