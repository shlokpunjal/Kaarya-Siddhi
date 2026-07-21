// components/TrainRunnerGame.tsx
//
// Tap-to-jump endless runner: the train stays on a fixed x position,
// obstacles (signal poles / rocks) scroll in from the right, tapping
// makes the train jump, score increases over time, collision ends the
// run and shows a restart prompt.
//
// Dependencies: none beyond react-native itself.
//
// Train is built as nested flex layout, not a pile of independently
// absolute-positioned pieces — the chimney is anchored to the boiler
// (not to the whole train box), so it can't drift out of place if
// other sizes change later.
 
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
 
// App theme
const PRIMARY = "#0B1B3D"; // navy — boiler, cab, chimney
const ACCENT = "#E8870A"; // orange — trim, wheel hubs
const PRIMARY_DARK = "#071227"; // cab shade, one tone darker than PRIMARY
const METAL = "#3A4256"; // wheels, track, obstacles
 
const SCENE_HEIGHT = 220;
const GROUND_Y = 40; // distance from bottom of scene to the track line
const TRAIN_X = 50; // fixed left position of the train
const TRAIN_WIDTH = 60; // collision + layout width of the train's bounding box
const OBSTACLE_WIDTH = 18;
const OBSTACLE_HEIGHT = 34;
 
const JUMP_HEIGHT = 80;
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
    outputRange: [0, -20],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.7, 0],
  });
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.2],
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
 
function Wheel() {
  return (
    <View style={styles.wheel}>
      <View style={styles.wheelHub} />
    </View>
  );
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
      {/* sky — sun sits top-left so it never competes with the HUD */}
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
 
      {/* train — everything nests inside bodyRow so pieces stay attached
          to their actual parent instead of floating independently */}
      <View
        style={[
          styles.train,
          { left: TRAIN_X, bottom: GROUND_Y + trainY },
        ]}
      >
        <SteamPuff delayMs={0} />
        <SteamPuff delayMs={450} />
 
        <View style={styles.bodyRow}>
          <View style={styles.cab}>
            <View style={styles.cabWindow} />
          </View>
          <View style={styles.boiler}>
            <View style={styles.chimney} />
            <View style={styles.boilerBand} />
          </View>
        </View>
 
        <View style={styles.wheelsRow}>
          <Wheel />
          <Wheel />
        </View>
      </View>
 
      {/* HUD */}
      <View style={styles.hud}>
        <Text style={styles.scoreText}>{score}</Text>
        {best > 0 && <Text style={styles.bestText}>Best {best}</Text>}
      </View>
 
      {!hasStarted && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>No Internet Connection</Text>
          <Text style={styles.bannerHint}>Tap to play while you wait</Text>
        </View>
      )}
 
      {isGameOver && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Derailed!</Text>
          <Text style={styles.bannerScore}>Score: {score}</Text>
          <Text style={styles.bannerHint}>Tap to try again</Text>
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
    backgroundColor: "#EAF1FB",
    borderRadius: 16,
  },
  sky: { ...StyleSheet.absoluteFillObject },
  sun: {
    position: "absolute",
    top: 16,
    left: 20,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ACCENT,
    opacity: 0.75,
  },
  ground: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: 3,
    backgroundColor: METAL,
  },
  obstacle: {
    position: "absolute",
    width: OBSTACLE_WIDTH,
    height: OBSTACLE_HEIGHT,
    backgroundColor: METAL,
    borderRadius: 3,
  },
 
  train: {
    position: "absolute",
    width: TRAIN_WIDTH,
    height: 50,
    alignItems: "flex-end",
  },
 
  steamPuff: {
    position: "absolute",
    top: -6,
    right: 14,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#e8e8e8",
  },
 
  bodyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  cab: {
    width: 20,
    height: 26,
    backgroundColor: PRIMARY_DARK,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -1,
  },
  cabWindow: {
    width: 11,
    height: 11,
    backgroundColor: "#CFE0F5",
    borderRadius: 2,
  },
 
  // boiler is position:relative so the chimney (its only child that needs
  // to sit "on top of" it) is anchored to the boiler itself, not to the
  // outer train box — this is what keeps it from drifting out of place.
  boiler: {
    position: "relative",
    width: 34,
    height: 20,
    backgroundColor: PRIMARY,
    borderRadius: 9,
    overflow: "visible",
  },
  chimney: {
    position: "absolute",
    top: -12,
    right: 6,
    width: 8,
    height: 13,
    backgroundColor: PRIMARY,
    borderRadius: 3,
  },
  boilerBand: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 4,
    backgroundColor: ACCENT,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
  },
 
  wheelsRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    marginTop: 1,
  },
  wheel: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: METAL,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 3,
  },
  wheelHub: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
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
    color: PRIMARY,
  },
  bestText: {
    fontSize: 11,
    color: "#5B6478",
  },
  banner: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    maxWidth: "80%",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: PRIMARY,
  },
  bannerScore: {
    marginTop: 2,
    fontSize: 12,
    color: "#444",
  },
  bannerHint: {
    marginTop: 2,
    fontSize: 11,
    color: ACCENT,
    fontWeight: "600",
  },
});