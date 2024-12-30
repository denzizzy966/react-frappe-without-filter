import { Layout, Text, Card, Spinner, Button, CheckBox, Divider } from "@ui-kitten/components";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { useFrappe } from "../provider/backend";
import { ScrollView } from "react-native";

const ItemList = ({ item, onItemPress }) => (
  <Card style={{ marginBottom: 10, width: '100%' }}>
    <Layout style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
      <Text category="s1">#{item.idx}</Text>
      <Button size="tiny" appearance="ghost">Edit</Button>
    </Layout>
    <Layout style={{ gap: 10 }}>
      <Layout style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Layout>
          <Text category="s2" appearance="hint">Target Warehouse</Text>
          <Text category="p2">{item.t_warehouse}</Text>
        </Layout>
        <Layout>
          <Text category="s2" appearance="hint">Target Rack</Text>
          <Text category="p2">{item.custom_target_rack || '-'}</Text>
        </Layout>
      </Layout>
      <Layout>
        <Text category="s2" appearance="hint">Item Code</Text>
        <Button
          appearance="ghost"
          status="info"
          onPress={() => onItemPress(item.item_code)}
        >
          {item.item_code}: {item.item_name}
        </Button>
      </Layout>
      <Layout>
        <Text category="s2" appearance="hint">Quantity</Text>
        <Text category="p2">{item.qty} {item.uom}</Text>
      </Layout>
    </Layout>
  </Card>
);

export const StockEntryDetailScreen = ({ route, navigation }) => {
  const { stockEntryId } = route.params;
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [stockEntry, setStockEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const { db } = useFrappe();

  useEffect(() => {
    fetchStockEntry();
  }, [stockEntryId]);

  const fetchStockEntry = async () => {
    try {
      const result = await db.getDoc("Stock Entry", stockEntryId);
      setStockEntry(result);
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

  if (loading) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner />
      </Layout>
    );
  }

  if (!stockEntry) {
    return (
      <Layout style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Stock Entry not found</Text>
      </Layout>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <Layout style={{ flex: 1, padding: 20 }}>
        <Layout style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Button
            appearance="ghost"
            status="basic"
            onPress={() => navigation.goBack()}
            style={{ marginRight: 10 }}
          >
            Back
          </Button>
          <Text category="h5">Stock Entry Details</Text>
        </Layout>

        <Card style={{ marginBottom: 20 }}>
          <Text category="h6" style={{ marginBottom: 15 }}>Details</Text>
          
          <Layout style={{ gap: 15 }}>
            <Layout>
              <Text category="s2" appearance="hint">Stock Entry Type</Text>
              <Text category="p1">{stockEntry.stock_entry_type}</Text>
            </Layout>

            <Layout>
              <Text category="s2" appearance="hint">Company</Text>
              <Text category="p1">{stockEntry.company}</Text>
            </Layout>

            <Layout style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Layout>
                <Text category="s2" appearance="hint">Posting Date</Text>
                <Text category="p1">{stockEntry.posting_date}</Text>
              </Layout>
              <Layout>
                <Text category="s2" appearance="hint">Posting Time</Text>
                <Text category="p1">{stockEntry.posting_time?.split('.')[0]}</Text>
              </Layout>
            </Layout>

            <Layout style={{ flexDirection: 'row', gap: 20 }}>
              <CheckBox
                checked={stockEntry.inspection_required}
                disabled
              >
                Inspection Required
              </CheckBox>
              <CheckBox
                checked={stockEntry.apply_putaway_rule}
                disabled
              >
                Apply Putaway Rule
              </CheckBox>
            </Layout>
          </Layout>
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <Text category="h6" style={{ marginBottom: 15 }}>Default Warehouse</Text>
          <Layout>
            <Text category="s2" appearance="hint">Default Target Warehouse</Text>
            <Text category="p1">{stockEntry.to_warehouse}</Text>
          </Layout>
        </Card>

        <Card>
          <Text category="h6" style={{ marginBottom: 15 }}>Items</Text>
          <Layout style={{ gap: 10 }}>
            {stockEntry.items.map((item, index) => (
              <ItemList 
                key={index} 
                item={item} 
                onItemPress={(itemCode) => navigation.navigate('ItemDetail', { itemId: itemCode })}
              />
            ))}
          </Layout>
        </Card>
      </Layout>
    </ScrollView>
  );
};
