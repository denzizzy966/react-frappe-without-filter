import { Layout, Input, Text, Button, Toggle, Select, SelectItem } from "@ui-kitten/components";
import { useContext, useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { useFrappe } from "../provider/backend";

export const WarehouseAddScreen = ({ navigation }) => {
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [warehouseName, setWarehouseName] = useState("");
  const [company, setCompany] = useState("");
  const [parentWarehouse, setParentWarehouse] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedCompanyIndex, setSelectedCompanyIndex] = useState(null);
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(null);
  const { db } = useFrappe();

  useEffect(() => {
    fetchCompanies();
    fetchWarehouses();
  }, []);

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

  const fetchWarehouses = async () => {
    try {
      const result = await db.getDocList("Warehouse", {
        fields: ["name", "warehouse_name"],
        filters: [["is_group", "=", 1]],
        orderBy: { field: "name", order: "asc" }
      });
      setWarehouses(result);
    } catch (e) {
      console.error("Error fetching warehouses:", e);
    }
  };

  const handleSubmit = async () => {
    if (!warehouseName.trim()) {
      Toast.show({
        type: "error",
        position: 'top',
        text1: 'Error',
        text2: 'Warehouse Name is required'
      });
      return;
    }

    if (!company) {
      Toast.show({
        type: "error",
        position: 'top',
        text1: 'Error',
        text2: 'Company is required'
      });
      return;
    }

    setLoading(true);
    try {
      await db.createDoc("Warehouse", {
        warehouse_name: warehouseName,
        company: company,
        parent_warehouse: parentWarehouse || null,
        is_group: isGroup,
        disabled: disabled
      });

      Toast.show({
        type: "success",
        position: 'top',
        text1: 'Success',
        text2: 'Warehouse created successfully'
      });
      navigation.goBack();
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
          <Text category="h5">Add Warehouse</Text>
        </Layout>

        <Input
          label="Warehouse Name *"
          value={warehouseName}
          onChangeText={nextValue => setWarehouseName(nextValue)}
          placeholder="Enter warehouse name"
          style={{ marginBottom: 15 }}
        />

        <Select
          label="Company *"
          selectedIndex={selectedCompanyIndex}
          onSelect={index => {
            setSelectedCompanyIndex(index);
            setCompany(companies[index.row].name);
          }}
          value={selectedCompanyIndex !== null ? companies[selectedCompanyIndex.row]?.name : ''}
          style={{ marginBottom: 15 }}
        >
          {companies.map((company, index) => (
            <SelectItem key={index} title={company.name} />
          ))}
        </Select>

        <Select
          label="Parent Warehouse"
          selectedIndex={selectedWarehouseIndex}
          onSelect={index => {
            setSelectedWarehouseIndex(index);
            setParentWarehouse(warehouses[index.row].name);
          }}
          value={selectedWarehouseIndex !== null ? `${warehouses[selectedWarehouseIndex.row]?.name} - ${warehouses[selectedWarehouseIndex.row]?.warehouse_name}` : ''}
          style={{ marginBottom: 15 }}
        >
          {warehouses.map((warehouse, index) => (
            <SelectItem key={index} title={`${warehouse.name}`} />
          ))}
        </Select>

        <Toggle
          checked={isGroup}
          onChange={setIsGroup}
          style={{ marginBottom: 15 }}
        >
          Is Group
        </Toggle>

        <Toggle
          checked={disabled}
          onChange={setDisabled}
          style={{ marginBottom: 15 }}
        >
          Disabled
        </Toggle>

        <Button onPress={handleSubmit} disabled={loading}>
          {loading ? 'Creating...' : 'Create Warehouse'}
        </Button>
      </Layout>
    </ScrollView>
  );
};
