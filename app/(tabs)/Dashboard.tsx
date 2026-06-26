import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import React from 'react';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native";


export default function Dashboard() {
  const router = useRouter();
  const [showOverdue, setShowOverdue] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isLoggedIn) {
        router.replace("/dashboard");
      } else {
        router.replace("/AdminLogin");
      }
    }
  }, [isLoading, isLoggedIn]);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        

        {/* Top section */}
        <View>
          <Text style={{
            marginTop: 20, marginLeft: 15,
            color: "rgba(58,57,57,0.52)", fontWeight: "bold", fontSize: 20
          }}>Good Morning!</Text>

          <Text style={{
            marginTop: 5, marginLeft: 15, fontSize: 25, fontWeight: "bold",
          }}>Your Task Overview</Text>

          {/* Stats Box */}
          <View style={{
            backgroundColor: "rgba(239, 237, 239, 0.68)",
            marginTop: 25, margin: 25, height: 140, borderRadius: 25,
            flexDirection: "row", alignItems: "center", justifyContent: "space-around",
            boxShadow: "0px 0px 5px gray"
          }}>
            {/* Overdue */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                height: 63, width: 63, borderRadius: 40,
                backgroundColor: "rgba(239,133,143,0.4)", borderColor: "rgb(205,16,22)",
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 30, fontWeight: "bold", color: "rgb(205,16,22)" }}>2</Text>
              </View>
              <Text style={{ marginTop: 10, color: "rgb(205,16,22)", fontSize: 16 }}>Overdue</Text>
            </View>

            {/* Pending */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                height: 63, width: 63, borderRadius: 40,
                backgroundColor: "rgba(255, 192, 104, 0.3)", borderColor: "rgb(252, 135, 0)",
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 35, fontWeight: "bold", color: "rgb(252, 135, 0)" }}>10</Text>
              </View>
              <Text style={{ marginTop: 10, color: "rgb(252, 105, 0)" }}>Pending</Text>
            </View>

            {/* In Review */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                height: 63, width: 63, borderRadius: 40,
                backgroundColor: "rgba(100,150,255,0.2)", borderColor: "royalblue",
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 35, fontWeight: "bold", color: "royalblue" }}>5</Text>
              </View>
              <Text style={{ marginTop: 10, color: "royalblue" }}>In Review</Text>
            </View>

            {/* Completed */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                height: 63, width: 63, borderRadius: 40,
                backgroundColor: "rgba(100,220,120,0.2)", borderColor: "green",
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 35, fontWeight: "bold", color: "green" }}>0</Text>
              </View>
              <Text style={{ marginTop: 10, color: "green" }}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Buttons Row */}
        <View style={{ flexDirection: "row", gap: 20 }}>
          <View style={{ marginLeft: 48 }}>
            <TouchableOpacity
              //   onPress={() => router.push("/newtask")}
              style={{
                backgroundColor: "rgb(252, 151, 0)", padding: 14,
                width: 200, height: 60, borderRadius: 20,
                boxShadow: "0px 0px 5px gray", flexDirection: "row",
              }}
            >
              <Ionicons name="add" size={35} color="white" />
              <Text style={{
                color: "rgba(255, 255, 255, 0.91)", fontSize: 25,
                fontWeight: "bold", textAlign: "center"
              }}> New Task</Text>
            </TouchableOpacity>
          </View>

          <View style={{
            boxShadow: "0px 0px 5px gray", borderRadius: 30,
            backgroundColor: "rgba(237, 238, 236, 0.33)",
            height: 58, width: 80, alignItems: "center", justifyContent: "center"
          }}>
            <Ionicons name="search" size={30} color="orange" />
          </View>
        </View>

        {/* ---- Overdue Section ---- */}
        <View style={{
          width: 320, marginTop: 30, marginLeft: 33,
          borderColor: "gray", borderWidth: 1, borderRadius: 19
        }}>
          <View style={{
            height: 60, borderRadius: 20, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
          }}>
            <Text style={{ color: "rgb(183, 4, 4)", fontSize: 20, fontWeight: "bold" }}>Overdue</Text>
            <TouchableOpacity onPress={() => setShowOverdue(!showOverdue)}>
              <Ionicons
                name={showOverdue ? "chevron-up-outline" : "chevron-down-outline"}
                size={30} color="white"
                style={{ backgroundColor: "rgb(183, 4, 4)", borderRadius: 20, padding: 2 }}
              />
            </TouchableOpacity>

          </View>
          {showOverdue && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {["Some Task", "Fix login page bug"].map((task, index) => (
                <View key={index} style={{
                  flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5",
                  borderRadius: 12, padding: 12, marginBottom: 8, gap: 12,
                  borderColor: "rgba(137, 136, 137, 0.33)", borderWidth: 1, margin: 10
                }}>
                  <View style={{
                    height: 24, width: 24, borderRadius: 12, borderWidth: 2,
                    borderColor: "rgb(183, 4, 4)", alignItems: "center", justifyContent: "center",
                  }}>
                    <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: "rgb(183, 4, 4)" }} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "500", color: "#333" }}>{task}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ---- Pending Section ---- */}
        <View style={{
          width: 320, marginTop: 20, marginLeft: 33,
          borderColor: "gray", borderWidth: 1, borderRadius: 19
        }}>
          <View style={{
            height: 60, borderRadius: 20, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
          }}>
            <Text style={{ color: "rgb(255, 101, 5)", fontSize: 20, fontWeight: "bold" }}>Pending</Text>
            <TouchableOpacity onPress={() => setShowPending(!showPending)}>
              <Ionicons
                name={showPending ? "chevron-up-outline" : "chevron-down-outline"}
                size={30} color="white"
                style={{ backgroundColor: "rgb(255, 101, 5)", borderRadius: 20, padding: 2 }}
              />
            </TouchableOpacity>
          </View>
          {showPending && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {["Some Task", "Fix login page bug"].map((task, index) => (
                <View key={index} style={{
                  flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5",
                  borderRadius: 12, padding: 12, marginBottom: 8, gap: 12,
                  borderColor: "rgba(137, 136, 137, 0.33)", borderWidth: 1, margin: 10
                }}>
                  <View style={{
                    height: 24, width: 24, borderRadius: 12, borderWidth: 2,
                    borderColor: "rgb(255, 101, 5)", alignItems: "center", justifyContent: "center",
                  }}>
                    <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: "rgb(255, 101, 5)" }} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "500", color: "#333" }}>{task}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ---- In Review Section ---- */}
        <View style={{
          width: 320, marginTop: 20, marginLeft: 33,
          borderColor: "gray", borderWidth: 1, borderRadius: 19
        }}>
          <View style={{
            height: 60, borderRadius: 20, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
          }}>
            <Text style={{ color: "rgb(52, 105, 250)", fontSize: 20, fontWeight: "bold" }}>In Review</Text>
            <TouchableOpacity onPress={() => setShowReview(!showReview)}>
              <Ionicons
                name={showReview ? "chevron-up-outline" : "chevron-down-outline"}
                size={30} color="white"
                style={{ backgroundColor: "rgb(52, 105, 250)", borderRadius: 20, padding: 2 }}
              />
            </TouchableOpacity>
          </View>
          {showReview && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {["Some Task", "Fix login page bug"].map((task, index) => (
                <View key={index} style={{
                  flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5",
                  borderRadius: 12, padding: 12, marginBottom: 8, gap: 12,
                  borderColor: "rgba(137, 136, 137, 0.33)", borderWidth: 1, margin: 10
                }}>
                  <View style={{
                    height: 24, width: 24, borderRadius: 12, borderWidth: 2,
                    borderColor: "rgb(52, 105, 250)", alignItems: "center", justifyContent: "center",
                  }}>
                    <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: "rgb(52, 105, 250)" }} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "500", color: "#333" }}>{task}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ---- Completed Section ---- */}
        <View style={{
          width: 320, marginTop: 20, marginLeft: 33,
          borderColor: "gray", borderWidth: 1, borderRadius: 19
        }}>
          <View style={{
            height: 60, borderRadius: 20, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
          }}>
            <Text style={{ color: "rgb(4, 180, 16)", fontSize: 20, fontWeight: "bold" }}>Completed</Text>
            <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)}>
              <Ionicons
                name={showCompleted ? "chevron-up-outline" : "chevron-down-outline"}
                size={30} color="white"
                style={{ backgroundColor: "rgb(4, 180, 16)", borderRadius: 20, padding: 2 }}
              />
            </TouchableOpacity>
          </View>
          {showCompleted && (
            <View style={{ borderRadius: 15, marginTop: 5 }}>
              {["Some Task", "Fix login page bug"].map((task, index) => (
                <View key={index} style={{
                  flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5",
                  borderRadius: 12, padding: 12, marginBottom: 8, gap: 12,
                  borderColor: "rgba(137, 136, 137, 0.33)", borderWidth: 1, margin: 10
                }}>
                  <View style={{
                    height: 24, width: 24, borderRadius: 12, borderWidth: 2,
                    borderColor: "rgb(4, 180, 16)", alignItems: "center", justifyContent: "center",
                  }}>
                    <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: "rgb(4, 180, 16)" }} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "500", color: "#333" }}>{task}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}