import React, { useState, useEffect } from 'react';
import { Layout, Text, Card, Spinner, TopNavigation, TopNavigationAction } from "@ui-kitten/components";
import { FlashList } from "@shopify/flash-list";
import { useFrappe } from "../provider/backend";
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

const ItemStockCard = ({ item }) => (
  <Card style={styles.card}>
    <Layout style={styles.cardContent}>
      <Layout style={styles.itemInfo}>
        <Text category="h6">{item.item_name}</Text>
        <Text category="s1">{item.item_code}</Text>
        <Layout style={styles.detailsRow}>
          <Layout>
            <Text category="s2" appearance="hint">Group</Text>
            <Text category="p2">{item.item_group}</Text>
          </Layout>
          <Layout>
            <Text category="s2" appearance="hint">UOM</Text>
            <Text category="p2">{item.uom}</Text>
          </Layout>
        </Layout>
      </Layout>
      <Layout style={styles.stockInfo}>
        <Text category="s1" status={item.total_qty > 0 ? 'success' : 'danger'}>
          {item.total_qty || 0}
        </Text>
        <Text category="c1" appearance="hint">In Stock</Text>
      </Layout>
    </Layout>
    {item.warehouse_qty && item.warehouse_qty.length > 0 && (
      <Layout style={styles.warehouseList}>
        {item.warehouse_qty.map((wh, index) => (
          <Layout key={index} style={styles.warehouseItem}>
            <Text category="s2">{wh.warehouse}</Text>
            <Text category="p2">{wh.actual_qty}</Text>
          </Layout>
        ))}
      </Layout>
    )}
  </Card>
);

export const ItemStockScreen = ({ route, navigation }) => {
  const [loading, setLoading] = useState(true);
  const [itemsWithStock, setItemsWithStock] = useState([]);
  const { db } = useFrappe();
  const { items } = route.params;

  const handleBack = () => {
    navigation.navigate('QRScanner');
  };

  const BackAction = () => (
    <TopNavigationAction
      icon={(props) => <MaterialIcons name="arrow-back" size={24} color="#000" />}
      onPress={handleBack}
    />
  );

  useEffect(() => {
    const fetchStockInfo = async () => {
      try {
        setLoading(true);
        const itemsPromises = items.map(async (item) => {
          const binData = await db.getDocList('Bin', {
            fields: ['warehouse', 'actual_qty'],
            filters: [['item_code', '=', item.item_code]],
          });

          const warehouse_qty = binData.map(bin => ({
            warehouse: bin.warehouse,
            actual_qty: bin.actual_qty
          }));

          const total_qty = warehouse_qty.reduce((sum, wh) => sum + (wh.actual_qty || 0), 0);

          return {
            ...item,
            warehouse_qty,
            total_qty
          };
        });

        const stockData = await Promise.all(itemsPromises);
        setItemsWithStock(stockData);
      } catch (error) {
        console.error('Error fetching stock info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStockInfo();
  }, [items]);

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
        title="Current Stock"
        alignment="center"
        accessoryLeft={BackAction}
      />
      <FlashList
        data={itemsWithStock}
        renderItem={({ item }) => <ItemStockCard item={item} />}
        estimatedItemSize={200}
        contentContainerStyle={styles.listContainer}
      />
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
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 15,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 4,
  },
  stockInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  warehouseList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDF1F7',
  },
  warehouseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});
