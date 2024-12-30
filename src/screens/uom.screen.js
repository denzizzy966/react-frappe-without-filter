import { Layout, Input, Text, Card, Spinner, Button, Toggle } from "@ui-kitten/components";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { FlashList } from "@shopify/flash-list";
import { useFrappe } from "../provider/backend";
import { ActivityIndicator } from "react-native";

const UOMList = ({ item }) => {
  return (
    <Card key={item.name} style={{ width: "100%", marginBottom: 10 }}>
      <Text category="h6" style={{ marginBottom: 5 }}>{item.uom_name}</Text>
      <Layout style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Layout>
          <Text category="s2" appearance="hint">Name</Text>
          <Text category="p2">{item.name}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Status</Text>
          <Text category="p2">{item.enabled ? 'Enabled' : 'Disabled'}</Text>
        </Layout>
      </Layout>
    </Card>
  );
};

export const UOMScreen = ({ navigation }) => {
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [uoms, setUOMs] = useState([]);
  const [loadingUOMs, setLoadingUOMs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showEnabled, setShowEnabled] = useState(true);
  const ITEMS_PER_PAGE = 20;
  const { db } = useFrappe();

  useEffect(() => {
    fetchUOMs();
  }, [accessToken, showEnabled]);

  async function fetchUOMs(search = "", loadMore = false) {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoadingUOMs(true);
        setPage(0);
      }

      const filters = [["enabled", "=", showEnabled ? 1 : 0]];
      if (search) {
        filters.push(["uom_name", "like", `%${search}%`]);
      }
      
      const result = await db.getDocList("UOM", { 
        fields: ["name", "enabled", "uom_name"],
        filters: filters,
        orderBy: { field: "uom_name", order: "asc" },
        limit_start: loadMore ? (page + 1) * ITEMS_PER_PAGE : 0,
        limit: ITEMS_PER_PAGE
      });

      if (result.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      if (loadMore) {
        setUOMs(prev => [...prev, ...result]);
        setPage(prev => prev + 1);
      } else {
        setUOMs(result);
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
        setLoadingUOMs(false);
      }
    }
  }

  const handleSearch = () => {
    fetchUOMs(searchQuery);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchUOMs(searchQuery, true);
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
    if (!hasMore && uoms.length > 0) {
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
        Units of Measurement
      </Text>

      <Layout style={{ flexDirection: 'row', width: '100%', marginBottom: 10 }}>
        <Input
          value={searchQuery}
          onSubmitEditing={handleSearch}
          onChangeText={(nextValue) => {
            setSearchQuery(nextValue);
            if (!nextValue) {
              fetchUOMs();
            }
          }}
          placeholder="Search UOMs..."
          style={{ flex: 1, marginRight: 10 }}
        />
        <Button onPress={() => navigation.navigate('UOMAdd')}>
          Add
        </Button>
      </Layout>

      <Layout style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Toggle
          checked={showEnabled}
          onChange={setShowEnabled}
          style={{ marginRight: 10 }}
        >
          {showEnabled ? 'Showing Enabled' : 'Showing Disabled'}
        </Toggle>
      </Layout>

      {!loadingUOMs ? (
        <Layout style={{ flex: 1 }}>
          <FlashList
            data={uoms}
            renderItem={({ item }) => <UOMList item={item} />}
            estimatedItemSize={100}
            onRefresh={() => fetchUOMs(searchQuery)}
            refreshing={loadingUOMs}
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
