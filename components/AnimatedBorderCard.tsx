import React from "react";
import { View, StyleSheet } from "react-native";

type Props = {
  children: React.ReactNode;
};

export default function AnimatedBorderCard({ children }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.border}/>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    width:"90%",
    alignSelf:"center",
    position:"relative",
  },

  border:{
    position:"absolute",

    top:-3,
    left:-3,
    right:-3,
    bottom:-3,

    borderRadius:33,

    borderWidth:2,

    borderColor:"#E8870A",
  },

  content:{
    borderRadius:30,
    overflow:"hidden",
  }

});