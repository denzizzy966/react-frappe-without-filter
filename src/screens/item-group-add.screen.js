import { Layout, Input, Button, Spinner, Select, SelectItem, Toggle, Text } from "@ui-kitten/components";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { useFrappe } from "../provider/backend";

export const ItemGroupAddScreen = ({ navigation }) => {
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [itemGroupName, setItemGroupName] = useState("");
  const [parentItemGroup, setParentItemGroup] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parentGroups, setParentGroups] = useState([]);
  const { db } = useFrappe();

  useEffect(() => {
    fetchParentGroups();
  }, []);

  const fetchParentGroups = () => {
    db.getDocList("Item Group", {
      fields: ["name", "item_group_name"],
      filters: [["is_group", "=", 1]],
      orderBy: { field: "item_group_name", order: "asc" }
    })
      .then((res) => {
        setParentGroups(res);
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
      });
  };

  const handleAddItemGroup = () => {
    if (!itemGroupName.trim()) {
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Error',
        text2: 'Please enter item group name'
      });
      return;
    }

    setLoading(true);
    db.createDoc("Item Group", {
      item_group_name: itemGroupName,
      parent_item_group: parentItemGroup || "All Item Groups",
      is_group: isGroup ? 1 : 0
    })
      .then((res) => {
        Toast.show({
          type: 'success',
          position: 'top',
          text1: 'Success',
          text2: 'Item group added successfully'
        });
        navigation.goBack();
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
        setLoading(false);
      });
  };

  return (
    <Layout
      style={{
        flex: 1,
        padding: 20,
      }}
    >
      <Layout style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Button
          appearance="ghost"
          status="basic"
          onPress={() => navigation.goBack()}
          style={{ marginRight: 10 }}
        >
          Back
        </Button>
        <Text category="h5">Add Item Group</Text>
      </Layout>
      <Input
        value={itemGroupName}
        onChangeText={nextValue => setItemGroupName(nextValue)}
        placeholder="Enter item group name"
        style={{ marginBottom: 20 }}
      />

      <Select
        style={{ marginBottom: 20 }}
        placeholder="Select parent item group"
        value={parentGroups.find(group => group.name === parentItemGroup)?.item_group_name || ''}
        onSelect={index => setParentItemGroup(parentGroups[index.row].name)}
      >
        {parentGroups.map(group => (
          <SelectItem key={group.name} title={group.item_group_name} />
        ))}
      </Select>

      <Toggle
        style={{ marginBottom: 20 }}
        checked={isGroup}
        onChange={nextChecked => setIsGroup(nextChecked)}
      >
        Is Group
      </Toggle>

      <Button
        onPress={handleAddItemGroup}
        disabled={loading}
      >
        {loading ? <Spinner /> : 'Add Item Group'}
      </Button>
    </Layout>
  );
};
