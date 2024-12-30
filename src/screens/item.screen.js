import { Layout, Text, Card, Input, Button, Spinner } from "@ui-kitten/components";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { FlashList } from "@shopify/flash-list";
import { useFrappe } from "../provider/backend";
import { Image, ActivityIndicator } from "react-native";
import { BASE_URI } from "../data/constants";

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/files/')) {
    return `${BASE_URI}${imagePath}`;
  }
  return imagePath;
};

const ItemList = ({ item, onPress }) => (
  <Card 
    style={{ marginBottom: 10, width: "100%" }}
    onPress={() => onPress(item.name)}
  >
    <Layout style={{ flexDirection: 'row', gap: 15 }}>
      {item.image && (
        <Image
          source={{ uri: getImageUrl(item.image) }}
          style={{ width: 80, height: 80, resizeMode: 'contain' }}
        />
      )}
      <Layout style={{ flex: 1, gap: 5 }}>
        <Text category="h6">{item.item_name}</Text>
        <Text category="s1">{item.item_code}</Text>
        <Layout style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Layout>
            <Text category="s2" appearance="hint">Group</Text>
            <Text category="p2">{item.item_group}</Text>
          </Layout>
          <Layout>
            <Text category="s2" appearance="hint">UOM</Text>
            <Text category="p2">{item.stock_uom}</Text>
          </Layout>
        </Layout>
      </Layout>
    </Layout>
  </Card>
);

export const ItemScreen = ({ navigation }) => {
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;
  const { db } = useFrappe();

  useEffect(() => {
    fetchItems();
  }, [accessToken]);

  async function fetchItems(search = "", loadMore = false) {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPage(0);
      }

      const filters = search 
        ? [["item_name", "like", `%${search}%`], ["item_code", "like", `%${search}%`]]
        : [];
      
      const result = await db.getDocList("Item", { 
        fields: ["name", "item_code", "item_name", "item_group", "stock_uom", "image"],
        filters: filters,
        orderBy: { field: "modified", order: "desc" },
        limit_start: loadMore ? (page + 1) * ITEMS_PER_PAGE : 0,
        limit: ITEMS_PER_PAGE
      });

      if (result.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      if (loadMore) {
        setItems(prev => [...prev, ...result]);
        setPage(prev => prev + 1);
      } else {
        setItems(result);
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
        setLoading(false);
      }
    }
  }

  const handleSearch = () => {
    fetchItems(searchQuery);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchItems(searchQuery, true);
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
    if (!hasMore && items.length > 0) {
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
        Items
      </Text>
      <Layout style={{ flexDirection: 'row', width: '100%', marginBottom: 20 }}>
        <Input
          value={searchQuery}
          onSubmitEditing={handleSearch}
          onChangeText={(nextValue) => {
            setSearchQuery(nextValue);
            if (!nextValue) {
              fetchItems();
            }
          }}
          placeholder="Search items..."
          style={{ flex: 1, marginRight: 10 }}
        />
        <Button onPress={() => navigation.navigate('ItemAdd')}>
          Add
        </Button>
      </Layout>

      {!loading ? (
        <Layout style={{ flex: 1 }}>
          <FlashList
            data={items}
            renderItem={({ item }) => (
              <ItemList 
                item={item} 
                onPress={(itemId) => navigation.navigate('ItemDetail', { itemId })}
              />
            )}
            estimatedItemSize={100}
            onRefresh={() => fetchItems(searchQuery)}
            refreshing={loading}
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
