import React, { useEffect, useRef } from "react";
import {
  TextInput,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { moderateScale } from "../utils/responsive";

/* ======================================================
   DIMENSIONS
====================================================== */

const BOX_WIDTH = moderateScale(42);
const BOX_HEIGHT = moderateScale(52);
const GAP = moderateScale(7);

const ROW_HEIGHT = BOX_HEIGHT + moderateScale(24);
const ORBIT_RADIUS = moderateScale(82);

const EXPANDED_HEIGHT =
  ORBIT_RADIUS * 2 + BOX_HEIGHT + moderateScale(20);

/* ======================================================
   COLORS
====================================================== */

const ACCENT = "#E8870A";
const NAVY = "#1A2744";

const IDLE_BORDER = "#D8DEE9";
const IDLE_FILL = "#FFFFFF";
const ACTIVE_FILL = "#FFF8EF";

const ERROR = "#D32F2F";
const ERROR_FILL = "#FDECEC";

/* ======================================================
   TYPES
====================================================== */

interface RadialOtpBoxesProps {
  otp: string[];
  focusedIndex: number;
  otpError: string;
  isVerifying: boolean;

  inputRefs: React.MutableRefObject<(TextInput | null)[]>;

  onFocus: (index: number) => void;
  onBlur: () => void;
  onChangeText: (text: string, index: number) => void;
  onKeyPress: (index: number, key: string) => void;
}

/* ======================================================
   COMPONENT
====================================================== */

const RadialOtpBoxes: React.FC<RadialOtpBoxesProps> = ({
  otp,
  focusedIndex,
  otpError,
  isVerifying,
  inputRefs,
  onFocus,
  onBlur,
  onChangeText,
  onKeyPress,
}) => {
  const count = otp.length;

  const step = BOX_WIDTH + GAP;

  const rowWidth =
    count * BOX_WIDTH +
    (count - 1) * GAP;

  /* ====================================================
     ANIMATED VALUES
  ==================================================== */

  // 0 = horizontal row
  // 1 = circular arrangement
  const radialProgress = useRef(
    new Animated.Value(0)
  ).current;

  // 0 -> 1 = one complete orbit
  const orbitProgress = useRef(
    new Animated.Value(0)
  ).current;

  // Used for shrinking/converging the whole arrangement
  const groupScale = useRef(
    new Animated.Value(1)
  ).current;

  const groupOpacity = useRef(
    new Animated.Value(1)
  ).current;

  /*
   * Drives the container height.
   *
   * IMPORTANT:
   * This used to be a LayoutAnimation call running in
   * parallel with the Animated-driven box transforms.
   * Two separate animation engines writing to the same
   * view hierarchy at once (one via the native layout
   * system, one via Animated) is what caused the
   * mid-motion stutter/jump — they don't share a clock.
   *
   * Now everything is a single Animated.Value living on
   * the same scheduler as radialProgress/orbitProgress,
   * so the container grows in lockstep with the boxes
   * instead of racing them.
   *
   * height can't use the native driver, but that's fine —
   * it just needs to stay on Animated's timing loop, not
   * a separate native layout pass.
   */
  const heightProgress = useRef(
    new Animated.Value(0)
  ).current;

  /* ====================================================
     REFS
  ==================================================== */

  const orbitLoop = useRef<
    Animated.CompositeAnimation | null
  >(null);

  const enterTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  /*
   * Tells us that an actual verification has started.
   * This prevents initial render from being mistaken
   * for a successful verification.
   */
  const verificationStarted = useRef(false);

  /*
   * Prevent stale callbacks from starting an orbit
   * after verification has already finished.
   */
  const animationGeneration = useRef(0);

  /*
   * Prevent success from firing after a wrong OTP.
   */
  const errorHandled = useRef(false);

  /* ====================================================
     HELPERS
  ==================================================== */

  const clearEnterTimer = () => {
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
  };

  const stopOrbit = () => {
    animationGeneration.current += 1;

    clearEnterTimer();

    if (orbitLoop.current) {
      orbitLoop.current.stop();
      orbitLoop.current = null;
    }
  };

  /* ====================================================
     START VERIFYING
  ==================================================== */

  useEffect(() => {
    if (!isVerifying || otpError) {
      return;
    }

    verificationStarted.current = true;
    errorHandled.current = false;

    stopOrbit();

    const generation =
      animationGeneration.current;

    /* Reset previous state */

    radialProgress.stopAnimation();
    orbitProgress.stopAnimation();
    groupScale.stopAnimation();
    groupOpacity.stopAnimation();
    heightProgress.stopAnimation();

    radialProgress.setValue(0);
    orbitProgress.setValue(0);

    groupScale.setValue(1);
    groupOpacity.setValue(1);

    /* -----------------------------------------------
       Expand the available area

       Runs on the same Animated clock as everything
       else below, instead of a separate LayoutAnimation
       pass — this is what keeps it from fighting the
       row -> circle transform.
    ----------------------------------------------- */

    Animated.timing(heightProgress, {
      toValue: 1,
      duration: 280,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();

    /* -----------------------------------------------
       Row -> Circle
    ----------------------------------------------- */

    enterTimer.current = setTimeout(() => {
      if (
        generation !==
        animationGeneration.current
      ) {
        return;
      }

      Animated.timing(radialProgress, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;

        if (
          generation !==
          animationGeneration.current
        ) {
          return;
        }

        /*
         * Verification may have completed while
         * the row -> circle animation was running.
         */
        if (!isVerifying) {
          return;
        }

        /* -----------------------------------------
           Start continuous orbit
        ----------------------------------------- */

        orbitProgress.setValue(0);

        orbitLoop.current = Animated.loop(
          Animated.timing(orbitProgress, {
            toValue: 1,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );

        orbitLoop.current.start();
      });
    }, 160);

    return () => {
      clearEnterTimer();
    };
  }, [isVerifying]);

  /* ====================================================
     WRONG OTP

     Orbit
       ↓
     freeze
       ↓
     fade + subtle shrink
       ↓
     invisible reset
       ↓
     red row fades back in
  ==================================================== */

  useEffect(() => {
    if (!otpError) {
      return;
    }

    errorHandled.current = true;
    verificationStarted.current = false;

    stopOrbit();

    radialProgress.stopAnimation();
    groupScale.stopAnimation();
    groupOpacity.stopAnimation();

    /*
     * Freeze the orbit exactly where it currently is.
     * Do NOT reset orbitProgress yet.
     */
    orbitProgress.stopAnimation(() => {
      /* ---------------------------------------------
         Phase 1:
         fade the circular arrangement away
      --------------------------------------------- */

      Animated.parallel([
        Animated.timing(groupOpacity, {
          toValue: 0,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),

        Animated.timing(groupScale, {
          toValue: 0.9,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) {
          return;
        }

        /*
         * The boxes are now invisible.
         *
         * Reset everything to horizontal mode while
         * the user cannot see the position change.
         */

        radialProgress.setValue(0);
        orbitProgress.setValue(0);

        groupScale.setValue(0.96);

        /* -------------------------------------------
           Shrink the layout back to row height

           Same Animated clock as the rest of the
           sequence — no LayoutAnimation here either.
        ------------------------------------------- */

        Animated.timing(heightProgress, {
          toValue: 0,
          duration: 260,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }).start();

        /* -------------------------------------------
           Phase 2:
           premium red row entrance
        ------------------------------------------- */

        setTimeout(() => {
          Animated.parallel([
            Animated.timing(groupOpacity, {
              toValue: 1,
              duration: 260,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),

            Animated.spring(groupScale, {
              toValue: 1,
              friction: 8,
              tension: 85,
              useNativeDriver: true,
            }),
          ]).start();
        }, 60);
      });
    });
  }, [otpError]);

  /* ====================================================
     CORRECT OTP

     Orbit
       ↓
     freeze
       ↓
     converge toward center
       ↓
     shrink + fade
       ↓
     VerifiedSuccess starts from same center
  ==================================================== */

  useEffect(() => {
    if (isVerifying) {
      return;
    }

    if (otpError) {
      return;
    }

    if (!verificationStarted.current) {
      return;
    }

    if (errorHandled.current) {
      return;
    }

    verificationStarted.current = false;

    stopOrbit();

    radialProgress.stopAnimation();
    groupScale.stopAnimation();
    groupOpacity.stopAnimation();

    /*
     * Freeze the orbit at its current angle.
     */
    orbitProgress.stopAnimation(() => {
      /* ---------------------------------------------
         Phase 1:
         collapse the orbit radius toward center
      --------------------------------------------- */

      Animated.timing(radialProgress, {
        /*
         * We don't use radialProgress for convergence
         * here because 0 means "horizontal row".
         *
         * Keep it circular and shrink the whole
         * coordinate system using groupScale.
         */
        toValue: 1,
        duration: 80,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => {
        Animated.parallel([
          /*
           * Six boxes visually collapse toward the
           * center because all translate coordinates
           * are multiplied by groupScale below.
           */
          Animated.timing(groupScale, {
            toValue: 0.08,
            duration: 420,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),

          /*
           * Keep the boxes visible during most of
           * the convergence, then softly disappear.
           */
          Animated.timing(groupOpacity, {
            toValue: 0,
            duration: 170,
            delay: 290,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      });
    });
  }, [isVerifying, otpError]);

  /* ====================================================
     CLEANUP
  ==================================================== */

  useEffect(() => {
    return () => {
      stopOrbit();

      radialProgress.stopAnimation();
      orbitProgress.stopAnimation();
      groupScale.stopAnimation();
      groupOpacity.stopAnimation();
      heightProgress.stopAnimation();
    };
  }, []);

  /* ====================================================
     DERIVED
  ==================================================== */

  const containerHeight = heightProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [ROW_HEIGHT, EXPANDED_HEIGHT],
  });

  /* ====================================================
     RENDER
  ==================================================== */

  return (
    <Animated.View
      style={[
        styles.outerStage,
        {
          /*
           * JS-driven height lives on its OWN view/style
           * node. It must never share a style object with
           * a native-driven value (opacity, transforms) —
           * doing so forces RN to try pushing the whole
           * node to the native side, and height isn't
           * supported there.
           */
          height: containerHeight,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.innerStage,
          {
            opacity: groupOpacity,
          },
        ]}
      >
      {otp.map((digit, i) => {
        const filled = !!digit;
        const active =
          focusedIndex === i;

        /* ============================================
           NORMAL ROW POSITION
        ============================================ */

        const rowX =
          i * step +
          BOX_WIDTH / 2 -
          rowWidth / 2;

        /* ============================================
           CIRCLE POSITION
        ============================================ */

        const startingAngle =
          -90 +
          i * (360 / count);

        /*
         * Approximate the circle with enough
         * interpolation samples to keep it smooth.
         */
        const samples = 36;

        const inputRange =
          Array.from(
            {
              length: samples + 1,
            },
            (_, index) =>
              index / samples
          );

        const circleX =
          inputRange.map((value) => {
            const degrees =
              startingAngle +
              value * 360;

            const radians =
              (degrees * Math.PI) /
              180;

            return (
              Math.cos(radians) *
              ORBIT_RADIUS
            );
          });

        const circleY =
          inputRange.map((value) => {
            const degrees =
              startingAngle +
              value * 360;

            const radians =
              (degrees * Math.PI) /
              180;

            return (
              Math.sin(radians) *
              ORBIT_RADIUS
            );
          });

        const orbitX =
          orbitProgress.interpolate({
            inputRange,
            outputRange: circleX,
          });

        const orbitY =
          orbitProgress.interpolate({
            inputRange,
            outputRange: circleY,
          });

        /* ============================================
           ROW <-> CIRCLE
        ============================================ */

        const inverseRadial =
          Animated.subtract(
            1,
            radialProgress
          );

        const baseX =
          Animated.add(
            Animated.multiply(
              rowX,
              inverseRadial
            ),

            Animated.multiply(
              orbitX,
              radialProgress
            )
          );

        const baseY =
          Animated.multiply(
            orbitY,
            radialProgress
          );

        /* ============================================
           GROUP SCALE

           This is what makes success genuinely
           converge into the exact center.

           scale = 1:
              normal positions

           scale = 0:
              x/y all become zero
        ============================================ */

        const finalX =
          Animated.multiply(
            baseX,
            groupScale
          );

        const finalY =
          Animated.multiply(
            baseY,
            groupScale
          );

        return (
          <Animated.View
            key={i}
            style={[
              styles.boxOuter,
              {
                /*
                 * Important:
                 *
                 * translateX/Y converge toward zero,
                 * while the box itself also becomes
                 * slightly smaller.
                 */
                transform: [
                  {
                    translateX:
                      finalX,
                  },
                  {
                    translateY:
                      finalY,
                  },
                  {
                    scale:
                      groupScale,
                  },
                ],
              },
            ]}
          >
            <TextInput
              ref={(ref) => {
                inputRefs.current[i] =
                  ref;
              }}
              value={digit}
              style={[
                styles.box,

                active &&
                  styles.boxActive,

                filled &&
                  styles.boxFilled,

                !!otpError &&
                  styles.boxError,
              ]}
              onFocus={() =>
                onFocus(i)
              }
              onBlur={onBlur}
              cursorColor={ACCENT}
              selectionColor={ACCENT}
              keyboardType="number-pad"
              maxLength={1}
              editable={!isVerifying}
              onChangeText={(text) =>
                onChangeText(
                  text,
                  i
                )
              }
              onKeyPress={({
                nativeEvent,
              }) =>
                onKeyPress(
                  i,
                  nativeEvent.key
                )
              }
            />
          </Animated.View>
        );
      })}
      </Animated.View>
    </Animated.View>
  );
};

export default RadialOtpBoxes;

/* ======================================================
   STYLES
====================================================== */

const styles =
  StyleSheet.create({
    outerStage: {
      width: "100%",

      marginTop:
        moderateScale(14),

      marginBottom:
        moderateScale(14),

      overflow: "visible",
    },

    /*
     * Fills outerStage via flex: 1, so it always matches
     * outerStage's animated height exactly. This is the
     * positioning anchor for boxOuter's left/top: "50%".
     */
    innerStage: {
      flex: 1,
      width: "100%",

      overflow: "visible",
    },

    /*
     * This is the common origin for:
     *
     * horizontal row
     * orbit
     * success convergence
     *
     * KEEP THIS AT 50%.
     */
    boxOuter: {
      position: "absolute",

      left: "50%",
      top: "50%",

      marginLeft:
        -BOX_WIDTH / 2,

      marginTop:
        -BOX_HEIGHT / 2,
    },

    box: {
      width: BOX_WIDTH,
      height: BOX_HEIGHT,

      borderRadius:
        moderateScale(14),

      borderWidth: 1.5,

      borderColor:
        IDLE_BORDER,

      backgroundColor:
        IDLE_FILL,

      fontSize:
        moderateScale(22),

      color: NAVY,

      textAlign: "center",

      padding: 0,
    },

    boxActive: {
      borderColor: ACCENT,

      backgroundColor:
        ACTIVE_FILL,

      borderWidth: 2,
    },

    boxFilled: {
      borderColor: ACCENT,
    },

    boxError: {
      borderColor: ERROR,

      backgroundColor:
        ERROR_FILL,
    },
  });