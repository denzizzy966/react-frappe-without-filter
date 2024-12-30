import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { HomeScreen } from "../../screens/home.screen";
import { DetailsScreen } from "../../screens/details.screen";
import { BottomNavigation, BottomNavigationTab } from "@ui-kitten/components";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { AuthNavigator } from "./auth.navigator";
import { AuthContext } from "../../provider/auth";
import { ItemScreen } from "../../screens/item.screen";
import { ItemAddScreen } from "../../screens/item-add.screen";
import { ItemGroupScreen } from "../../screens/item-group.screen";
import { ItemGroupAddScreen } from "../../screens/item-group-add.screen";
import { UOMScreen } from "../../screens/uom.screen";
import { UOMAddScreen } from "../../screens/uom-add.screen";
import { WarehouseScreen } from "../../screens/warehouse.screen";
import { WarehouseAddScreen } from "../../screens/warehouse-add.screen";
import { MasterScreen } from "../../screens/master.screen";
import { StockScreen } from "../../screens/stock.screen";
import { BinScreen } from "../../screens/bin.screen";
import { StockEntryScreen } from "../../screens/stock-entry.screen";
import { StockEntryDetailScreen } from "../../screens/stock-entry-detail.screen";
import { TodoScreen } from "../../screens/todo.screen";
import { ItemDetailScreen } from "../../screens/item-detail.screen";
import { QRScannerScreen } from "../../screens/qr-scanner.screen";
import { ItemStockScreen } from "../../screens/item-stock.screen";
import { StockEntryAddScreen } from "../../screens/stock-entry-add.screen";
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { Navigator: TabNavigator, Screen: TabScreen } = createBottomTabNavigator();
const { Navigator: StackNavigator, Screen: StackScreen } = createStackNavigator();

const TabNavigatorComponent = () => {
  return (
    <TabNavigator 
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Master') {
            iconName = 'view-grid';
          } else if (route.name === 'Stock') {
            iconName = 'package-variant-closed';
          } else if (route.name === 'QRScanner') {
            iconName = 'qrcode-scan';
          }

          return <MaterialCommunityIcons name={iconName} size={24} color={focused ? '#2f95dc' : '#ccc'} />;
        },
        tabBarActiveTintColor: '#2f95dc',
        tabBarInactiveTintColor: '#ccc',
        headerShown: false
      })}
    >
      <TabScreen name="Home" component={HomeScreen} />
      <TabScreen name="Master" component={MasterStack} />
      <TabScreen name="Stock" component={StockStack} />
      <TabScreen 
        name="QRScanner" 
        component={QRScannerScreen} 
        options={{
          title: 'Scan QR',
          unmountOnBlur: false
        }}
      />
      <TabScreen 
        name="Detail" 
        component={DetailsScreen}
        options={{
          tabBarButton: () => null,
          unmountOnBlur: true
        }}
      />
    </TabNavigator>
  );
};

const MasterStack = () => (
  <StackNavigator screenOptions={{ headerShown: false }}>
    <StackScreen name="MasterMenu" component={MasterScreen} />
    <StackScreen name="Item" component={ItemStack} />
    <StackScreen name="ItemGroup" component={ItemGroupStack} />
    <StackScreen name="UOM" component={UOMStack} />
    <StackScreen name="Warehouse" component={WarehouseStack} />
  </StackNavigator>
);

const ItemStack = () => (
  <StackNavigator screenOptions={{ headerShown: false }}>
    <StackScreen name="ItemList" component={ItemScreen} />
    <StackScreen name="ItemAdd" component={ItemAddScreen} />
    <StackScreen name="ItemDetail" component={ItemDetailScreen} />
  </StackNavigator>
);

const ItemGroupStack = () => (
  <StackNavigator screenOptions={{ headerShown: false }}>
    <StackScreen name="ItemGroupList" component={ItemGroupScreen} />
    <StackScreen name="ItemGroupAdd" component={ItemGroupAddScreen} />
  </StackNavigator>
);

const UOMStack = () => (
  <StackNavigator screenOptions={{ headerShown: false }}>
    <StackScreen name="UOMList" component={UOMScreen} />
    <StackScreen name="UOMAdd" component={UOMAddScreen} />
  </StackNavigator>
);

const WarehouseStack = () => (
  <StackNavigator screenOptions={{ headerShown: false }}>
    <StackScreen name="WarehouseList" component={WarehouseScreen} />
    <StackScreen name="WarehouseAdd" component={WarehouseAddScreen} />
  </StackNavigator>
);

const StockStack = () => (
  <StackNavigator screenOptions={{ headerShown: false }}>
    <StackScreen name="StockMenu" component={StockScreen} />
    <StackScreen name="Bin" component={BinScreen} />
    <StackScreen name="StockEntry" component={StockEntryScreen} />
    <StackScreen name="StockEntryDetail" component={StockEntryDetailScreen} />
    <StackScreen name="StockEntryAdd" component={StockEntryAddScreen} />
    <StackScreen name="ItemStock" component={ItemStockScreen} />
    <StackScreen name="ItemDetail" component={ItemDetailScreen} />
    <StackScreen name="QRScanner" component={QRScannerScreen} />
  </StackNavigator>
);

export const AppNavigator = () => {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <NavigationContainer>
      {isAuthenticated ? <TabNavigatorComponent /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
