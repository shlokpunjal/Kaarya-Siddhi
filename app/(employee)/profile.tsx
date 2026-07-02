// import { useState } from 'react';
// import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Image, Modal } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useRouter } from 'expo-router';
// import * as ImagePicker from 'expo-image-picker';
// import { Ionicons } from '@expo/vector-icons';
// import { mockEmployeeUser } from '../../data/mockCurrentUser';
// import { typography } from '../../theme/theme';
// import { useTheme, useThemeMode, ThemeMode } from '../../context/ThemeContext';
// import { supabase } from '../../lib/supabase';

// export default function EmployeeProfile() {
//   const { colors } = useTheme();
//   const router = useRouter();
//   const { mode, setMode } = useThemeMode();

//   const [editing, setEditing] = useState(false);
//   const [name, setName] = useState(mockEmployeeUser.name);
//   const [contact, setContact] = useState(mockEmployeeUser.phone);
//   const [email, setemail] = useState(mockEmployeeUser.email);

//   const [avatarUri, setAvatarUri] = useState<string | null>(null);
//   const [showImage, setShowImage] = useState(false);

//   const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
//     { value: 'light', label: 'Light', icon: 'sunny-outline' },
//     { value: 'dark', label: 'Dark', icon: 'moon-outline' },
//     { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
//   ];

//   const handleSave = () => {
//     // TEMPORARY — no backend yet, this only updates local state for now
//     setEditing(false);
//   };

//   const handleLogout = () => {
//     Alert.alert('Log out', 'Are you sure you want to log out?', [
//       { text: 'Cancel', style: 'cancel' },
//       {
//         text: 'Log out',
//         style: 'destructive',
//         onPress: () => router.replace('/(auth)/clientLogin'),
//       },
//     ]);
//   };

//   const pickAvatar = async () => {
//     if (!editing) return;
//     const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
//     if (!permission.granted) {
//       Alert.alert('Permission needed', 'Please allow photo library access to set a profile picture.');
//       return;
//     }

//     const result = await ImagePicker.launchImageLibraryAsync({
//       // mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       mediaTypes: ['images'],
//       allowsEditing: true,
//       aspect: [1, 1],
//       quality: 0.8,
//     });

//     if (!result.canceled && result.assets?.[0]?.uri) {
//       setAvatarUri(result.assets[0].uri);
//       // TEMPORARY — local state only for now; hook up upload (e.g. Cloudinary/B2)
//       // and persist avatar URL to Supabase when backend is ready.
//     }
//   };

//   const initials = name
//     .split(' ')
//     .map((part) => part[0])
//     .join('')
//     .slice(0, 2)
//     .toUpperCase();

//   return (
//     <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background }]}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 4 }]}>
//           Profile
//         </Text>
//         <Text style={[typography.body, { color: colors.text.secondary, marginBottom: 20 }]}>
//           Employee
//         </Text>



//         <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
//           {/* Avatar + Name row */}
//           <View style={styles.headerRow}>

//             <Pressable
//               style={styles.avatarPressable}
//               onPress={() => {
//                 if (editing) {
//                   pickAvatar();            // Change profile picture
//                 } else if (avatarUri) {
//                   setShowImage(true);      // View full image
//                 }
//               }}
//             >
//               {avatarUri ? (
//                 <Image
//                   source={{ uri: avatarUri }}
//                   style={styles.avatarImage}
//                 />
//               ) : (
//                 <View
//                   style={[
//                     styles.avatarImage,
//                     styles.avatarFallback,
//                     { backgroundColor: colors.brand.accent },
//                   ]}
//                 >
//                   <Text
//                     style={[
//                       typography.subheading,
//                       { color: '#FFFFFF' },
//                     ]}
//                   >
//                     {initials}
//                   </Text>
//                 </View>
//               )}

//               {editing && (
//                 <View
//                   style={[
//                     styles.editBadge,
//                     {
//                       backgroundColor: colors.brand.primary,
//                       borderColor: colors.base.background,
//                     },
//                   ]}
//                 >
//                   <Ionicons name="camera" size={12} color="#FFFFFF" />
//                 </View>
//               )}
//             </Pressable>
//             <View style={styles.nameColumn}>
//               {editing ? (
//                 <TextInput
//                   value={name}
//                   onChangeText={setName}
//                   style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
//                 />
//               ) : (
//                 <Text style={[typography.subheading, { color: colors.text.primary }]} numberOfLines={1}>
//                   {name}
//                 </Text>
//               )}
//               <Text style={[typography.body, { color: colors.text.secondary, marginTop: 2 }]}>
//                 {mockEmployeeUser.designation}
//               </Text>
//             </View>
//           </View>


//           <Text style={[typography.label, { color: colors.text.secondary, marginTop: 12, marginBottom: 6 }]}>
//             Email id
//           </Text>
//           {editing ? (
//             <TextInput
//               value={email}
//               onChangeText={setemail}
//               style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
//             />
//           ) : (
//             <Text style={[typography.body, { color: colors.text.primary }]}>{email}</Text>
//           )}

//           <Text style={[typography.label, { color: colors.text.secondary, marginTop: 12, marginBottom: 6 }]}>
//             Contact
//           </Text>
//           {editing ? (
//             <TextInput
//               value={contact}
//               onChangeText={setContact}
//               style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
//             />
//           ) : (
//             <Text style={[typography.body, { color: colors.text.primary }]}>{contact}</Text>
//           )}

//           <Text style={[typography.label, { color: colors.text.secondary, marginTop: 16, marginBottom: 6 }]}>
//             Department
//           </Text>
//           <Text style={[typography.body, { color: colors.text.primary }]}>
//             {mockEmployeeUser.department}
//           </Text>
//         </View>

//         <Pressable
//           style={[styles.actionButton, { backgroundColor: colors.brand.accent }]}
//           onPress={editing ? handleSave : () => setEditing(true)}
//         >
//           <Text style={[typography.heading3, { color: '#FFFFFF' }]}>
//             {editing ? 'Save Changes' : 'Edit Profile'}
//           </Text>
//         </Pressable>

//         <Pressable
//           style={[styles.actionButton, styles.logoutButton, { borderColor: colors.status.overdue }]}
//           onPress={handleLogout}
//         >
//           <Text style={[typography.heading3, { color: colors.status.overdue }]}>Log Out</Text>
//         </Pressable>

//         <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
//           <Text style={[typography.subheading, { color: colors.text.primary, marginBottom: 14 }]}>
//             Appearance
//           </Text>
//           <View style={styles.themeRow}>
//             {THEME_OPTIONS.map((option) => {
//               const selected = mode === option.value;
//               return (
//                 <Pressable
//                   key={option.value}
//                   onPress={() => setMode(option.value)}
//                   style={[
//                     styles.themeOption,
//                     {
//                       backgroundColor: selected ? colors.brand.accent : colors.base.surfaceL2,
//                       borderColor: selected ? colors.brand.accent : colors.base.border,
//                     },
//                   ]}
//                 >
//                   <Ionicons name={option.icon} size={22} color={selected ? '#FFFFFF' : colors.text.primary} />
//                   <Text style={[typography.label, { color: selected ? '#FFFFFF' : colors.text.primary, marginTop: 4 }]}>
//                     {option.label}
//                   </Text>
//                 </Pressable>
//               );
//             })}
//           </View>

//           <Text style={[typography.subheading, { color: colors.text.primary, marginTop: 20, marginBottom: 10 }]}>
//             Language
//           </Text>
//           <Pressable
//             style={[styles.languageButton, { backgroundColor: colors.base.surfaceL2, borderColor: colors.base.border }]}
//             onPress={() => { }}
//           >
//             <Ionicons name="language-outline" size={20} color={colors.text.primary} />
//             <Text style={[typography.body, { color: colors.text.primary, marginLeft: 8 }]}>English</Text>
//             <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} style={{ marginLeft: 'auto' }} />
//           </Pressable>
//         </View>
//       </ScrollView>
//       <Modal
//         visible={showImage}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setShowImage(false)}
//       >
//         <Pressable
//           style={{
//             flex: 1,
//             backgroundColor: 'rgba(0,0,0,0.9)',
//             justifyContent: 'center',
//             alignItems: 'center',
//           }}
//           onPress={() => setShowImage(false)}
//         >
//           {avatarUri && (
//             <Image
//               source={{ uri: avatarUri }}
//               style={{ width: '90%', height: '80%' }}
//               resizeMode="contain"
//             />
//           )}
//         </Pressable>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const AVATAR_SIZE = 64;

// const styles = StyleSheet.create({
//   safeArea: { flex: 1 },
//   scrollContent: { padding: 20 },
//   themeRow: { flexDirection: 'row', gap: 10 },
//   themeOption: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
//   languageButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderRadius: 12,
//     borderWidth: 1,
//     paddingVertical: 12,
//     paddingHorizontal: 14,
//   },
//   headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
//   avatarPressable: { position: 'relative' },
//   avatarImage: {
//     width: AVATAR_SIZE,
//     height: AVATAR_SIZE,
//     borderRadius: AVATAR_SIZE / 2,
//   },
//   avatarFallback: { alignItems: 'center', justifyContent: 'center' },
//   editBadge: {
//     position: 'absolute',
//     bottom: 0,
//     right: 0,
//     width: 22,
//     height: 22,
//     borderRadius: 11,
//     borderWidth: 2,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   nameColumn: { marginLeft: 14, flex: 1 },
//   card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 20 },
//   input: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
//   actionButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
//   logoutButton: { backgroundColor: 'transparent', borderWidth: 1.5 },
// });


// import { useState, useEffect } from 'react'; // Added useEffect
// import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Image, Modal, ActivityIndicator } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useRouter } from 'expo-router';
// import * as ImagePicker from 'expo-image-picker';
// import { Ionicons } from '@expo/vector-icons';
// import { mockEmployeeUser } from '../../data/mockCurrentUser';
// import { typography } from '../../theme/theme';
// import { useTheme, useThemeMode, ThemeMode } from '../../context/ThemeContext';
// import { supabase } from '../../lib/supabase';

// export default function EmployeeProfile() {
//   const { colors } = useTheme();
//   const router = useRouter();
//   const { mode, setMode } = useThemeMode();

//   // State hooks managed dynamically via Supabase
//   const [loading, setLoading] = useState(true);
//   const [editing, setEditing] = useState(false);
//   const [name, setName] = useState('');
//   const [contact, setContact] = useState('');
//   const [email, setemail] = useState('');
//   const [designation, setDesignation] = useState('');
//   const [department, setDepartment] = useState('');

//   const [avatarUri, setAvatarUri] = useState<string | null>(null);
//   const [showImage, setShowImage] = useState(false);

//   const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
//     { value: 'light', label: 'Light', icon: 'sunny-outline' },
//     { value: 'dark', label: 'Dark', icon: 'moon-outline' },
//     { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
//   ];

//   // 1. Fetch Profile Data on Mount
//   useEffect(() => {
//     async function fetchProfile() {
//       try {
//         setLoading(true);

//         const { data: { user }, error: authError } = await supabase.auth.getUser();

//         // // 👈 FIX: If no user is logged in, redirect silently instead of throwing an alert
//         // if (authError || !user) {
//         //   console.log("No active session found. Redirecting to login...");
//         //   router.replace('../(auth)/EmloyeeLogin');
//         //   return;
//         // }
//         if (authError || !user) {
//           console.log("No active session found. Showing empty profile.");
//           setName('');
//           setContact('');
//           setemail('');  
//           setDesignation('');
//           setDepartment('');
//           setAvatarUri(null);
//           return; // no user id to query with, skip the DB fetch
//         }

//         // If user exists, fetch their database details
//         const { data: profile, error: dbError } = await supabase
//           .from('employees')
//           .select('name, mobile_number, email, designation, department,  profile_pic_url')
//           .eq('id', user.id)
//           .single();

//         if (dbError) throw dbError;

//         if (profile) {
//           setName(profile.name || '');
//           setContact(profile.mobile_number || '');
//           setemail(profile.email || user.email || '');
//           setDesignation(profile.designation || 'Employee');
//           setDepartment(profile.department || 'General');
//           setAvatarUri(profile.profile_pic_url || null);
//         }
//       } catch (error: any) {
//         // Real database or networking errors still show an alert
//         Alert.alert('Database Error', error.message);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchProfile();
//   }, []);


//   // 2. Save Profile Changes to Supabase
//   const handleSave = async () => {
//     try {
//       setLoading(true);
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) throw new Error('No user found');

//       const { error } = await supabase
//         .from('employees') // Replace with your exact table name
//         .update({
//           name: name,
//           phone: contact,
//           email: email,
//           // avatar_url: avatarUri (uncomment once image uploading logic is setup)
//         })
//         .eq('id', user.id);

//       if (error) throw error;

//       setEditing(false);
//       Alert.alert('Success', 'Profile updated successfully!');
//     } catch (error: any) {
//       Alert.alert('Save Failed', error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLogout = async () => {
//     Alert.alert('Log out', 'Are you sure you want to log out?', [
//       { text: 'Cancel', style: 'cancel' },
//       {
//         text: 'Log out',
//         style: 'destructive',
//         onPress: async () => {
//           await supabase.auth.signOut(); // Signs out session tokens globally
//           router.replace('/(auth)/clientLogin');
//         },
//       },
//     ]);
//   };

//   const pickAvatar = async () => {
//     if (!editing) return;
//     const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
//     if (!permission.granted) {
//       Alert.alert('Permission needed', 'Please allow photo library access to set a profile picture.');
//       return;
//     }

//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ['images'],
//       allowsEditing: true,
//       aspect: [1, 1],
//       quality: 0.8,
//     });

//     if (!result.canceled && result.assets?.[0]?.uri) {
//       setAvatarUri(result.assets[0].uri);
//       // To fully persist this, you will need to upload the image file to Supabase Storage 
//       // via `supabase.storage.from('avatars').upload(...)` and save the public URL wrapper.
//     }
//   };

//   // Safe split guard check in case string name evaluates to undefined during loading states
//   const initials = (name || '')
//     .split(' ')
//     .map((part) => part[0])
//     .join('')
//     .slice(0, 2)
//     .toUpperCase();

//   // Loading screen blocking interface updates until state resolution complete
//   if (loading && !editing) {
//     return (
//       <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background, justifyContent: 'center', alignItems: 'center' }]}>
//         <ActivityIndicator size="large" color={colors.brand.primary} />
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background }]}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 4 }]}>
//           Profile
//         </Text>
//         <Text style={[typography.body, { color: colors.text.secondary, marginBottom: 20 }]}>
//           Employee
//         </Text>

//         <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
//           {/* Avatar + Name row */}
//           <View style={styles.headerRow}>
//             <Pressable
//               style={styles.avatarPressable}
//               onPress={() => {
//                 if (editing) {
//                   pickAvatar();
//                 } else if (avatarUri) {
//                   setShowImage(true);
//                 }
//               }}
//             >
//               {avatarUri ? (
//                 <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
//               ) : (
//                 <View style={[styles.avatarImage, styles.avatarFallback, { backgroundColor: colors.brand.accent }]}>
//                   <Text style={[typography.subheading, { color: '#FFFFFF' }]}>
//                     {initials || '??'}
//                   </Text>
//                 </View>
//               )}

//               {editing && (
//                 <View style={[styles.editBadge, { backgroundColor: colors.brand.primary, borderColor: colors.base.background }]}>
//                   <Ionicons name="camera" size={12} color="#FFFFFF" />
//                 </View>
//               )}
//             </Pressable>

//             <View style={styles.nameColumn}>
//               {editing ? (
//                 <TextInput
//                   value={name}
//                   onChangeText={setName}
//                   style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
//                 />
//               ) : (
//                 <Text style={[typography.subheading, { color: colors.text.primary }]} numberOfLines={1}>
//                   {name || 'No Name Set'}
//                 </Text>
//               )}
//               <Text style={[typography.body, { color: colors.text.secondary, marginTop: 2 }]}>
//                 {designation}
//               </Text>
//             </View>
//           </View>

//           <Text style={[typography.label, { color: colors.text.secondary, marginTop: 12, marginBottom: 6 }]}>
//             Email id
//           </Text>
//           {editing ? (
//             <TextInput
//               value={email}
//               onChangeText={setemail}
//               style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
//             />
//           ) : (
//             <Text style={[typography.body, { color: colors.text.primary }]}>{email || 'No Email Registered'}</Text>
//           )}

//           <Text style={[typography.label, { color: colors.text.secondary, marginTop: 12, marginBottom: 6 }]}>
//             Contact
//           </Text>
//           {editing ? (
//             <TextInput
//               value={contact}
//               onChangeText={setContact}
//               style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
//             />
//           ) : (
//             <Text style={[typography.body, { color: colors.text.primary }]}>{contact || 'No Contact Number'}</Text>
//           )}

//           <Text style={[typography.label, { color: colors.text.secondary, marginTop: 16, marginBottom: 6 }]}>
//             Department
//           </Text>
//           <Text style={[typography.body, { color: colors.text.primary }]}>
//             {department}
//           </Text>
//         </View>

//         <Pressable
//           style={[styles.actionButton, { backgroundColor: colors.brand.accent }]}
//           onPress={editing ? handleSave : () => setEditing(true)}
//         >
//           <Text style={[typography.heading3, { color: '#FFFFFF' }]}>
//             {editing ? 'Save Changes' : 'Edit Profile'}
//           </Text>
//         </Pressable>

//         <Pressable
//           style={[styles.actionButton, styles.logoutButton, { borderColor: colors.status.overdue }]}
//           onPress={handleLogout}
//         >
//           <Text style={[typography.heading3, { color: colors.status.overdue }]}>Log Out</Text>
//         </Pressable>

//         {/* ... Rest of your theme options rendering layout ... */}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// // Inline fallback styles wrapper for placeholder compatibility validation
// const AVATAR_SIZE = 64;

// const styles = StyleSheet.create({
//   safeArea: { flex: 1 },
//   scrollContent: { padding: 20 },
//   themeRow: { flexDirection: 'row', gap: 10 },
//   themeOption: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
//   languageButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderRadius: 12,
//     borderWidth: 1,
//     paddingVertical: 12,
//     paddingHorizontal: 14,
//   },
//   headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
//   avatarPressable: { position: 'relative' },
//   avatarImage: {
//     width: AVATAR_SIZE,
//     height: AVATAR_SIZE,
//     borderRadius: AVATAR_SIZE / 2,
//   },
//   avatarFallback: { alignItems: 'center', justifyContent: 'center' },
//   editBadge: {
//     position: 'absolute',
//     bottom: 0,
//     right: 0,
//     width: 22,
//     height: 22,
//     borderRadius: 11,
//     borderWidth: 2,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   nameColumn: { marginLeft: 14, flex: 1 },
//   card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 20 },
//   input: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
//   actionButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
//   logoutButton: { backgroundColor: 'transparent', borderWidth: 1.5 },
// });



import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Image, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../../theme/theme';
import { useTheme, useThemeMode, ThemeMode } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function profile() {
  const { colors } = useTheme();
  const router = useRouter();
  const { mode, setMode } = useThemeMode();

  // State hooks managed dynamically via Supabase
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setemail] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);

  const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'light', label: 'Light', icon: 'sunny-outline' },
    { value: 'dark', label: 'Dark', icon: 'moon-outline' },
    { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  ];

  // 1. Fetch Profile Data on Mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // If no user is logged in, show an empty profile instead of redirecting
        if (authError || !user) {
          console.log("No active session found. Showing empty profile.");
          setHasSession(false);
          setName('');
          setContact('');
          setemail('');
          setDesignation('');
          setDepartment('');
          setAvatarUri(null);
          return;
        }

        setHasSession(true);

        // If user exists, fetch their database details
        const { data: profile, error: dbError } = await supabase
          .from('employees')
          .select('name, mobile_number, email, designation, department, profile_pic_url')
          .eq('id', user.id)
          .single();

        if (dbError) throw dbError;

        if (profile) {
          setName(profile.name || '');
          setContact(profile.mobile_number || '');
          setemail(profile.email || user.email || '');
          setDesignation(profile.designation || 'Employee');
          setDepartment(profile.department || 'General');
          setAvatarUri(profile.profile_pic_url || null);
        }
      } catch (error: any) {
        // Real database or networking errors still show an alert
        Alert.alert('Database Error', error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);


  // 2. Save Profile Changes to Supabase
  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('employees') // Replace with your exact table name
        .update({
          name: name,
          mobile_number: contact,
          email: email,
          // profile_pic_url: avatarUri (uncomment once image uploading logic is setup)
        })
        .eq('id', user.id);

      if (error) throw error;

      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Save Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut(); // Signs out session tokens globally
          router.replace('/(auth)/clientLogin');
        },
      },
    ]);
  };

  const pickAvatar = async () => {
    if (!editing) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
      // To fully persist this, you will need to upload the image file to Supabase Storage
      // via `supabase.storage.from('avatars').upload(...)` and save the public URL wrapper.
    }
  };

  // Safe split guard check in case string name evaluates to undefined during loading states
  const initials = (name || '')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Loading screen blocking interface updates until state resolution complete
  if (loading && !editing) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[typography.heading, { color: colors.text.primary, marginBottom: 4 }]}>
          Profile
        </Text>
        <Text style={[typography.body, { color: colors.text.secondary, marginBottom: 20 }]}>
          Employee
        </Text>

        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          {/* Avatar + Name row */}
          <View style={styles.headerRow}>
            <Pressable
              style={styles.avatarPressable}
              onPress={() => {
                if (editing) {
                  pickAvatar();
                } else if (avatarUri) {
                  setShowImage(true);
                }
              }}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarImage, styles.avatarFallback, { backgroundColor: colors.brand.accent }]}>
                  <Text style={[typography.subheading, { color: '#FFFFFF' }]}>
                    {initials || '??'}
                  </Text>
                </View>
              )}

              {editing && (
                <View style={[styles.editBadge, { backgroundColor: colors.brand.primary, borderColor: colors.base.background }]}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            <View style={styles.nameColumn}>
              {editing ? (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
                />
              ) : (
                <Text style={[typography.subheading, { color: colors.text.primary }]} numberOfLines={1}>
                  {name || 'No Name Set'}
                </Text>
              )}
              <Text style={[typography.body, { color: colors.text.secondary, marginTop: 2 }]}>
                {designation || (hasSession ? 'Employee' : 'Not Logged In')}
              </Text>
            </View>
          </View>

          <Text style={[typography.label, { color: colors.text.secondary, marginTop: 12, marginBottom: 6 }]}>
            Email id
          </Text>
          {editing ? (
            <TextInput
              value={email}
              onChangeText={setemail}
              style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
            />
          ) : (
            <Text style={[typography.body, { color: colors.text.primary }]}>{email || 'No Email Registered'}</Text>
          )}

          <Text style={[typography.label, { color: colors.text.secondary, marginTop: 12, marginBottom: 6 }]}>
            Contact
          </Text>
          {editing ? (
            <TextInput
              value={contact}
              onChangeText={setContact}
              style={[styles.input, typography.body, { borderColor: colors.base.border, color: colors.text.primary }]}
            />
          ) : (
            <Text style={[typography.body, { color: colors.text.primary }]}>{contact || 'No Contact Number'}</Text>
          )}

          <Text style={[typography.label, { color: colors.text.secondary, marginTop: 16, marginBottom: 6 }]}>
            Department
          </Text>
          <Text style={[typography.body, { color: colors.text.primary }]}>
            {department || 'No Department Set'}
          </Text>
        </View>

        {/* Edit Profile / Save Changes — only shown when a real session exists */}
        {hasSession && (
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.brand.accent }]}
            onPress={editing ? handleSave : () => setEditing(true)}
          >
            <Text style={[typography.heading3, { color: '#FFFFFF' }]}>
              {editing ? 'Save Changes' : 'Edit Profile'}
            </Text>
          </Pressable>
        )}

        {/* Log Out — only shown when a real session exists */}
        {hasSession && (
          <Pressable
            style={[styles.actionButton, styles.logoutButton, { borderColor: colors.status.overdue }]}
            onPress={handleLogout}
          >
            <Text style={[typography.heading3, { color: colors.status.overdue }]}>Log Out</Text>
          </Pressable>
        )}

        {/* Appearance section always visible — theme is a local device preference, not tied to auth */}
        <View style={[styles.card, { backgroundColor: colors.base.surfaceL1, borderColor: colors.base.border }]}>
          <Text style={[typography.subheading, { color: colors.text.primary, marginBottom: 14 }]}>
            Appearance
          </Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((option) => {
              const selected = mode === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMode(option.value)}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: selected ? colors.brand.accent : colors.base.surfaceL2,
                      borderColor: selected ? colors.brand.accent : colors.base.border,
                    },
                  ]}
                >
                  <Ionicons name={option.icon} size={22} color={selected ? '#FFFFFF' : colors.text.primary} />
                  <Text style={[typography.label, { color: selected ? '#FFFFFF' : colors.text.primary, marginTop: 4 }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[typography.subheading, { color: colors.text.primary, marginTop: 20, marginBottom: 10 }]}>
            Language
          </Text>
          <Pressable
            style={[styles.languageButton, { backgroundColor: colors.base.surfaceL2, borderColor: colors.base.border }]}
            onPress={() => { }}
          >
            <Ionicons name="language-outline" size={20} color={colors.text.primary} />
            <Text style={[typography.body, { color: colors.text.primary, marginLeft: 8 }]}>English</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} style={{ marginLeft: 'auto' }} />
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showImage}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImage(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowImage(false)}
        >
          {avatarUri && (
            <Image
              source={{ uri: avatarUri }}
              style={{ width: '90%', height: '80%' }}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 64;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 20 },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeOption: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarPressable: { position: 'relative' },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameColumn: { marginLeft: 14, flex: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  actionButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  logoutButton: { backgroundColor: 'transparent', borderWidth: 1.5 },
});
