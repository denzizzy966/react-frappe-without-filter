import { Layout, Text, Tab, TabBar, Card, Input, Toggle, CheckBox, Button, Spinner, TopNavigation, TopNavigationAction } from "@ui-kitten/components";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { useFrappe } from "../provider/backend";
import { ScrollView, Image, ActivityIndicator } from "react-native";
import { BASE_URI } from "../data/constants";
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ReorderLevelList = ({ item }) => (
  <Card style={{ marginBottom: 10, width: '100%' }}>
    <Layout style={{ gap: 10 }}>
      <Layout style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Layout style={{ flex: 1 }}>
          <Text category="s2" appearance="hint">Check in</Text>
          <Text category="p2">{item.warehouse_group}</Text>
        </Layout>
        <Layout style={{ flex: 1 }}>
          <Text category="s2" appearance="hint">Request for</Text>
          <Text category="p2">{item.warehouse}</Text>
        </Layout>
      </Layout>
      <Layout style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Layout style={{ flex: 1 }}>
          <Text category="s2" appearance="hint">Re-order Level</Text>
          <Text category="p2">{item.warehouse_reorder_level}</Text>
        </Layout>
        <Layout style={{ flex: 1 }}>
          <Text category="s2" appearance="hint">Re-order Qty</Text>
          <Text category="p2">{item.warehouse_reorder_qty}</Text>
        </Layout>
        <Layout style={{ flex: 1 }}>
          <Text category="s2" appearance="hint">Request Type</Text>
          <Text category="p2">{item.material_request_type}</Text>
        </Layout>
      </Layout>
    </Layout>
  </Card>
);

const StockList = ({ item }) => (
  <Card style={{ marginBottom: 10, width: '100%' }}>
    <Layout style={{ gap: 10 }}>
      <Layout style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Layout style={{ flex: 1 }}>
          <Text category="s2" appearance="hint">Warehouse</Text>
          <Text category="p2">{item.warehouse}</Text>
        </Layout>
        <Layout style={{ flex: 1 }}>
          <Text category="s2" appearance="hint">Stock Qty ({item.stock_uom})</Text>
          <Text category="p2">{item.actual_qty}</Text>
        </Layout>
      </Layout>
    </Layout>
  </Card>
);

export const ItemDetailScreen = ({ route, navigation }) => {
  const { item: routeItem, itemId: routeItemId } = route.params;
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [item, setItem] = useState(routeItem || null);
  const [loading, setLoading] = useState(!routeItem);
  const [stockList, setStockList] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;
  const { db } = useFrappe();

  const BackIcon = (props) => (
    <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
  );

  const BackAction = () => (
    <TopNavigationAction icon={BackIcon} onPress={() => navigation.goBack()}/>
  );

  useEffect(() => {
    if (!routeItem && routeItemId) {
      fetchItem(routeItemId);
    }
  }, [routeItemId]);

  const fetchItem = async (id) => {
    try {
      const result = await db.getDoc("Item", id);
      setItem(result);
    } catch (e) {
      if (e.httpStatus === 403 || e.httpStatus === 401) {
        await refreshAccessTokenAsync();
      } else {
        console.error(e);
        Toast.show({
          type: "error",
          position: 'top',
          text1: 'Error',
          text2: e.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStockList = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoadingStock(true);
        setPage(0);
      }

      const result = await db.getDocList("Bin", {
        fields: ["name", "item_code", "warehouse", "actual_qty", "stock_uom"],
        filters: [["item_code", "=", item.item_code]],
        orderBy: {
          field: "creation",
          order: "desc"
        },
        limit_start: loadMore ? (page + 1) * ITEMS_PER_PAGE : 0,
        limit: ITEMS_PER_PAGE
      });

      if (result.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      if (loadMore) {
        setStockList(prev => [...prev, ...result]);
        setPage(prev => prev + 1);
      } else {
        setStockList(result);
        setHasMore(true);
      }
    } catch (e) {
      if (e.httpStatus === 403 || e.httpStatus === 401) {
        await refreshAccessTokenAsync();
      } else {
        console.error(e);
        Toast.show({
          type: "error",
          position: 'top',
          text1: 'Error',
          text2: e.message
        });
      }
    } finally {
      if (loadMore) {
        setLoadingMore(false);
      } else {
        setLoadingStock(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchStockList(true);
    }
  };

  useEffect(() => {
    if (selectedIndex === 1 && item) {
      fetchStockList();
    }
  }, [selectedIndex, item]);

  if (loading) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size="large" />
      </Layout>
    );
  }

  if (!item) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text category="h6">Item not found</Text>
        <Button 
          style={{ marginTop: 20 }}
          onPress={() => navigation.goBack()}
        >
          Go Back
        </Button>
      </Layout>
    );
  }

  return (
    <Layout style={{ flex: 1 }}>
      <TopNavigation
        title={item.item_name || 'Item Detail'}
        alignment="center"
        accessoryLeft={BackAction}
        style={{ backgroundColor: '#fff', elevation: 2 }}
      />
      
      <ScrollView 
        style={{ flex: 1 }}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
          
          if (isCloseToBottom) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        <Layout style={{ marginTop: 16 }}>
          {item.image && (
            <Layout>
              <Image 
                source={{ uri: `${BASE_URI}${item.image}` }}
                style={{ width: '100%', height: 200, resizeMode: 'contain' }}
              />
            </Layout>
          )}
          
          <TabBar
            style={{ marginVertical: 16 }}
            selectedIndex={selectedIndex}
            onSelect={index => setSelectedIndex(index)}>
            <Tab title='Details' />
            <Tab title='Stock' />
          </TabBar>

          {selectedIndex === 0 ? (
            <Layout style={{ padding: 15, gap: 15, marginBottom: 60 }}>
              <Layout>
                <Text category="s2" appearance="hint">Name</Text>
                <Input
                  value={item.name}
                  disabled
                />
              </Layout>

              <Layout>
                <Text category="s2" appearance="hint">Item Code</Text>
                <Input
                  value={item.item_code}
                  disabled
                />
              </Layout>

              <Layout>
                <Text category="s2" appearance="hint">Item Name</Text>
                <Input
                  value={item.item_name}
                  disabled
                />
              </Layout>

              <Layout>
                <Text category="s2" appearance="hint">Custom Barcode</Text>
                <Input
                  value={item.custom_barcode}
                  disabled
                />
              </Layout>

              <Layout>
                <Text category="s2" appearance="hint">Item Group</Text>
                <Input
                  value={item.item_group}
                  disabled
                />
              </Layout>

              <Layout>
                <Text category="s2" appearance="hint">Reorder Levels</Text>
                {item.reorder_levels && item.reorder_levels.length > 0 ? (
                  item.reorder_levels.map((level, index) => (
                    <ReorderLevelList key={level.name || index} item={level} />
                  ))
                ) : (
                  <Text appearance="hint">No reorder levels configured</Text>
                )}
              </Layout>
            </Layout>
          ) : (
            <Layout style={{ flex: 1, padding: 15, marginBottom: 60 }}>
              {loadingStock ? (
                <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Spinner size="large" />
                </Layout>
              ) : stockList.length > 0 ? (
                <Layout style={{ gap: 10 }}>
                  <Text category="h6">Current Stock</Text>
                  {stockList.map((stock, index) => (
                    <StockList key={stock.name || index} item={stock} />
                  ))}
                  {loadingMore && (
                    <Layout style={{ padding: 20, alignItems: 'center' }}>
                      <ActivityIndicator size="small" />
                    </Layout>
                  )}
                  {!hasMore && stockList.length > 0 && (
                    <Text style={{ textAlign: 'center', padding: 10 }} appearance="hint">
                      No more items to load
                    </Text>
                  )}
                </Layout>
              ) : (
                <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text appearance="hint">No stock information available</Text>
                </Layout>
              )}
            </Layout>
          )}
        </Layout>
      </ScrollView>
    </Layout>
  );
};
