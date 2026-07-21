// components/AnimatedTrainScene.tsx

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ======================================================
// APP THEME
// ======================================================

const PRIMARY = "#0B1B3D";
const PRIMARY_DARK = "#071227";
const ACCENT = "#E8870A";
const METAL = "#3A4256";

const WINDOW = "#CFE0F5";
const SKY = "#EAF1FB";

// ======================================================
// SCENE
// ======================================================

const SCENE_HEIGHT = 200;

const GROUND_Y = 42;

// Track
const SLEEPER_GAP = 26;
const SLEEPER_COUNT = 40;
const TRACK_LOOP_WIDTH = SLEEPER_COUNT * SLEEPER_GAP;

// ======================================================
// TRAIN DIMENSIONS
// ======================================================

// Locomotive
const ENGINE_WIDTH = 60;

// Coaches
const COACH_WIDTH = 64;
const COACH_GAP = 7;

// Complete train width:
//
// Coach + gap + Coach + gap + Engine
//
const FULL_TRAIN_WIDTH =
  COACH_WIDTH * 2 +
  ENGINE_WIDTH +
  COACH_GAP * 2;

// Center the COMPLETE train horizontally
const TRAIN_X =
  (SCREEN_WIDTH - FULL_TRAIN_WIDTH) / 2 - 30;


// ======================================================
// STEAM PUFF
// ======================================================

function SteamPuff({ delayMs }: { delayMs: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );

    const sequence = Animated.sequence([
      Animated.delay(delayMs),
      loop,
    ]);

    sequence.start();

    return () => sequence.stop();
  }, [anim, delayMs]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -22],
  });

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
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
        {
          opacity,
          transform: [
            { translateY },
            { translateX },
            { scale },
          ],
        },
      ]}
    />
  );
}


// ======================================================
// CLOUD
// ======================================================

function Cloud({
  style,
  duration,
  delay,
}: {
  style: object;
  duration: number;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const sequence = Animated.sequence([
      Animated.delay(delay),
      loop,
    ]);

    sequence.start();

    return () => sequence.stop();
  }, [anim, duration, delay]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, SCREEN_WIDTH + 60],
  });

  return (
    <Animated.View
      style={[
        styles.cloud,
        style,
        {
          transform: [{ translateX }],
        },
      ]}
    />
  );
}


// ======================================================
// WHEEL
// ======================================================

function Wheel() {
  return (
    <View style={styles.wheel}>
      <View style={styles.wheelHub} />
    </View>
  );
}


// ======================================================
// COUPLER
// ======================================================

function Coupler() {
  return (
    <View style={styles.coupler}>
      <View style={styles.couplerEnd} />
    </View>
  );
}


// ======================================================
// PASSENGER COACH
// ======================================================

function Coach() {
  return (
    <View style={styles.coachContainer}>

      {/* Wheels stay behind the coach */}
      <View style={styles.coachWheels}>
        <Wheel />
        <Wheel />
      </View>

      {/* Main coach body */}
      <View style={styles.coachBody}>

        {/* Roof */}
        <View style={styles.coachRoof} />

        {/* Windows */}
        <View style={styles.coachWindowsRow}>
          <View style={styles.coachWindow} />
          <View style={styles.coachWindow} />
          <View style={styles.coachWindow} />
        </View>

        {/* Orange lower stripe */}
        <View style={styles.coachAccentBand} />

      </View>

    </View>
  );
}


// ======================================================
// LOCOMOTIVE
// ======================================================

function Engine() {
  return (
    <View style={styles.engineContainer}>

      {/* Smoke */}
      <SteamPuff delayMs={0} />
      <SteamPuff delayMs={500} />

      {/* Wheels BEHIND body */}
      <View style={styles.engineWheels}>
        <Wheel />
        <Wheel />
      </View>

      {/* Engine body */}
      <View style={styles.engineBodyRow}>

        {/* CAB */}
        <View style={styles.cab}>
          <View style={styles.cabWindow} />
        </View>

        {/* BOILER */}
        <View style={styles.boiler}>

          {/* Chimney */}
          <View style={styles.chimney}>
            <View style={styles.chimneyTop} />
          </View>

          {/* Boiler accent */}
          <View style={styles.boilerBand} />

        </View>

      </View>

    </View>
  );
}


// ======================================================
// MAIN COMPONENT
// ======================================================

export default function AnimatedTrainScene() {

  const trackScroll =
    useRef(new Animated.Value(0)).current;

  const bob =
    useRef(new Animated.Value(0)).current;


  // ====================================================
  // ANIMATIONS
  // ====================================================

  useEffect(() => {

    // --------------------------------------------
    // TRACK MOVEMENT
    // --------------------------------------------

    const trackLoop = Animated.loop(
      Animated.timing(trackScroll, {
        toValue: -TRACK_LOOP_WIDTH,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );


    // --------------------------------------------
    // WHOLE TRAIN BOBBING
    // --------------------------------------------

    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -2,
          duration: 220,
          useNativeDriver: true,
        }),

        Animated.timing(bob, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ])
    );


    trackLoop.start();
    bobLoop.start();


    return () => {
      trackLoop.stop();
      bobLoop.stop();
    };

  }, [trackScroll, bob]);


  // ====================================================
  // UI
  // ====================================================

  return (
    <View style={styles.scene}>

      {/* ============================================== */}
      {/* SKY */}
      {/* ============================================== */}

      <View style={styles.sun} />


      <Cloud
        style={{
          top: 22,
          width: 46,
          height: 16,
        }}
        duration={14000}
        delay={0}
      />


      <Cloud
        style={{
          top: 42,
          width: 34,
          height: 12,
        }}
        duration={18000}
        delay={4000}
      />


      <Cloud
        style={{
          top: 14,
          width: 30,
          height: 11,
        }}
        duration={16000}
        delay={9000}
      />


      {/* ============================================== */}
      {/* MOVING TRACK SLEEPERS */}
      {/* ============================================== */}

      <Animated.View
        style={[
          styles.sleepersRow,
          {
            bottom: GROUND_Y - 4,

            transform: [
              {
                translateX: trackScroll,
              },
            ],
          },
        ]}
      >

        {Array.from({
          length: SLEEPER_COUNT * 2,
        }).map((_, i) => (

          <View
            key={i}
            style={styles.sleeper}
          />

        ))}

      </Animated.View>


      {/* ============================================== */}
      {/* RAIL */}
      {/* ============================================== */}

      <View
        style={[
          styles.rail,
          {
            bottom: GROUND_Y,
          },
        ]}
      />


      {/* ============================================== */}
      {/* COMPLETE TRAIN */}
      {/* ============================================== */}

      <Animated.View
        style={[
          styles.fullTrain,

          {
            left: TRAIN_X,

            bottom: GROUND_Y - 1,

            transform: [
              {
                translateY: bob,
              },
            ],
          },
        ]}
      >

        {/* ========================================== */}
        {/* COACH 2 — BACK */}
        {/* ========================================== */}

        <Coach />


        {/* COUPLER */}
        <Coupler />


        {/* ========================================== */}
        {/* COACH 1 */}
        {/* ========================================== */}

        <Coach />


        {/* COUPLER */}
        <Coupler />


        {/* ========================================== */}
        {/* ENGINE */}
        {/* ========================================== */}

        <Engine />

      </Animated.View>

    </View>
  );
}


// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  // ====================================================
  // SCENE
  // ====================================================

  scene: {
    width: "100%",
    height: SCENE_HEIGHT,

    overflow: "hidden",

    backgroundColor: SKY,

    borderRadius: 16,
  },


  // ====================================================
  // SKY
  // ====================================================

  sun: {
    position: "absolute",

    top: 16,
    right: 24,

    width: 28,
    height: 28,

    borderRadius: 14,

    backgroundColor: ACCENT,

    opacity: 0.85,
  },


  cloud: {
    position: "absolute",

    borderRadius: 999,

    backgroundColor: "#FFFFFF",

    opacity: 0.9,
  },


  // ====================================================
  // TRACK
  // ====================================================

  sleepersRow: {
    position: "absolute",

    left: 0,

    flexDirection: "row",

    height: 7,
  },


  sleeper: {
    width: 12,
    height: 7,

    marginRight:
      SLEEPER_GAP - 12,

    backgroundColor: METAL,

    borderRadius: 2,

    opacity: 0.6,
  },


  rail: {
    position: "absolute",

    left: 0,

    width: "100%",

    height: 3,

    backgroundColor: METAL,
  },


  // ====================================================
  // COMPLETE TRAIN
  // ====================================================

  fullTrain: {
    position: "absolute",

    width: FULL_TRAIN_WIDTH,

    height: 42,

    flexDirection: "row",

    alignItems: "flex-end",
  },


  // ====================================================
  // ENGINE CONTAINER
  // ====================================================

  engineContainer: {
    position: "relative",

    width: ENGINE_WIDTH,
    height: 42,
  },


  // ====================================================
  // ENGINE BODY
  // ====================================================

  engineBodyRow: {
    position: "absolute",

    left: 0,

    bottom: 8,

    flexDirection: "row",

    alignItems: "flex-end",

    zIndex: 3,
  },


  cab: {
    width: 20,
    height: 26,

    backgroundColor:
      PRIMARY_DARK,

    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,

    alignItems: "center",

    justifyContent: "center",

    marginRight: -1,
  },


  cabWindow: {
    width: 11,
    height: 11,

    backgroundColor: WINDOW,

    borderRadius: 2,
  },


  boiler: {
    position: "relative",

    width: 34,
    height: 20,

    backgroundColor: PRIMARY,

    borderRadius: 9,
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


  // ====================================================
  // CHIMNEY
  // ====================================================

  chimney: {
    position: "absolute",

    top: -12,
    right: 6,

    width: 8,
    height: 13,

    backgroundColor: PRIMARY,

    borderRadius: 3,

    zIndex: 4,
  },


  chimneyTop: {
    position: "absolute",

    top: -2,
    left: -2,

    width: 12,
    height: 4,

    borderRadius: 2,

    backgroundColor: PRIMARY_DARK,
  },


  // ====================================================
  // ENGINE WHEELS
  // ====================================================

  engineWheels: {
    position: "absolute",

    bottom: 0,

    left: -3,

    width: 52,

    flexDirection: "row",

    justifyContent: "space-around",

    zIndex: 1,
  },


  // ====================================================
  // WHEEL
  // ====================================================

  wheel: {
    width: 16,
    height: 16,

    borderRadius: 8,

    backgroundColor: METAL,

    alignItems: "center",

    justifyContent: "center",
  },


  wheelHub: {
    width: 6,
    height: 6,

    borderRadius: 3,

    backgroundColor: ACCENT,
  },


  // ====================================================
  // COACH
  // ====================================================

  coachContainer: {
    position: "relative",

    width: COACH_WIDTH,
    height: 42,
  },


  coachBody: {
    position: "absolute",

    left: 0,

    bottom: 8,

    width: COACH_WIDTH,
    height: 25,

    backgroundColor: PRIMARY,

    borderRadius: 5,

    zIndex: 3,

    overflow: "hidden",
  },


  // ====================================================
  // COACH ROOF
  // ====================================================

  coachRoof: {
    position: "absolute",

    top: 0,
    left: 0,

    width: "100%",
    height: 5,

    backgroundColor: PRIMARY_DARK,
  },


  // ====================================================
  // COACH WINDOWS
  // ====================================================

  coachWindowsRow: {
    position: "absolute",

    top: 7,

    left: 7,
    right: 7,

    flexDirection: "row",

    justifyContent: "space-between",
  },


  coachWindow: {
    width: 13,
    height: 10,

    backgroundColor: WINDOW,

    borderRadius: 2,

    borderWidth: 1,

    borderColor: PRIMARY_DARK,
  },


  // ====================================================
  // COACH ACCENT
  // ====================================================

  coachAccentBand: {
    position: "absolute",

    left: 0,
    bottom: 0,

    width: "100%",
    height: 4,

    backgroundColor: ACCENT,
  },


  // ====================================================
  // COACH WHEELS
  // ====================================================

  coachWheels: {
    position: "absolute",

    bottom: 0,

    left: 5,
    right: 5,

    flexDirection: "row",

    justifyContent: "space-between",

    zIndex: 1,
  },


  // ====================================================
  // COUPLER
  // ====================================================

  coupler: {
    width: COACH_GAP,

    height: 4,

    marginBottom: 13,

    backgroundColor: METAL,

    alignItems: "center",

    justifyContent: "center",
  },


  couplerEnd: {
    width: 4,
    height: 7,

    borderRadius: 2,

    backgroundColor: PRIMARY_DARK,
  },


  // ====================================================
  // SMOKE
  // ====================================================

  steamPuff: {
    position: "absolute",

    top: -5,

    // Chimney is near right side of engine
    right: 14,

    width: 11,
    height: 11,

    borderRadius: 5.5,

    backgroundColor: "#9e9c9c",

    zIndex: 10,
  },

});