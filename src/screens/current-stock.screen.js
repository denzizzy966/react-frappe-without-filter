import { Layout, Input, Text, Card, Spinner, Button } from "@ui-kitten/components";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { FlashList } from "@shopify/flash-list";
import { useFrappe } from "../provider/backend";
import { ActivityIndicator } from "react-native";

const CurrentStockList = ({ item }) => {
  return (
    <Card key={item.name} style={{ width: "100%", marginBottom: 10 }}>
      <Text category="h6" style={{ marginBottom: 5 }}>{item.item_code}</Text>
      <Layout style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
        <Layout>
          <Text category="s2" appearance="hint">Item Name</Text>
          <Text category="p2">{item.item_name}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Warehouse</Text>
          <Text category="p2">{item.warehouse}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Actual Qty</Text>
          <Text category="p2">{item.actual_qty}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Reserved Qty</Text>
          <Text category="p2">{item.reserved_qty || 0}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Projected Qty</Text>
          <Text category="p2">{item.projected_qty}</Text>
        </Layout>
      </Layout>
    </Card>
  );
};

export const CurrentStockScreen = ({ navigation }) => {
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [stockItems, setStockItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;
  const { db } = useFrappe();

  useEffect(() => {
    fetchCurrentStock();
  }, [accessToken]);

  async function fetchCurrentStock(search = "", loadMore = false) {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoadingItems(true);
        setPage(0);
      }

      const filters = search 
        ? [
            ["item_code", "like", `%${search}%`],
            ["item_name", "like", `%${search}%`]
          ]
        : [];
      
      const result = await db.getDocList("Bin", { 
        fields: ["name", "item_code", "item_name", "warehouse", "actual_qty", 
                "reserved_qty", "projected_qty", "stock_uom"],
        filters: filters,
        orderBy: { field: "modified", order: "desc" },
        limit_start: loadMore ? (page + 1) * ITEMS_PER_PAGE : 0,
        limit: ITEMS_PER_PAGE
      });

      if (result.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      if (loadMore) {
        setStockItems(prev => [...prev, ...result]);
        setPage(prev => prev + 1);
      } else {
        setStockItems(result);
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
        setLoadingItems(false);
      }
    }
  }

  const handleSearch = () => {
    fetchCurrentStock(searchQuery);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchCurrentStock(searchQuery, true);
    }
  };

  const ListFooterComponent = () => {
    if (loadingMore) {
      return (
        <Layout style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" />
        </Layout>
      );
    }
    if (!hasMore && stockItems.length > 0) {
      return (
        <Text style={{ textAlign: 'center', padding: 10 }} appearance="hint">
          No more items to load
        </Text>
      );
    }
    return null;
  };

  return (
    <Layout
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
      }}
    >
      <Text
        category="h5"
        style={{
          marginBottom: 20,
          alignSelf: 'flex-start'
        }}
      >
        Current Stock
      </Text>
      <Layout style={{ flexDirection: 'row', width: '100%', marginBottom: 20 }}>
        <Input
          value={searchQuery}
          onSubmitEditing={handleSearch}
          onChangeText={(nextValue) => {
            setSearchQuery(nextValue);
            if (!nextValue) {
              fetchCurrentStock();
            }
          }}
          placeholder="Search items..."
          style={{ flex: 1 }}
        />
      </Layout>

      {!loadingItems ? (
        <Layout style={{ flex: 1 }}>
          <FlashList
            data={stockItems}
            renderItem={({ item }) => <CurrentStockList item={item} />}
            estimatedItemSize={100}
            onRefresh={() => fetchCurrentStock(searchQuery)}
            refreshing={loadingItems}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={ListFooterComponent}
          />
        </Layout>
      ) : (
        <Layout style={{ marginTop: 50 }}>
          <Spinner />
        </Layout>
      )}
    </Layout>
  );
};
