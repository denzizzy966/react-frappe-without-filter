import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { Text, Button, Spinner, List, ListItem, Layout, Input, TopNavigation, TopNavigationAction } from '@ui-kitten/components';
import { Camera, CameraType } from 'expo-camera';
import { useFrappe } from '../provider/backend';
import Toast from 'react-native-toast-message';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const QRScannerScreen = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const { db } = useFrappe();
  const navigation = useNavigation();
  const lastScannedRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadSavedItems();
  }, []);

  useEffect(() => {
    saveItems();
  }, [scannedItems]);

  const loadSavedItems = async () => {
    try {
      const savedItems = await AsyncStorage.getItem('scannedItems');
      if (savedItems) {
        setScannedItems(JSON.parse(savedItems));
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  };

  const saveItems = async () => {
    try {
      await AsyncStorage.setItem('scannedItems', JSON.stringify(scannedItems));
    } catch (error) {
      console.error('Error saving items:', error);
    }
  };

  const clearScannedItems = async () => {
    setScannedItems([]);
    try {
      await AsyncStorage.removeItem('scannedItems');
    } catch (error) {
      console.error('Error clearing items:', error);
    }
  };

  const updateItemQuantity = (index, newQty) => {
    setScannedItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        quantity: Math.max(1, Number(newQty))
      };
      return updatedItems;
    });
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (loading || !isScanning) return;
    
    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.code === data && 
        now - lastScannedRef.current.time < 2000) {
      return;
    }
    
    lastScannedRef.current = { code: data, time: now };
    
    try {
      setLoading(true);
      setIsScanning(false);
      setIsListExpanded(true);
      
      const items = await db.getDocList('Item', {
        fields: ['name', 'item_code', 'item_name', 'stock_uom', 'item_group'],
        filters: [['item_code', '=', data]]
      });

      if (items && items.length > 0) {
        const newItem = items[0];
        
        setScannedItems(prevItems => {
          const existingItemIndex = prevItems.findIndex(item => item.item_code === newItem.item_code);
          
          if (existingItemIndex >= 0) {
            const updatedItems = [...prevItems];
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity: updatedItems[existingItemIndex].quantity + 1
            };
            return updatedItems;
          } else {
            return [...prevItems, { 
              ...newItem, 
              quantity: 1,
              uom: newItem.stock_uom
            }];
          }
        });
        
        Toast.show({
          type: 'success',
          text1: 'Item added',
          text2: `${items[0].item_name}`,
          position: 'top'
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Item not found',
          text2: `No item found with code: ${data}`,
          position: 'top'
        });
        scanTimeoutRef.current = setTimeout(() => {
          setIsScanning(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error scanning:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
        position: 'top'
      });
      scanTimeoutRef.current = setTimeout(() => {
        setIsScanning(true);
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchItems = () => {
    if (scannedItems.length === 0) {
      navigation.navigate('Stock', {
        screen: 'StockMenu'
      });
    } else {
      navigation.navigate('Stock', {
        screen: 'ItemStock',
        params: { items: scannedItems }
      });
    }
  };

  const handleCreateStockEntry = () => {
    if (scannedItems.length === 0) {
      Toast.show({
        type: 'warning',
        text1: 'No Items',
        text2: 'Please scan items first',
        position: 'top'
      });
      return;
    }
    navigation.navigate('Stock', {
      screen: 'StockEntryAdd',
      params: { items: scannedItems }
    });
  };

  const toggleListExpanded = () => {
    setIsListExpanded(!isListExpanded);
    if (isListExpanded) {
      setIsScanning(true);
    }
  };

  const handleClearItems = async () => {
    setScannedItems([]);
    await AsyncStorage.removeItem('scannedItems');
    setIsListExpanded(false);
    setIsScanning(true);
  };

  const renderScannedItem = ({ item, index }) => (
    <ListItem
      style={styles.listItem}
      title={evaProps => (
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text {...evaProps} style={styles.itemName}>{item.item_name}</Text>
            <Text style={styles.itemDetails}>
              {item.item_code} | {item.item_group} | {item.uom}
            </Text>
          </View>
          <View style={styles.quantityContainer}>
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={() => updateItemQuantity(index, item.quantity - 1)}
            >
              <MaterialIcons name="remove" size={20} color="#2E3A59" />
            </TouchableOpacity>
            
            <Input
              style={styles.quantityInput}
              keyboardType="numeric"
              value={item.quantity.toString()}
              onChangeText={(text) => {
                const newQty = text === '' ? 1 : parseInt(text, 10);
                updateItemQuantity(index, newQty);
              }}
              size="small"
            />
            
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={() => updateItemQuantity(index, item.quantity + 1)}
            >
              <MaterialIcons name="add" size={20} color="#2E3A59" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => {
                setScannedItems(items => items.filter((_, idx) => idx !== index));
              }}
            >
              <MaterialIcons name="delete" size={24} color="#FF3D71" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
        <Button
          onPress={() => Camera.requestCameraPermissionsAsync()}
        >
          Grant Permission
        </Button>
      </View>
    );
  }

  return (
    <Layout style={styles.container}>
      <TopNavigation
        title="QR Scanner"
        alignment="center"
        style={styles.topNav}
        accessoryLeft={() => (
          <TopNavigationAction
            icon={props => <MaterialIcons name="arrow-back" size={24} />}
            onPress={() => navigation.goBack()}
          />
        )}
      />
      <Camera
        type={CameraType.back}
        style={StyleSheet.absoluteFillObject}
        onBarCodeScanned={isScanning ? handleBarCodeScanned : undefined}
      />
      
      {loading && (
        <View style={styles.overlay}>
          <Spinner size="large" />
        </View>
      )}

      <View style={[
        styles.floatingContainer,
        isListExpanded ? styles.floatingContainerExpanded : styles.floatingContainerMinimized
      ]}>
        <TouchableOpacity 
          style={styles.floatingHeader}
          onPress={toggleListExpanded}
          activeOpacity={0.7}
        >
          <Text category="h6" style={styles.floatingTitle}>
            Scanned Items ({scannedItems.length})
          </Text>
          <MaterialIcons 
            name={isListExpanded ? "expand-more" : "expand-less"} 
            size={24} 
            color="#000"
          />
        </TouchableOpacity>
        
        {isListExpanded && (
          <>
            <List
              style={styles.list}
              data={scannedItems}
              renderItem={renderScannedItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            
            <Layout style={styles.buttonContainer} level="1">
              <Button
                style={[styles.actionButton, styles.stockEntryButton]}
                status="primary"
                onPress={handleCreateStockEntry}
                accessoryLeft={props => <MaterialIcons name="add-box" size={20} color="white" />}
              >
                Stock Entry
              </Button>
              
              <Button
                style={[styles.actionButton, styles.searchButton]}
                status="info"
                onPress={handleSearchItems}
                accessoryLeft={props => <MaterialIcons name="search" size={20} color="white" />}
              >
                Search
              </Button>
              <Button
                style={[styles.actionButton, styles.clearButton]}
                status="danger"
                onPress={handleClearItems}
                accessoryLeft={props => <MaterialIcons name="clear-all" size={20} color="white" />}
              >
                Clear All
              </Button>
            </Layout>
          </>
        )}
      </View>

      {!isScanning && !loading && (
        <Button
          style={styles.resumeButton}
          onPress={() => setIsScanning(true)}
          accessoryLeft={props => <MaterialIcons name="camera" size={20} color="white" />}
        >
          Resume Scanning
        </Button>
      )}
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNav: {
    paddingTop: 20,
    paddingBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    backgroundColor: 'white',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  floatingContainerMinimized: {
    maxHeight: 60,
  },
  floatingContainerExpanded: {
    height: SCREEN_HEIGHT * 0.5,
  },
  floatingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  floatingTitle: {
    color: '#000',
  },
  list: {
    flex: 1,
  },
  listItem: {
    paddingVertical: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: '#8F9BB3',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    marginHorizontal: 2,
  },
  deleteButton: {
    marginLeft: 8,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    width: 45,
    marginHorizontal: 4,
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#E8E8E8',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  stockEntryButton: {
    backgroundColor: '#3366FF',
  },
  searchButton: {
    backgroundColor: '#2E3A59',
  },
  clearButton: {
    backgroundColor: '#FF3D71',
  },
  resumeButton: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
});
