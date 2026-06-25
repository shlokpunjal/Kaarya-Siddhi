import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import React from 'react';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
// import { mockTasks } from '../(data)/mocktasks';
import { mockTasks } from '../../data/mockTasks';
import { lightTheme, typography } from '../../theme/theme';

const { colors } = lightTheme;

export default function Dashboard() {
  const router = useRouter();
  const [showOverdue, setShowOverdue] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>

        {/* Top section */}
        <View>
          <Text style={{
            ...typography.subheading,
            marginTop: 20, marginLeft: 15,
            color: colors.text.secondary,
          }}>Good Morning!</Text>

          <Text style={{
            ...typography.heading,
            marginTop: 5, marginLeft: 15,
            color: colors.text.primary,
          }}>Your Task Overview</Text>

          {/* Stats Box */}
          <View style={{
            backgroundColor:"#FFFFFF",
            marginTop: 25, margin: 25, height: 140, borderRadius: 25,
            flexDirection: "row", alignItems: "center", justifyContent: "space-around",
            boxShadow: "0px 0px 5px gray"
          }}>
            {/* Overdue */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                height: 63, width: 63, borderRadius: 40,
                backgroundColor: "rgba(239,133,143,0.4)",
                borderColor: colors.status.overdue,
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ ...typography.heading, color: colors.status.overdue }}>2</Text>
              </View>
              <Text style={{ ...typography.body, marginTop: 10, color: colors.status.overdue }}>Overdue</Text>
            </View>

            {/* Pending */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                height: 63, width: 63, borderRadius: 40,
                backgroundColor: "rgba(255, 192, 104, 0.3)",
                borderColor: colors.status.pending,
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ ...typography.heading, color: colors.status.pending }}>10</Text>
              </View>
              <Text style={{ ...typography.body, marginTop: 10, color: colors.status.pending }}>Pending</Text>
            </View>

            {/* In Review */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                height: 63, width: 63, borderRadius: 40,
                backgroundColor: "rgba(100,150,255,0.2)",
                borderColor: colors.status.inReview,
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ ...typography.heading, color: colors.status.inReview }}>5</Text>
              </View>
              <Text style={{ ...typography.body, marginTop: 10, color: colors.status.inReview }}>In Review</Text>
            </View>

            {/* Completed */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                height: 63, width: 63, borderRadius: 40,
                backgroundColor: "rgba(100,220,120,0.2)",
                borderColor: colors.status.completed,
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ ...typography.heading, color: colors.status.completed }}>0</Text>
              </View>
              <Text style={{ ...typography.body, marginTop: 10, color: colors.status.completed }}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Buttons Row */}
        <View style={{ flexDirection: "row", gap: 20 }}>
          <View style={{ marginLeft: 48 }}>
            <TouchableOpacity
              onPress={() => router.push("/newtask")}
              style={{
                backgroundColor: colors.brand.accent, padding: 14,
                width: 200, height: 60, borderRadius: 20,
                boxShadow: "0px 0px 5px gray", flexDirection: "row",
              }}
            >
              <Ionicons name="add" size={35} color={colors.base.surfaceL1} />
              <Text style={{
                ...typography.subheading,
                color: colors.base.surfaceL1,
                textAlign: "center"
              }}> New Task</Text>
            </TouchableOpacity>
          </View>

          <View style={{
            boxShadow: "0px 0px 5px gray", borderRadius: 30,
            backgroundColor: colors.base.surfaceL2,
            height: 58, width: 80, alignItems: "center", justifyContent: "center"
          }}>
            <Ionicons name="search" size={30} color={colors.brand.accent} />
          </View>
        </View>

        {/* ---- Overdue Section ---- */}
        <View style={{
          width: 320, marginTop: 30, marginLeft: 33,
          borderColor: colors.base.border, borderWidth: 1, borderRadius: 19,
          backgroundColor:"#FFFFFF",
        }}>
          <View style={{
            height: 60, borderRadius: 20, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
          }}>
            <Text style={{ ...typography.subheading, color: colors.status.overdue }}>Overdue</Text>
            <TouchableOpacity onPress={() => setShowOverdue(!showOverdue)}>
              <Ionicons
                name={showOverdue ? "chevron-up-outline" : "chevron-down-outline"}
                size={30} color={colors.base.surfaceL1}
                style={{ backgroundColor: colors.status.overdue, borderRadius: 10, padding: 2 }}
              />
            </TouchableOpacity>
          </View>
          {showOverdue && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {mockTasks
                .filter(task => task.status === "overdue")
                .map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => router.push({
                      pathname: '/(task)/task-detail',
                      params: { taskId: task.id }
                    })}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      backgroundColor: colors.base.surfaceL2,
                      borderRadius: 12, padding: 12, marginBottom: 8,
                      gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10
                    }}
                  >
                    <View style={{
                      height: 24, width: 24, borderRadius: 12, borderWidth: 2,
                      borderColor: colors.status.overdue, alignItems: "center", justifyContent: "center",
                    }}>
                      <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: colors.status.overdue }} />
                    </View>
                    <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title }</Text>
                  </TouchableOpacity>
                ))
              }
            </View>
          )}
        </View>

        {/* ---- Pending Section ---- */}
        <View style={{
          width: 320, marginTop: 20, marginLeft: 33,
          borderColor: colors.base.border, borderWidth: 1, borderRadius: 19,
          backgroundColor: colors.base.surfaceL1,
        }}>
          <View style={{
            height: 60, borderRadius: 20, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
          }}>
            <Text style={{ ...typography.subheading, color: colors.status.pending }}>Pending</Text>
            <TouchableOpacity onPress={() => setShowPending(!showPending)}>
              <Ionicons
                name={showPending ? "chevron-up-outline" : "chevron-down-outline"}
                size={30} color={colors.base.surfaceL1}
                style={{ backgroundColor: colors.status.pending, borderRadius: 10, padding: 2 }}
              />
            </TouchableOpacity>
          </View>
          {showPending && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {mockTasks
                .filter(task => task.status === "pending")
                .map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => router.push({
                      pathname: '/(task)/task-detail',
                      params: { taskId: task.id }
                    })}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      backgroundColor: colors.base.surfaceL2,
                      borderRadius: 12, padding: 12, marginBottom: 8,
                      gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10
                    }}
                  >
                    <View style={{
                      height: 24, width: 24, borderRadius: 12, borderWidth: 2,
                      borderColor: colors.status.pending, alignItems: "center", justifyContent: "center",
                    }}>
                      <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: colors.status.pending }} />
                    </View>
                    <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
                  </TouchableOpacity>
                ))
              }
            </View>
          )}
        </View>

        {/* ---- In Review Section ---- */}
        <View style={{
          width: 320, marginTop: 20, marginLeft: 33,
          borderColor: colors.base.border, borderWidth: 1, borderRadius: 19,
          backgroundColor: colors.base.surfaceL1,
        }}>
          <View style={{
            height: 60, borderRadius: 20, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
          }}>
            <Text style={{ ...typography.subheading, color: colors.status.inReview }}>In Review</Text>
            <TouchableOpacity onPress={() => setShowReview(!showReview)}>
              <Ionicons
                name={showReview ? "chevron-up-outline" : "chevron-down-outline"}
                size={30} color={colors.base.surfaceL1}
                style={{ backgroundColor: colors.status.inReview, borderRadius: 10, padding: 2 }}
              />
            </TouchableOpacity>
          </View>
          {showReview && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {mockTasks
                .filter(task => task.status === "inReview")
                .map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => router.push({
                      pathname: '/(task)/task-detail',
                      params: { taskId: task.id }
                    })}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      backgroundColor: colors.base.surfaceL2,
                      borderRadius: 12, padding: 12, marginBottom: 8,
                      gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10
                    }}
                  >
                    <View style={{
                      height: 24, width: 24, borderRadius: 12, borderWidth: 2,
                      borderColor: colors.status.inReview, alignItems: "center", justifyContent: "center",
                    }}>
                      <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: colors.status.inReview }} />
                    </View>
                    <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
                  </TouchableOpacity>
                ))
              }
            </View>
          )}
        </View>

        {/* ---- Completed Section ---- */}
        <View style={{
          width: 320, marginTop: 20, marginLeft: 33,
          borderColor: colors.base.border, borderWidth: 1, borderRadius: 19,
          backgroundColor: colors.base.surfaceL1,
        }}>
          <View style={{
            height: 60, borderRadius: 20, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
          }}>
            <Text style={{ ...typography.subheading, color: colors.status.completed }}>Completed</Text>
            <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)}>
              <Ionicons
                name={showCompleted ? "chevron-up-outline" : "chevron-down-outline"}
                size={30} color={colors.base.surfaceL1}
                style={{ backgroundColor: colors.status.completed, borderRadius: 10, padding: 2 }}
              />
            </TouchableOpacity>
          </View>
          {showCompleted && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {mockTasks
                .filter(task => task.status === "completed")
                .map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => router.push({
                      pathname: '/(task)/task-detail',
                      params: { taskId: task.id }
                    })}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      backgroundColor: colors.base.surfaceL2,
                      borderRadius: 12, padding: 12, marginBottom: 8,
                      gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10
                    }}
                  >
                    <View style={{
                      height: 24, width: 24, borderRadius: 12, borderWidth: 2,
                      borderColor: colors.status.completed, alignItems: "center", justifyContent: "center",
                    }}>
                      <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: colors.status.completed }} />
                    </View>
                    <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
                  </TouchableOpacity>
                ))
              }
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}