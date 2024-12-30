import { Layout, Input, Text, Card, Spinner, Button, Toggle, Select, SelectItem } from "@ui-kitten/components";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { FlashList } from "@shopify/flash-list";
import { useFrappe } from "../provider/backend";
import { ActivityIndicator } from "react-native";

const WarehouseList = ({ item }) => {
  return (
    <Card key={item.name} style={{ width: "100%", marginBottom: 10 }}>
      <Text category="h6" style={{ marginBottom: 5 }}>{item.warehouse_name}</Text>
      <Layout style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
        <Layout>
          <Text category="s2" appearance="hint">Name</Text>
          <Text category="p2">{item.name}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Status</Text>
          <Text category="p2">{item.disabled ? 'Disabled' : 'Enabled'}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Parent Warehouse</Text>
          <Text category="p2">{item.parent_warehouse || 'None'}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Is Group</Text>
          <Text category="p2">{item.is_group ? 'Yes' : 'No'}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Company</Text>
          <Text category="p2">{item.company}</Text>
        </Layout>
      </Layout>
    </Card>
  );
};

export const WarehouseScreen = ({ navigation }) => {
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [warehouses, setWarehouses] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showEnabled, setShowEnabled] = useState(true);
  const [showGroups, setShowGroups] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedParentWarehouse, setSelectedParentWarehouse] = useState("");
  const [companies, setCompanies] = useState([]);
  const [parentWarehouses, setParentWarehouses] = useState([]);
  const [selectedCompanyIndex, setSelectedCompanyIndex] = useState(null);
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(null);
  const ITEMS_PER_PAGE = 20;
  const { db } = useFrappe();

  useEffect(() => {
    fetchCompanies();
    fetchParentWarehouses();
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [accessToken, showEnabled, showGroups, selectedCompany, selectedParentWarehouse]);

  const fetchCompanies = async () => {
    try {
      const result = await db.getDocList("Company", {
        fields: ["name", "company_name"],
        orderBy: { field: "company_name", order: "asc" }
      });
      setCompanies(result);
    } catch (e) {
      console.error("Error fetching companies:", e);
    }
  };

  const fetchParentWarehouses = async () => {
    try {
      const result = await db.getDocList("Warehouse", {
        fields: ["name", "warehouse_name"],
        filters: [["is_group", "=", 1]],
        orderBy: { field: "warehouse_name", order: "asc" }
      });
      setParentWarehouses(result);
    } catch (e) {
      console.error("Error fetching parent warehouses:", e);
    }
  };

  async function fetchWarehouses(search = "", loadMore = false) {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoadingWarehouses(true);
        setPage(0);
      }

      const filters = [["disabled", "=", showEnabled ? 0 : 1]];
      
      if (showGroups !== null) {
        filters.push(["is_group", "=", showGroups ? 1 : 0]);
      }
      
      if (selectedCompany) {
        filters.push(["company", "=", selectedCompany]);
      }
      
      if (selectedParentWarehouse) {
        filters.push(["parent_warehouse", "=", selectedParentWarehouse]);
      }
      
      if (search) {
        filters.push(["warehouse_name", "like", `%${search}%`]);
      }
      
      const result = await db.getDocList("Warehouse", { 
        fields: ["name", "disabled", "warehouse_name", "is_group", "parent_warehouse", "company"],
        filters: filters,
        orderBy: { field: "warehouse_name", order: "asc" },
        limit_start: loadMore ? (page + 1) * ITEMS_PER_PAGE : 0,
        limit: ITEMS_PER_PAGE
      });

      if (result.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      if (loadMore) {
        setWarehouses(prev => [...prev, ...result]);
        setPage(prev => prev + 1);
      } else {
        setWarehouses(result);
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
        setLoadingWarehouses(false);
      }
    }
  }

  const handleSearch = () => {
    fetchWarehouses(searchQuery);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchWarehouses(searchQuery, true);
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
    if (!hasMore && warehouses.length > 0) {
      return (
        <Text style={{ textAlign: 'center', padding: 10 }} appearance="hint">
          No more items to load
        </Text>
      );
    }
    return null;
  };

  const clearFilters = () => {
    setShowEnabled(true);
    setShowGroups(null);
    setSelectedCompany("");
    setSelectedParentWarehouse("");
    setSelectedCompanyIndex(null);
    setSelectedWarehouseIndex(null);
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
        Warehouses
      </Text>

      <Layout style={{ flexDirection: 'row', width: '100%', marginBottom: 10 }}>
        <Input
          value={searchQuery}
          onSubmitEditing={handleSearch}
          onChangeText={(nextValue) => {
            setSearchQuery(nextValue);
            if (!nextValue) {
              fetchWarehouses();
            }
          }}
          placeholder="Search warehouses..."
          style={{ flex: 1, marginRight: 10 }}
        />
        <Button onPress={() => navigation.navigate('WarehouseAdd')}>
          Add
        </Button>
      </Layout>

      <Layout style={{ marginBottom: 20 }}>
        <Layout style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Toggle
            checked={showEnabled}
            onChange={setShowEnabled}
            style={{ marginRight: 10 }}
          >
            {showEnabled ? 'Showing Enabled' : 'Showing Disabled'}
          </Toggle>
          <Toggle
            checked={showGroups === true}
            onChange={(checked) => setShowGroups(checked ? true : checked === false ? false : null)}
            style={{ marginRight: 10 }}
          >
            {showGroups === true ? 'Groups Only' : showGroups === false ? 'Non-Groups Only' : 'All Types'}
          </Toggle>
        </Layout>

        <Layout style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <Select
            placeholder="Select Company"
            selectedIndex={selectedCompanyIndex}
            onSelect={index => {
              setSelectedCompanyIndex(index);
              setSelectedCompany(companies[index.row].name);
            }}
            value={selectedCompanyIndex !== null ? companies[selectedCompanyIndex.row]?.name : ''}
            style={{ flex: 1 }}
          >
            {companies.map((company, index) => (
              <SelectItem key={index} title={company.name} />
            ))}
          </Select>

          <Select
            placeholder="Select Parent Warehouse"
            selectedIndex={selectedWarehouseIndex}
            onSelect={index => {
              setSelectedWarehouseIndex(index);
              setSelectedParentWarehouse(parentWarehouses[index.row].name);
            }}
            value={selectedWarehouseIndex !== null ? parentWarehouses[selectedWarehouseIndex.row]?.warehouse_name : ''}
            style={{ flex: 1 }}
          >
            {parentWarehouses.map((warehouse, index) => (
              <SelectItem key={index} title={warehouse.warehouse_name} />
            ))}
          </Select>
        </Layout>

        <Button
          size="small"
          appearance="ghost"
          onPress={clearFilters}
          style={{ alignSelf: 'flex-start' }}
        >
          Clear Filters
        </Button>
      </Layout>

      {!loadingWarehouses ? (
        <Layout style={{ flex: 1 }}>
          <FlashList
            data={warehouses}
            renderItem={({ item }) => <WarehouseList item={item} />}
            estimatedItemSize={100}
            onRefresh={() => fetchWarehouses(searchQuery)}
            refreshing={loadingWarehouses}
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
