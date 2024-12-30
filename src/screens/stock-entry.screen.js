import { Layout, Input, Text, Card, Spinner, Button } from "@ui-kitten/components";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { FlashList } from "@shopify/flash-list";
import { useFrappe } from "../provider/backend";
import { ActivityIndicator } from "react-native";

const StockEntryList = ({ item, onPress }) => {
  return (
    <Card 
      key={item.name} 
      style={{ width: "100%", marginBottom: 10 }}
      onPress={() => onPress(item.name)}
    >
      <Text category="h6" style={{ marginBottom: 5 }}>{item.name}</Text>
      <Layout style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
        <Layout>
          <Text category="s2" appearance="hint">Type</Text>
          <Text category="p2">{item.stock_entry_type}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Purpose</Text>
          <Text category="p2">{item.purpose}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Company</Text>
          <Text category="p2">{item.company}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Date & Time</Text>
          <Text category="p2">{item.posting_date} {item.posting_time}</Text>
        </Layout>
      </Layout>
    </Card>
  );
};

export const StockEntryScreen = ({ navigation }) => {
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [stockEntries, setStockEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;
  const { db } = useFrappe();

  useEffect(() => {
    fetchStockEntries();
  }, [accessToken]);

  async function fetchStockEntries(search = "", loadMore = false) {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoadingEntries(true);
        setPage(0);
      }

      const filters = search 
        ? [["name", "like", `%${search}%`]]
        : [];
      
      const result = await db.getDocList("Stock Entry", { 
        fields: ["name", "stock_entry_type", "purpose", "company", "posting_date", 
                 "posting_time", "set_posting_time", "docstatus"],
        filters: filters,
        orderBy: { field: "modified", order: "desc" },
        limit_start: loadMore ? (page + 1) * ITEMS_PER_PAGE : 0,
        limit: ITEMS_PER_PAGE
      });

      if (result.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      if (loadMore) {
        setStockEntries(prev => [...prev, ...result]);
        setPage(prev => prev + 1);
      } else {
        setStockEntries(result);
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
        setLoadingEntries(false);
      }
    }
  }

  const handleSearch = () => {
    fetchStockEntries(searchQuery);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchStockEntries(searchQuery, true);
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
    if (!hasMore && stockEntries.length > 0) {
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
        Stock Entries
      </Text>
      <Layout style={{ flexDirection: 'row', width: '100%', marginBottom: 20 }}>
        <Input
          value={searchQuery}
          onSubmitEditing={handleSearch}
          onChangeText={(nextValue) => {
            setSearchQuery(nextValue);
            if (!nextValue) {
              fetchStockEntries();
            }
          }}
          placeholder="Search stock entries..."
          style={{ flex: 1, marginRight: 10 }}
        />
        <Button onPress={() => navigation.navigate('StockEntryAdd')}>
          Add
        </Button>
      </Layout>

      {!loadingEntries ? (
        <Layout style={{ flex: 1 }}>
          <FlashList
            data={stockEntries}
            renderItem={({ item }) => (
              <StockEntryList 
                item={item} 
                onPress={(id) => navigation.navigate('StockEntryDetail', { stockEntryId: id })}
              />
            )}
            estimatedItemSize={100}
            onRefresh={() => fetchStockEntries(searchQuery)}
            refreshing={loadingEntries}
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
