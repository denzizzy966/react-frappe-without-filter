import { Layout, Text, Button } from "@ui-kitten/components";
import React from "react";
import { StyleSheet, Dimensions } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';

const renderIcon = (name) => (props) => (
  <MaterialCommunityIcons name={name} size={24} color="#FFFFFF" />
);

export const StockScreen = ({ navigation }) => {
  const menuItems = [
    { title: 'Current Stock', route: 'Bin', icon: renderIcon('archive-outline') },
    { title: 'Stock Entry', route: 'StockEntry', icon: renderIcon('swap-horizontal') },
  ];

  const screenWidth = Dimensions.get('window').width;
  const buttonWidth = (screenWidth - 60) / 2; // 60 = padding (20) * 2 + gap between buttons (20)

  return (
    <Layout style={styles.container}>
      <Text category="h5" style={styles.title}>
        Stock Management
      </Text>

      <Layout style={styles.gridContainer}>
        {menuItems.map((item, index) => (
          <Button
            key={item.route}
            onPress={() => navigation.navigate(item.route)}
            style={[styles.button, { width: buttonWidth }]}
            accessoryLeft={item.icon}
            appearance="filled"
            status="primary"
          >
            {item.title}
          </Button>
        ))}
      </Layout>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 20,
  },
  button: {
    marginBottom: 10,
    minHeight: 80,
    justifyContent: 'center',
  },
});
