import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useTheme } from "../../theme/useTheme";
export default function CalendarScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const { brand, base, text, status } = colors;

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const tasks: Record<string, { title: string; descp: string }[]> = {
    [today]: [
      {title: "React Native Learning", descp: "Complete the learning of React Native"
       },
    ],
    "2026-06-20": [
      { title: "Project Meeting", descp: "Everyone should be present for this meeting" },
    ],
    "2026-06-24": [
      { title: "Submit Presentation", descp: "Complete and submit the presentation" },
    ],
    "2026-06-15": [
      { title: "Submit Railway Assignment", descp: "Assignment needs to be submitted" },
    ],
  };

  return (
    <View style={[styles.container, { backgroundColor: base.background }]}>
      <View style={[styles.header, { backgroundColor: brand.primary }]}>
        <Text style={[styles.headerText, { color: base.surfaceL1 }]}>
          Calendar
        </Text>
      </View>

      <Calendar
        current={today}
        theme={{
          textMonthFontFamily: "Poppins-SemiBold",
          textDayFontFamily: "Poppins-Regular",
          textDayHeaderFontFamily: "Poppins-Medium",
          monthTextColor: brand.primary,
          arrowColor: brand.accent,
          textMonthFontSize: 20,
          textSectionTitleColor: brand.primary,
          calendarBackground: base.background,
        }}
        dayComponent={({ date }) => {
          if (!date) return null;
          const dateString = date.dateString;
          const isToday = dateString === today;
          const isSelected = dateString === selectedDate;
          const hasTask = tasks[dateString] !== undefined;

          return (
            <Pressable
              onPress={() => setSelectedDate(dateString)}
              style={styles.dayContainer}
            >
              <View
                style={[
                  styles.dayBox,
                  isSelected && {
                    borderWidth: 2,
                    borderColor: brand.accent,
                    backgroundColor: base.surfaceL2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: text.primary },
                    isToday && { color: brand.accent },
                    isSelected && { color: text.primary },
                  ]}
                >
                  {date.day}
                </Text>
              </View>

              {hasTask && (
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        dateString < today ? status.overdue : brand.accent,
                    },
                  ]}
                />
              )}
            </Pressable>
          );
        }}
      />

      <ScrollView style={styles.taskSection}>
        <Text style={[styles.taskHeading, { color: brand.primary }]}>
          Tasks for {selectedDate}
        </Text>

        {tasks[selectedDate]?.length ? (
          tasks[selectedDate].map((task, index) => (
            <View
              key={index}
              style={[
                styles.taskCard,
                {
                  backgroundColor: base.surfaceL1,
                  borderLeftColor: brand.accent,
                },
              ]}
            >
              <Text style={[styles.taskTitle, { color: text.primary }]}>
                {task.title}
              </Text>
              <Text style={[styles.taskDesc, { color: text.secondary }]}>
                {task.descp}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: text.secondary }]}>
            No tasks for this day
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    height: 70,
    justifyContent: "center",
    paddingLeft: 30,
    marginTop: 40,
  },

  headerText: {
    fontSize: 24,
    fontFamily: "Poppins-SemiBold",
  },

  dayContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  dayBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  dayText: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },

  taskSection: {
    flex: 1,
    padding: 20,
  },

  taskHeading: {
    fontSize: 20,
    fontFamily:"Poppins-Medium",
    marginBottom: 15,
  },

  taskCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 5,
  },

  taskTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
  },

  taskDesc: {
    marginTop: 5,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },

  emptyText: {
    marginTop: 20,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
  },
});