import { Layout, Input, Text, Button, Toggle } from "@ui-kitten/components";
import { useContext, useState } from "react";
import { ScrollView } from "react-native";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { useFrappe } from "../provider/backend";

export const UOMAddScreen = ({ navigation }) => {
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [uomName, setUOMName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const { db } = useFrappe();

  const handleSubmit = async () => {
    if (!uomName.trim()) {
      Toast.show({
        type: "error",
        position: 'top',
        text1: 'Error',
        text2: 'UOM Name is required'
      });
      return;
    }

    setLoading(true);
    try {
      await db.createDoc("UOM", {
        uom_name: uomName,
        enabled: enabled
      });

      Toast.show({
        type: "success",
        position: 'top',
        text1: 'Success',
        text2: 'UOM created successfully'
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
          <Text category="h5">Add UOM</Text>
        </Layout>

        <Input
          label="UOM Name *"
          value={uomName}
          onChangeText={nextValue => setUOMName(nextValue)}
          placeholder="Enter UOM name"
          style={{ marginBottom: 15 }}
        />

        <Toggle
          checked={enabled}
          onChange={setEnabled}
          style={{ marginBottom: 15 }}
        >
          Enabled
        </Toggle>

        <Button onPress={handleSubmit} disabled={loading}>
          {loading ? 'Creating...' : 'Create UOM'}
        </Button>
      </Layout>
    </ScrollView>
  );
};
