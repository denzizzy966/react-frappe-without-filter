import { Layout, Input, Text, Card, Spinner, Button } from "@ui-kitten/components";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { FlashList } from "@shopify/flash-list";
import { useFrappe } from "../provider/backend";
import { ActivityIndicator } from "react-native";

const ItemGroupList = ({ item }) => {
  return (
    <Card key={item.name} style={{ width: "100%", marginBottom: 10 }}>
      <Text category="h6" style={{ marginBottom: 5 }}>{item.item_group_name}</Text>
      <Layout style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Layout>
          <Text category="s2" appearance="hint">Name</Text>
          <Text category="p2">{item.name}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Parent Group</Text>
          <Text category="p2">{item.parent_item_group || 'None'}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Is Group</Text>
          <Text category="p2">{item.is_group ? 'Yes' : 'No'}</Text>
        </Layout>
      </Layout>
    </Card>
  );
};

export const ItemGroupScreen = ({ navigation }) => {
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [itemGroups, setItemGroups] = useState([]);
  const [loadingItemGroups, setLoadingItemGroups] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;
  const { db } = useFrappe();

  useEffect(() => {
    fetchItemGroups();
  }, [accessToken]);

  async function fetchItemGroups(search = "", loadMore = false) {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoadingItemGroups(true);
        setPage(0);
      }

      const filters = search 
        ? [["item_group_name", "like", `%${search}%`]]
        : [];
      
      const result = await db.getDocList("Item Group", { 
        fields: ["name", "item_group_name", "parent_item_group", "is_group"],
        filters: filters,
        orderBy: { field: "item_group_name", order: "asc" },
        limit_start: loadMore ? (page + 1) * ITEMS_PER_PAGE : 0,
        limit: ITEMS_PER_PAGE
      });

      if (result.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      if (loadMore) {
        setItemGroups(prev => [...prev, ...result]);
        setPage(prev => prev + 1);
      } else {
        setItemGroups(result);
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
        setLoadingItemGroups(false);
      }
    }
  }

  const handleSearch = () => {
    fetchItemGroups(searchQuery);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchItemGroups(searchQuery, true);
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
    if (!hasMore && itemGroups.length > 0) {
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
        Item Groups
      </Text>
      <Layout style={{ flexDirection: 'row', width: '100%', marginBottom: 20 }}>
        <Input
          value={searchQuery}
          onSubmitEditing={handleSearch}
          onChangeText={(nextValue) => {
            setSearchQuery(nextValue);
            if (!nextValue) {
              fetchItemGroups();
            }
          }}
          placeholder="Search item groups..."
          style={{ flex: 1, marginRight: 10 }}
        />
        <Button onPress={() => navigation.navigate('ItemGroupAdd')}>
          Add
        </Button>
      </Layout>

      {!loadingItemGroups ? (
        <Layout style={{ flex: 1 }}>
          <FlashList
            data={itemGroups}
            renderItem={({ item }) => <ItemGroupList item={item} />}
            estimatedItemSize={100}
            onRefresh={() => fetchItemGroups(searchQuery)}
            refreshing={loadingItemGroups}
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
