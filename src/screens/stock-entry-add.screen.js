import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Layout, Text, Card, Button, Input, Select, SelectItem, TopNavigation, TopNavigationAction, Spinner, Divider, CheckBox, Modal } from "@ui-kitten/components";
import { useFrappe } from "../provider/backend";
import Toast from 'react-native-toast-message';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STOCK_ENTRY_TYPES = [
  'Material Issue',
  'Material Receipt',
  'Material Transfer'
];

const ItemCard = ({ item, index, warehouses, stockEntryType, onWarehouseChange, onRackChange, onDelete }) => {
  const showSourceFields = stockEntryType === 'Material Issue' || stockEntryType === 'Material Transfer';
  const showTargetFields = stockEntryType === 'Material Receipt' || stockEntryType === 'Material Transfer';

  return (
    <Card style={styles.card}>
      <Layout style={styles.cardHeader}>
        <Text category="h6">#{index + 1}</Text>
        <Button
          size="small"
          status="danger"
          appearance="ghost"
          accessoryLeft={props => <MaterialIcons name="delete" size={20} color="#FF3D71" />}
          onPress={() => onDelete(index)}
        />
      </Layout>
      
      <Layout style={styles.cardContent}>
        {showSourceFields && (
          <Layout style={styles.row}>
            <Layout style={styles.column}>
              <Text category="s2" appearance="hint">Source Warehouse</Text>
              <Select
                style={styles.select}
                placeholder="Select Option"
                value={item.s_warehouse}
                onSelect={index => onWarehouseChange(item.index, 'source', warehouses[index.row])}
              >
                {warehouses.map((wh, idx) => (
                  <SelectItem key={idx} title={wh} />
                ))}
              </Select>
            </Layout>
            <Layout style={styles.column}>
              <Text category="s2" appearance="hint">Source Rack</Text>
              <Input
                style={styles.input}
                placeholder="Enter rack"
                value={item.custom_source_rack || ''}
                onChangeText={text => onRackChange(item.index, 'source', text)}
              />
            </Layout>
          </Layout>
        )}

        {showTargetFields && (
          <Layout style={styles.row}>
            <Layout style={styles.column}>
              <Text category="s2" appearance="hint">Target Warehouse</Text>
              <Select
                style={styles.select}
                placeholder="Select Option"
                value={item.t_warehouse}
                onSelect={index => onWarehouseChange(item.index, 'target', warehouses[index.row])}
              >
                {warehouses.map((wh, idx) => (
                  <SelectItem key={idx} title={wh} />
                ))}
              </Select>
            </Layout>
            <Layout style={styles.column}>
              <Text category="s2" appearance="hint">Target Rack</Text>
              <Input
                style={styles.input}
                placeholder="Enter rack"
                value={item.custom_target_rack || ''}
                onChangeText={text => onRackChange(item.index, 'target', text)}
              />
            </Layout>
          </Layout>
        )}

        <Layout style={styles.itemInfo}>
          <Text category="s2" appearance="hint">Item Code</Text>
          <Text category="p1">{item.item_code}: {item.item_name}</Text>
        </Layout>

        <Layout style={styles.quantityInfo}>
          <Text category="s2" appearance="hint">Quantity</Text>
          <Text category="p1">{item.quantity} {item.uom}</Text>
        </Layout>
      </Layout>
    </Card>
  );
};

export const StockEntryAddScreen = ({ route, navigation }) => {
  const { items } = route.params || { items: [] };
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [stockEntryType, setStockEntryType] = useState('Material Receipt');
  const [series, setSeries] = useState('MAT-STE-YYYY-');
  const [editDateTime, setEditDateTime] = useState(false);
  const [postingDate, setPostingDate] = useState(new Date());
  const [postingHours, setPostingHours] = useState(new Date().getHours().toString().padStart(2, '0'));
  const [postingMinutes, setPostingMinutes] = useState(new Date().getMinutes().toString().padStart(2, '0'));
  const [postingSeconds, setPostingSeconds] = useState(new Date().getSeconds().toString().padStart(2, '0'));
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItem, setNewItem] = useState({
    item_code: '',
    item_name: '',
    quantity: '1',
    uom: '',
  });
  const [itemsList, setItemsList] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const { db } = useFrappe();

  useEffect(() => {
    fetchWarehouses();
    fetchItems();
    if (items && items.length > 0) {
      const formattedItems = items.map((item, idx) => ({
        ...item,
        index: idx,
        s_warehouse: '',
        t_warehouse: '',
        custom_source_rack: '',
        custom_target_rack: '',
        qty: item.quantity || 1
      }));
      setStockItems(formattedItems);
    }
  }, []);

  const fetchWarehouses = async () => {
    try {
      const result = await db.getDocList('Warehouse', {
        fields: ['name'],
        filters: [['is_group', '=', 0]]
      });
      const warehouseNames = result.map(w => w.name);
      setWarehouses(warehouseNames);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch warehouses',
        position: 'top'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const result = await db.getDocList('Item', {
        fields: ['name', 'item_name', 'stock_uom'],
        limit: 1000
      });
      setItemsList(result);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleItemSearch = (query) => {
    if (query.length > 0) {
      const filtered = itemsList.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.item_name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);
      setFilteredItems(filtered);
    } else {
      setFilteredItems([]);
    }
    setNewItem(prev => ({ ...prev, item_code: query }));
  };

  const handleItemSelect = (item) => {
    setNewItem({
      item_code: item.name,
      item_name: item.item_name,
      quantity: '1',
      uom: item.stock_uom,
    });
    setFilteredItems([]);
  };

  const handleAddItem = () => {
    if (!newItem.item_code || !newItem.quantity) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please fill all required fields',
        position: 'top'
      });
      return;
    }

    const newIndex = stockItems.length > 0 ? Math.max(...stockItems.map(item => item.index)) + 1 : 0;
    setStockItems(prev => [...prev, {
      ...newItem,
      index: newIndex,
      s_warehouse: '',
      t_warehouse: '',
      custom_source_rack: '',
      custom_target_rack: '',
      quantity: parseFloat(newItem.quantity)
    }]);

    setNewItem({
      item_code: '',
      item_name: '',
      quantity: '1',
      uom: '',
    });
    setShowAddItemModal(false);
  };

  const handleWarehouseChange = (itemIndex, type, warehouse) => {
    setStockItems(prevItems => 
      prevItems.map(item => 
        item.index === itemIndex 
          ? { 
              ...item, 
              [type === 'source' ? 's_warehouse' : 't_warehouse']: warehouse 
            }
          : item
      )
    );
  };

  const handleRackChange = (itemIndex, type, rack) => {
    setStockItems(prevItems => 
      prevItems.map(item => 
        item.index === itemIndex 
          ? { 
              ...item, 
              [type === 'source' ? 'custom_source_rack' : 'custom_target_rack']: rack 
            }
          : item
      )
    );
  };

  const handleDeleteItem = (index) => {
    setStockItems(items => items.filter(item => item.index !== index));
  };

  const formatTime = () => {
    return `${postingHours}:${postingMinutes}:${postingSeconds}`;
  };

  const handleTimeChange = (field, value) => {
    let numValue = parseInt(value, 10);
    
    switch(field) {
      case 'hours':
        if (numValue >= 0 && numValue <= 23) {
          setPostingHours(value.padStart(2, '0'));
        }
        break;
      case 'minutes':
        if (numValue >= 0 && numValue <= 59) {
          setPostingMinutes(value.padStart(2, '0'));
        }
        break;
      case 'seconds':
        if (numValue >= 0 && numValue <= 59) {
          setPostingSeconds(value.padStart(2, '0'));
        }
        break;
    }
  };

  const handleSubmit = async () => {
    // Validate required fields based on stock entry type
    const validateWarehouse = () => {
      if (stockEntryType === 'Material Issue') {
        return stockItems.every(item => item.s_warehouse);
      } else if (stockEntryType === 'Material Receipt') {
        return stockItems.every(item => item.t_warehouse);
      } else {
        return stockItems.every(item => item.s_warehouse && item.t_warehouse);
      }
    };

    if (!validateWarehouse()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please select warehouses for all items',
        position: 'top'
      });
      return;
    }

    try {
      setLoading(true);
      const stockEntry = {
        doctype: 'Stock Entry',
        series: series,
        stock_entry_type: stockEntryType,
        posting_date: postingDate.toISOString().split('T')[0],
        posting_time: formatTime(),
        company: 'Halosocia (Demo)',
        items: stockItems.map(item => ({
          item_code: item.item_code,
          qty: item.quantity,
          s_warehouse: item.s_warehouse,
          t_warehouse: item.t_warehouse,
          custom_source_rack: item.custom_source_rack,
          custom_target_rack: item.custom_target_rack,
          uom: item.uom
        }))
      };

      await db.createDoc('Stock Entry', stockEntry);
      
      // Clear scanned items from storage
      await AsyncStorage.removeItem('scannedItems');
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Stock entry created successfully',
        position: 'top'
      });
      navigation.navigate('Stock', { screen: 'StockMenu' });
    } catch (error) {
      console.error('Error creating stock entry:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
        position: 'top'
      });
    } finally {
      setLoading(false);
    }
  };

  const BackAction = () => (
    <TopNavigationAction
      icon={(props) => <MaterialIcons name="arrow-back" size={24} />}
      onPress={() => navigation.goBack()}
    />
  );

  if (loading) {
    return (
      <Layout style={styles.loadingContainer}>
        <Spinner size="large" />
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      <TopNavigation
        title="Create Stock Entry"
        alignment="center"
        style={styles.topNav}
        accessoryLeft={() => (
          <TopNavigationAction
            icon={props => <MaterialIcons name="arrow-back" size={24} />}
            onPress={() => navigation.goBack()}
          />
        )}
      />
      
      <ScrollView style={styles.scrollView}>
        <Layout style={styles.content}>
          <Layout style={styles.headerInfo}>
            <Layout style={styles.headerRow}>
              <Layout style={styles.headerColumn}>
                <Text category="s2" appearance="hint">Series</Text>
                <Text category="p1">{series}</Text>
              </Layout>
              <Layout style={styles.headerColumn}>
                <Text category="s2" appearance="hint">Stock Entry Type</Text>
                <Select
                  value={stockEntryType}
                  onSelect={index => setStockEntryType(STOCK_ENTRY_TYPES[index.row])}
                >
                  {STOCK_ENTRY_TYPES.map((type, idx) => (
                    <SelectItem key={idx} title={type} />
                  ))}
                </Select>
              </Layout>
            </Layout>

            <Layout style={styles.headerRow}>
              <Layout style={styles.headerColumn}>
                <Text category="s2" appearance="hint">Company</Text>
                <Text category="p1">Halosocia (Demo)</Text>
              </Layout>
            </Layout>

            <Layout style={styles.headerRow}>
              <Layout style={styles.headerColumn}>
                <CheckBox
                  checked={editDateTime}
                  onChange={nextChecked => setEditDateTime(nextChecked)}
                >
                  Edit Posting Date and Time
                </CheckBox>
              </Layout>
            </Layout>

            {editDateTime && (
              <Layout style={styles.headerRow}>
                <Layout style={styles.headerColumn}>
                  <Text category="s2" appearance="hint">Posting Date</Text>
                  <Datepicker
                    date={postingDate}
                    onSelect={nextDate => setPostingDate(nextDate)}
                  />
                </Layout>
                <Layout style={styles.headerColumn}>
                  <Text category="s2" appearance="hint">Posting Time</Text>
                  <Layout style={styles.timeInputContainer}>
                    <Input
                      style={styles.timeInput}
                      value={postingHours}
                      placeholder="HH"
                      keyboardType="numeric"
                      maxLength={2}
                      onChangeText={value => handleTimeChange('hours', value)}
                    />
                    <Text>:</Text>
                    <Input
                      style={styles.timeInput}
                      value={postingMinutes}
                      placeholder="MM"
                      keyboardType="numeric"
                      maxLength={2}
                      onChangeText={value => handleTimeChange('minutes', value)}
                    />
                    <Text>:</Text>
                    <Input
                      style={styles.timeInput}
                      value={postingSeconds}
                      placeholder="SS"
                      keyboardType="numeric"
                      maxLength={2}
                      onChangeText={value => handleTimeChange('seconds', value)}
                    />
                  </Layout>
                </Layout>
              </Layout>
            )}
          </Layout>

          <Divider style={styles.divider} />

          <Button
            style={styles.addButton}
            status="info"
            accessoryLeft={props => <MaterialIcons name="add" size={20} color="white" />}
            onPress={() => setShowAddItemModal(true)}
          >
            Add Item
          </Button>

          {stockItems.map((item) => (
            <ItemCard
              key={item.index}
              item={item}
              index={item.index}
              warehouses={warehouses}
              stockEntryType={stockEntryType}
              onWarehouseChange={handleWarehouseChange}
              onRackChange={handleRackChange}
              onDelete={handleDeleteItem}
            />
          ))}
          
          <Button
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={stockItems.length === 0}
          >
            Submit Stock Entry
          </Button>
        </Layout>
      </ScrollView>

      <Modal
        visible={showAddItemModal}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => setShowAddItemModal(false)}
      >
        <Card disabled style={styles.modalCard}>
          <Text category="h6" style={styles.modalTitle}>Add New Item</Text>
          
          <Layout style={styles.modalContent}>
            <Layout style={[styles.inputContainer, { zIndex: 1 }]}>
              <Text category="s2" appearance="hint">Item Code *</Text>
              <Input
                placeholder="Search item code"
                value={newItem.item_code}
                onChangeText={handleItemSearch}
                style={styles.searchInput}
              />
              {filteredItems.length > 0 && (
                <Layout style={styles.dropdownContainer}>
                  {filteredItems.map((item, index) => (
                    <Button
                      key={index}
                      appearance="ghost"
                      status="basic"
                      style={styles.dropdownItem}
                      onPress={() => handleItemSelect(item)}
                    >
                      <Layout style={styles.dropdownItemContent}>
                        <Text>{item.name}</Text>
                        <Text appearance="hint" style={styles.itemNameText}>{item.item_name}</Text>
                      </Layout>
                    </Button>
                  ))}
                </Layout>
              )}
            </Layout>

            <Layout style={[styles.inputContainer, { zIndex: 0 }]}>
              <Text category="s2" appearance="hint">Item Name</Text>
              <Input
                placeholder="Item name"
                value={newItem.item_name}
                disabled
              />
            </Layout>

            <Layout style={styles.row}>
              <Layout style={[styles.inputContainer, { flex: 1 }]}>
                <Text category="s2" appearance="hint">Quantity *</Text>
                <Input
                  placeholder="Enter quantity"
                  value={newItem.quantity}
                  keyboardType="numeric"
                  onChangeText={value => setNewItem(prev => ({ ...prev, quantity: value }))}
                />
              </Layout>

              <Layout style={[styles.inputContainer, { flex: 1 }]}>
                <Text category="s2" appearance="hint">UOM</Text>
                <Input
                  placeholder="Unit of measure"
                  value={newItem.uom}
                  disabled
                />
              </Layout>
            </Layout>
          </Layout>

          <Layout style={styles.modalActions}>
            <Button
              status="basic"
              onPress={() => setShowAddItemModal(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              onPress={handleAddItem}
              style={styles.modalButton}
            >
              Add Item
            </Button>
          </Layout>
        </Card>
      </Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  headerInfo: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 16,
  },
  headerColumn: {
    flex: 1,
    gap: 4,
  },
  divider: {
    marginVertical: 8,
  },
  card: {
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardContent: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 4,
  },
  itemInfo: {
    gap: 4,
  },
  quantityInfo: {
    gap: 4,
  },
  select: {
    flex: 1,
  },
  input: {
    flex: 1,
  },
  submitButton: {
    marginTop: 8,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeInput: {
    flex: 1,
    maxWidth: 60,
  },
  addButton: {
    marginBottom: 16,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCard: {
    width: '95%',
    maxWidth: 600,
    minWidth: 350,
  },
  modalTitle: {
    marginBottom: 16,
  },
  modalContent: {
    gap: 16,
    position: 'relative',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 8,
  },
  modalButton: {
    minWidth: 100,
  },
  inputContainer: {
    gap: 4,
  },
  searchInput: {
    marginBottom: 0,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E4E9F2',
    borderRadius: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 3,
    marginTop: -4,
  },
  dropdownItem: {
    width: '100%',
    justifyContent: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dropdownItemContent: {
    width: '100%',
  },
  itemNameText: {
    fontSize: 12,
    marginTop: 4,
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
});
