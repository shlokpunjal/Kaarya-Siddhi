import React from "react";
import { View, StyleSheet } from "react-native";

interface ProgressTrackProps {
  progress?: number; // 0 - 1
  color?: string;
}

const ProgressTrack: React.FC<ProgressTrackProps> = ({
  progress = 0,
  color = "#E8870A",
}) => {
  return (
    <View style={styles.container}>
      {/* Base Track */}
      <View style={styles.track}>
        <View
          style={[
            styles.progress,
            {
              width: `${Math.max(0, Math.min(progress, 1)) * 100}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>

      {/* Destination Station */}
      <View style={styles.station}>
        <View style={styles.stationOuter}>
          <View style={[styles.stationInner, { backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
};

export default ProgressTrack;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 34,
    justifyContent: "center",
  },

  track: {
    height: 4,
    borderRadius: 3,
    backgroundColor: "#D7DDE6",
    overflow: "hidden",
    marginRight: 18,
  },

  progress: {
    height: "100%",
    borderRadius: 3,
  },

  station: {
    position: "absolute",
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  stationOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#D7DDE6",
    alignItems: "center",
    justifyContent: "center",
  },

  stationInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});