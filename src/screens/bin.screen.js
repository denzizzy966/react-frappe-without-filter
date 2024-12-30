import { Layout, Input, Text, Card, Spinner } from "@ui-kitten/components";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { FlashList } from "@shopify/flash-list";
import { useFrappe } from "../provider/backend";

const BinList = ({ item }) => {
  return (
    <Card key={item.name} style={{ width: "100%", marginBottom: 10 }}>
      <Text category="h6" style={{ marginBottom: 5 }}>{item.item_code}</Text>
      <Layout style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
        <Layout>
          <Text category="s2" appearance="hint">Warehouse</Text>
          <Text category="p2">{item.warehouse}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Quantity</Text>
          <Text category="p2">{item.actual_qty} {item.stock_uom}</Text>
        </Layout>
      </Layout>
    </Card>
  );
};

export const BinScreen = ({ navigation }) => {
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [bins, setBins] = useState([]);
  const [loadingBins, setLoadingBins] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { db } = useFrappe();

  useEffect(() => {
    fetchBins();
  }, [accessToken]);

  function fetchBins(search = "") {
    setLoadingBins(true);
    const filters = search 
      ? [["item_code", "like", `%${search}%`]]
      : [];
    
    db.getDocList("Bin", { 
      fields: ["name", "item_code", "warehouse", "actual_qty", "stock_uom"],
      filters: filters,
      orderBy: { field: "item_code", order: "asc" } 
    })
      .then((res) => {
        setBins(res);
      })
      .catch(async (e) => {
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
      })
      .finally(() => {
        setLoadingBins(false);
      });
  }

  const handleSearch = () => {
    fetchBins(searchQuery);
  };

  return (
    <Layout
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
      }}
    >
      <Layout style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Text category="h5">Current Stock</Text>
      </Layout>

      <Layout style={{ flexDirection: 'row', width: '100%', marginBottom: 20 }}>
        <Input
          value={searchQuery}
          onSubmitEditing={handleSearch}
          onChangeText={(nextValue) => {
            setSearchQuery(nextValue);
            if (!nextValue) {
              fetchBins();
            }
          }}
          placeholder="Search by item code..."
          style={{ flex: 1 }}
        />
      </Layout>

      {!loadingBins &&
        <Layout style={{ flex: 1 }}>
          <FlashList
            data={bins}
            renderItem={BinList}
            estimatedItemSize={100}
            onRefresh={() => fetchBins(searchQuery)}
            refreshing={loadingBins}
          />
        </Layout>
      }

      {loadingBins && (
        <Layout style={{ marginTop: 50 }}>
          <Spinner />
        </Layout>
      )}
    </Layout>
  );
};
