// import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
// import React, { useState, useEffect } from 'react';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Ionicons } from "@expo/vector-icons";
// import { useRouter } from "expo-router";
// import { supabase } from '../../lib/supabase';
// import { lightTheme, typography } from '../../theme/theme';
// import { Task } from '../../types/task';
// import AsyncStorage from "@react-native-async-storage/async-storage";

// const { colors } = lightTheme;

// // Raw shape returned by Postgres (snake_case)
// type TaskRow = {
//   id: string;
//   title: string;
//   status: 'overdue' | 'pending' | 'in_review' | 'completed';
//   priority: 'low' | 'medium' | 'high';
//   label: string;
//   assigned_to: string;
//   created_by: string;
//   deadline: string;
//   suggestion: string | null;
// };

// // Maps a DB row (snake_case, status: 'in_review') to the app's Task type (camelCase, status: 'inReview')
// function mapRowToTask(row: TaskRow): Task {
//   return {
//     id: row.id,
//     title: row.title,
//     status: row.status === 'in_review' ? 'inReview' : row.status,
//     priority: row.priority,
//     label: row.label,
//     assignedTo: row.assigned_to,
//     createdBy: row.created_by,
//     dueDate: row.deadline,
//     suggestion: row.suggestion ?? undefined,
//   };
// }

// export default function Dashboard() {
//   const router = useRouter();
//   const [showOverdue, setShowOverdue] = useState(false);
//   const [showPending, setShowPending] = useState(false);
//   const [showReview, setShowReview] = useState(false);
//   const [showCompleted, setShowCompleted] = useState(false);

//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchTasks();
//   }, []);

//   const fetchTasks = async () => {
//     setLoading(true);
//     const currentEmail = await AsyncStorage.getItem("userEmail");
//     const currentRole = await AsyncStorage.getItem("userRole"); // "admin" | "employee"

//     let query = supabase.from("tasks").select("*").order("deadline", { ascending: true });

//     // Employees only see tasks assigned to them; admins see everything
//     if (currentRole === "employee" && currentEmail) {
//       query = query.eq("assigned_to", currentEmail);
//     }

//     const { data, error } = await query;

//     if (error) {
//       console.error('Error fetching tasks:', error.message);
//     } else {
//       setTasks((data ?? []).map(mapRowToTask));
//     }
//     setLoading(false);
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background, alignItems: 'center', justifyContent: 'center' }}>
//         <Text style={typography.body}>Loading tasks...</Text>
//       </SafeAreaView>
//     );
//   }

//   const overdueTasks = tasks.filter(task => task.status === "overdue");
//   const pendingTasks = tasks.filter(task => task.status === "pending");
//   const reviewTasks = tasks.filter(task => task.status === "inReview");
//   const completedTasks = tasks.filter(task => task.status === "completed");

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
//       <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>

//         {/* Top section */}
//         <View>
//           <Text style={{
//             ...typography.subheading,
//             marginTop: 20, marginLeft: 15,
//             color: colors.text.secondary,
//           }}>Good Morning!</Text>

//           <Text style={{
//             ...typography.heading,
//             marginTop: 5, marginLeft: 15,
//             color: colors.text.primary,
//           }}>Your Task Overview</Text>

//           {/* Stats Box */}
//           <View style={{
//             backgroundColor: "#FFFFFF",
//             marginTop: 25, margin: 20, height: 140, borderRadius: 25,
//             flexDirection: "row", alignItems: "center", justifyContent: "space-around",
//             borderColor: "#E2E2E6",
//             borderWidth: 2.5
//           }}>
//             {/* Overdue */}
//             <View style={{ alignItems: "center" }}>
//               <View style={{
//                 marginLeft: 12,
//                 height: 63, width: 63, borderRadius: 40,
//                 backgroundColor: "rgba(239,133,143,0.4)",
//                 borderColor: colors.status.overdue,
//                 borderWidth: 2, alignItems: "center", justifyContent: "center",
//               }}>
//                 <Text style={{ ...typography.heading, color: colors.status.overdue }}>{overdueTasks.length}</Text>
//               </View>
//               <Text style={{ ...typography.body, marginTop: 10, color: colors.status.overdue, marginLeft: 13 }}>Overdue</Text>
//             </View>

//             {/* Pending */}
//             <View style={{ alignItems: "center" }}>
//               <View style={{
//                 height: 63, width: 63, borderRadius: 40,
//                 backgroundColor: "rgba(255, 192, 104, 0.3)",
//                 borderColor: colors.status.pending,
//                 borderWidth: 2, alignItems: "center", justifyContent: "center",
//               }}>
//                 <Text style={{ ...typography.heading, color: colors.status.pending }}>{pendingTasks.length}</Text>
//               </View>
//               <Text style={{ ...typography.body, marginTop: 10, color: colors.status.pending }}>Pending</Text>
//             </View>

//             {/* In Review */}
//             <View style={{ alignItems: "center" }}>
//               <View style={{
//                 height: 63, width: 63, borderRadius: 40,
//                 backgroundColor: "rgba(100,150,255,0.2)",
//                 borderColor: colors.status.inReview,
//                 borderWidth: 2, alignItems: "center", justifyContent: "center",
//               }}>
//                 <Text style={{ ...typography.heading, color: colors.status.inReview }}>{reviewTasks.length}</Text>
//               </View>
//               <Text style={{ ...typography.body, marginTop: 10, color: colors.status.inReview }}>In Review</Text>
//             </View>

//             {/* Completed */}
//             <View style={{ alignItems: "center" }}>
//               <View style={{
//                 height: 63, width: 63, borderRadius: 40,
//                 backgroundColor: "rgba(100,220,120,0.2)",
//                 borderColor: colors.status.completed,
//                 borderWidth: 2, alignItems: "center", justifyContent: "center",
//               }}>
//                 <Text style={{ ...typography.heading, color: colors.status.completed }}>{completedTasks.length}</Text>
//               </View>
//               <Text style={{ ...typography.body, marginTop: 10, color: colors.status.completed }}>Completed</Text>
//             </View>
//           </View>
//         </View>

//         {/* Buttons Row */}
//         <View style={{
//           flexDirection: "row", gap: 20,
//         }}>
//           <View style={{ marginLeft: 48 }}>
//             <TouchableOpacity
//               onPress={() => router.push("/newtask")}
//               style={{
//                 backgroundColor: colors.brand.accent, padding: 14,
//                 width: 200, height: 60, borderRadius: 32,
//                 boxShadow: "0px 0px 5px gray", flexDirection: "row",
//                 marginTop: -1
//               }}
//             >
//               <Ionicons style={{ marginLeft: 20, marginTop: -2 }} name="add" size={35} color={colors.base.surfaceL1} />
//               <Text style={{
//                 ...typography.subheading,
//                 color: colors.base.surfaceL1,
//                 textAlign: "center",
//                 marginTop: 4,
//                 margin: 5
//               }}> New Task</Text>
//             </TouchableOpacity>
//           </View>

//           <View style={{
//             boxShadow: "0px 0px 5px gray", borderRadius: 32,
//             backgroundColor: colors.base.surfaceL2,
//             height: 58, width: 80, alignItems: "center", justifyContent: "center"
//           }}>
//             <Ionicons name="search" size={30} color={colors.brand.accent} />
//           </View>
//         </View>

//         {/* ---- Overdue Section ---- */}
//         <View style={{
//           width: 320, marginTop: 30, marginLeft: 33,
//           borderColor: colors.base.border, borderWidth: 1, borderRadius: 19,
//           backgroundColor: "#FFFFFF",
//         }}>
//           <View style={{
//             height: 60, borderRadius: 20, flexDirection: "row",
//             alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
//           }}>
//             <Text style={{ ...typography.subheading, color: colors.status.overdue }}>Overdue</Text>
//             <TouchableOpacity onPress={() => setShowOverdue(!showOverdue)}>
//               <Ionicons
//                 name={showOverdue ? "chevron-up-outline" : "chevron-down-outline"}
//                 size={30} color={colors.base.surfaceL1}
//                 style={{ backgroundColor: colors.status.overdue, borderRadius: 10, padding: 2 }}
//               />
//             </TouchableOpacity>
//           </View>
//           {showOverdue && (
//             <View style={{ borderRadius: 15, marginTop: 5 }}>
//               {overdueTasks.map((task) => (
//                 <TouchableOpacity
//                   key={task.id}
//                   onPress={() => router.push({
//                     pathname: '/(task)/task-detail',
//                     params: { taskId: task.id }
//                   })}
//                   style={{
//                     flexDirection: "row", alignItems: "center",
//                     backgroundColor: colors.base.surfaceL2,
//                     borderRadius: 12, padding: 12, marginBottom: 8,
//                     gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10
//                   }}
//                 >
//                   <View style={{
//                     height: 24, width: 24, borderRadius: 12, borderWidth: 2,
//                     borderColor: colors.status.overdue, alignItems: "center", justifyContent: "center",
//                   }}>
//                     <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: colors.status.overdue }} />
//                   </View>
//                   <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           )}
//         </View>

//         {/* ---- Pending Section ---- */}
//         <View style={{
//           width: 320, marginTop: 20, marginLeft: 33,
//           borderColor: colors.base.border, borderWidth: 1, borderRadius: 19,
//           backgroundColor: colors.base.surfaceL1,
//         }}>
//           <View style={{
//             height: 60, borderRadius: 20, flexDirection: "row",
//             alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
//           }}>
//             <Text style={{ ...typography.subheading, color: colors.status.pending }}>Pending</Text>
//             <TouchableOpacity onPress={() => setShowPending(!showPending)}>
//               <Ionicons
//                 name={showPending ? "chevron-up-outline" : "chevron-down-outline"}
//                 size={30} color={colors.base.surfaceL1}
//                 style={{ backgroundColor: colors.status.pending, borderRadius: 10, padding: 2 }}
//               />
//             </TouchableOpacity>
//           </View>
//           {showPending && (
//             <View style={{ borderRadius: 15, marginTop: 5 }}>
//               {pendingTasks.map((task) => (
//                 <TouchableOpacity
//                   key={task.id}
//                   onPress={() => router.push({
//                     pathname: '/(task)/task-detail',
//                     params: { taskId: task.id }
//                   })}
//                   style={{
//                     flexDirection: "row", alignItems: "center",
//                     backgroundColor: colors.base.surfaceL2,
//                     borderRadius: 12, padding: 12, marginBottom: 8,
//                     gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10
//                   }}
//                 >
//                   <View style={{
//                     height: 24, width: 24, borderRadius: 12, borderWidth: 2,
//                     borderColor: colors.status.pending, alignItems: "center", justifyContent: "center",
//                   }}>
//                     <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: colors.status.pending }} />
//                   </View>
//                   <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           )}
//         </View>

//         {/* ---- In Review Section ---- */}
//         <View style={{
//           width: 320, marginTop: 20, marginLeft: 33,
//           borderColor: colors.base.border, borderWidth: 1, borderRadius: 19,
//           backgroundColor: colors.base.surfaceL1,
//         }}>
//           <View style={{
//             height: 60, borderRadius: 20, flexDirection: "row",
//             alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
//           }}>
//             <Text style={{ ...typography.subheading, color: colors.status.inReview }}>In Review</Text>
//             <TouchableOpacity onPress={() => setShowReview(!showReview)}>
//               <Ionicons
//                 name={showReview ? "chevron-up-outline" : "chevron-down-outline"}
//                 size={30} color={colors.base.surfaceL1}
//                 style={{ backgroundColor: colors.status.inReview, borderRadius: 10, padding: 2 }}
//               />
//             </TouchableOpacity>
//           </View>
//           {showReview && (
//             <View style={{ borderRadius: 15, marginTop: 5 }}>
//               {reviewTasks.map((task) => (
//                 <TouchableOpacity
//                   key={task.id}
//                   onPress={() => router.push({
//                     pathname: '/(task)/task-detail',
//                     params: { taskId: task.id }
//                   })}
//                   style={{
//                     flexDirection: "row", alignItems: "center",
//                     backgroundColor: colors.base.surfaceL2,
//                     borderRadius: 12, padding: 12, marginBottom: 8,
//                     gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10
//                   }}
//                 >
//                   <View style={{
//                     height: 24, width: 24, borderRadius: 12, borderWidth: 2,
//                     borderColor: colors.status.inReview, alignItems: "center", justifyContent: "center",
//                   }}>
//                     <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: colors.status.inReview }} />
//                   </View>
//                   <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           )}
//         </View>

//         {/* ---- Completed Section ---- */}
//         <View style={{
//           width: 320, marginTop: 20, marginLeft: 33,
//           borderColor: colors.base.border, borderWidth: 1, borderRadius: 19,
//           backgroundColor: colors.base.surfaceL1,
//         }}>
//           <View style={{
//             height: 60, borderRadius: 20, flexDirection: "row",
//             alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
//           }}>
//             <Text style={{ ...typography.subheading, color: colors.status.completed }}>Completed</Text>
//             <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)}>
//               <Ionicons
//                 name={showCompleted ? "chevron-up-outline" : "chevron-down-outline"}
//                 size={30} color={colors.base.surfaceL1}
//                 style={{ backgroundColor: colors.status.completed, borderRadius: 10, padding: 2 }}
//               />
//             </TouchableOpacity>
//           </View>
//           {showCompleted && (
//             <View style={{ borderRadius: 15, marginTop: 5 }}>
//               {completedTasks.map((task) => (
//                 <TouchableOpacity
//                   key={task.id}
//                   onPress={() => router.push({
//                     pathname: '/(task)/task-detail',
//                     params: { taskId: task.id }
//                   })}
//                   style={{
//                     flexDirection: "row", alignItems: "center",
//                     backgroundColor: colors.base.surfaceL2,
//                     borderRadius: 12, padding: 12, marginBottom: 8,
//                     gap: 12, borderColor: colors.base.border, borderWidth: 1, margin: 10
//                   }}
//                 >
//                   <View style={{
//                     height: 24, width: 24, borderRadius: 12, borderWidth: 2,
//                     borderColor: colors.status.completed, alignItems: "center", justifyContent: "center",
//                   }}>
//                     <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: colors.status.completed }} />
//                   </View>
//                   <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           )}
//         </View>

//       </ScrollView>
//     </SafeAreaView>
//   );
// }

import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from '../../lib/supabase';
import { lightTheme, typography } from '../../theme/theme';
import { Task } from '../../types/task';

const { colors } = lightTheme;

// Raw shape returned by Postgres (snake_case)
type TaskRow = {
  id: string;
  title: string;
  status: 'overdue' | 'pending' | 'in_review' | 'completed';
  priority: 'low' | 'medium' | 'high';
  label: string;
  assigned_to: string;
  created_by: string;
  deadline: string;
  suggestion: string | null;
};

// Maps a DB row (snake_case, status: 'in_review') to the app's Task type (camelCase, status: 'inReview')
function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status === 'in_review' ? 'inReview' : row.status,
    priority: row.priority,
    label: row.label,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    dueDate: row.deadline,
    suggestion: row.suggestion ?? undefined,
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [showOverdue, setShowOverdue] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);

    const currentEmail = await AsyncStorage.getItem("userEmail");

    if (!currentEmail) {
      console.error("No logged-in user email found in session.");
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', currentEmail)
      .order('deadline', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error.message);
    } else {
      setTasks((data ?? []).map(mapRowToTask));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={typography.body}>Loading tasks...</Text>
      </SafeAreaView>
    );
  }

  const overdueTasks = tasks.filter(task => task.status === "overdue");
  const pendingTasks = tasks.filter(task => task.status === "pending");
  const reviewTasks = tasks.filter(task => task.status === "inReview");
  const completedTasks = tasks.filter(task => task.status === "completed");

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
            marginTop: 25, margin: 20, height: 140, borderRadius: 25,
            flexDirection: "row", alignItems: "center", justifyContent: "space-around",
            borderColor:"#E2E2E6",
            borderWidth:2.5
          }}>
            {/* Overdue */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                  marginLeft:12,
                height: 63, width: 63, borderRadius: 40,
                backgroundColor: "rgba(239,133,143,0.4)",
                borderColor: colors.status.overdue,
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ ...typography.heading, color: colors.status.overdue }}>{overdueTasks.length}</Text>
              </View>
              <Text style={{ ...typography.body, marginTop: 10, color: colors.status.overdue, marginLeft:13}}>Overdue</Text>
            </View>

            {/* Pending */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                height: 63, width: 63, borderRadius: 40,
                backgroundColor: "rgba(255, 192, 104, 0.3)",
                borderColor: colors.status.pending,
                borderWidth: 2, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ ...typography.heading, color: colors.status.pending }}>{pendingTasks.length}</Text>
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
                <Text style={{ ...typography.heading, color: colors.status.inReview }}>{reviewTasks.length}</Text>
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
                <Text style={{ ...typography.heading, color: colors.status.completed }}>{completedTasks.length}</Text>
              </View>
              <Text style={{ ...typography.body, marginTop: 10, color: colors.status.completed }}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Buttons Row */}
        <View style={{ flexDirection: "row", gap: 20,
         }}>
          <View style={{ marginLeft: 48}}>
            <TouchableOpacity
              onPress={() => router.push("/newtask")}
              style={{
                backgroundColor: colors.brand.accent, padding: 14,
                width: 200, height: 60, borderRadius: 32,
                boxShadow: "0px 0px 5px gray", flexDirection: "row",
                marginTop:-1
              }}
            >
              <Ionicons style={{marginLeft:20,marginTop:-2}} name="add" size={35} color={colors.base.surfaceL1}/>
              <Text style={{
                ...typography.subheading,
                color: colors.base.surfaceL1,
                textAlign: "center",
                marginTop:4,
                margin:5
              }}> New Task</Text>
            </TouchableOpacity>
          </View>

          <View style={{
            boxShadow: "0px 0px 5px gray", borderRadius: 32,
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
              {overdueTasks.map((task) => (
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
                  <Text style={{ ...typography.heading3, color: colors.text.primary }}>{task.title}</Text>
                </TouchableOpacity>
              ))}
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
              {pendingTasks.map((task) => (
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
              ))}
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
              {reviewTasks.map((task) => (
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
              ))}
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
              {completedTasks.map((task) => (
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
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}