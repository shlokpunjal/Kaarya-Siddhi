import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

const News = () => {
 const [newss, setNews] = useState([
  {
    title: "Test News",
    description: "This is a test description."
  }
]);
  const [loading, setLoading] = useState(false);

  // useEffect(() => {
  //   fetchNews();
  // }, []);

  const fetchNews = async () => {
    try {
      const response = await fetch(
        "https://newsapi.org/v2/top-headlines?country=in&apiKey=63cd0c985ff94d7e93c69a0eac2f8045",
      );

      const data = await response.json();
      console.log(data);
      setNews(data.aricles);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
  return (
    <SafeAreaView>
      <ActivityIndicator size="large" />
    </SafeAreaView>
  );
}
  return (
    <SafeAreaView style={{ flex: 1 }} >
      <View>
        <Text style={styles.title}>Rail News</Text>
      </View>
      <View style={styles.container}>
      <FlatList
        data={newss}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text numberOfLines={3}>
              {item.description}
            </Text>
          </View>
        )}
      />
    </View>
    </SafeAreaView>
  );
};

export default News;

const styles = StyleSheet.create({
  main: {},
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    padding: 15,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 3,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    backgroundColor: "#1A2744",
    color: "white",
    padding: 20,
    marginBottom: 8,
  },
});
