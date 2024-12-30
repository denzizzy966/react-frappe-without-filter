import { Layout, Input, Button, Spinner, Text, Select, SelectItem } from "@ui-kitten/components";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { useFrappe } from "../provider/backend";
import * as ImagePicker from 'expo-image-picker';
import { Image, ScrollView } from 'react-native';
import uploadFile from "../utils/fileUploader";

export const ItemAddScreen = ({ navigation }) => {
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { db } = useFrappe();

  // Form fields
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [customBarcode, setCustomBarcode] = useState("");
  const [itemGroup, setItemGroup] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);

  // Item Groups for dropdown
  const [itemGroups, setItemGroups] = useState([]);

  useEffect(() => {
    fetchItemGroups();
  }, []);

  const fetchItemGroups = async () => {
    try {
      const groups = await db.getDocList("Item Group", {
        fields: ["name", "item_group_name"],
        orderBy: { field: "item_group_name", order: "asc" }
      });
      setItemGroups(groups);
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        position: 'top',
        text1: 'Error',
        text2: 'Failed to fetch item groups'
      });
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Error',
        text2: 'Failed to pick image'
      });
    }
  };

  const handleAddItem = async () => {
    if (!itemCode.trim() || !itemName.trim() || !itemGroup) {
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Error',
        text2: 'Please fill in all required fields'
      });
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = '';
      
      if (selectedImage) {
        const uploadResponse = await uploadFile(
          selectedImage.uri,
          selectedImage.uri.split('/').pop(),
          'image/jpeg',
          {
            accessToken: accessToken,
            onUploadProgress: (progressEvent) => {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              setUploadProgress(progress);
            },
            isPrivate: false,
            doctype: "Item",
            fieldname: "image"
          }
        );
        
        if (uploadResponse?.message?.file_url) {
          finalImageUrl = uploadResponse.message.file_url;
        }
      }

      await db.createDoc("Item", {
        item_code: itemCode,
        item_name: itemName,
        description: description,
        custom_barcode: customBarcode,
        item_group: itemGroup,
        image: finalImageUrl
      });

      Toast.show({
        type: 'success',
        position: 'top',
        text1: 'Success',
        text2: 'Item added successfully'
      });
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        position: 'top',
        text1: 'Error',
        text2: error.message || 'Failed to add item'
      });
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
          <Text category="h5">Add Item</Text>
        </Layout>

        <Input
          label="Item Code *"
          value={itemCode}
          onChangeText={setItemCode}
          placeholder="Enter item code"
          style={{ marginBottom: 15 }}
        />

        <Input
          label="Item Name *"
          value={itemName}
          onChangeText={setItemName}
          placeholder="Enter item name"
          style={{ marginBottom: 15 }}
        />

        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Enter description"
          multiline={true}
          textStyle={{ minHeight: 64 }}
          style={{ marginBottom: 15 }}
        />

        <Input
          label="Custom Barcode"
          value={customBarcode}
          onChangeText={setCustomBarcode}
          placeholder="Enter custom barcode"
          style={{ marginBottom: 15 }}
        />

        <Select
          label="Item Group *"
          value={itemGroups.find(g => g.name === itemGroup)?.item_group_name || ''}
          onSelect={index => setItemGroup(itemGroups[index.row].name)}
          placeholder="Select item group"
          style={{ marginBottom: 15 }}
        >
          {itemGroups.map(group => (
            <SelectItem key={group.name} title={group.item_group_name} />
          ))}
        </Select>

        <Button
          appearance="ghost"
          onPress={pickImage}
          style={{ marginBottom: 15 }}
        >
          {selectedImage ? 'Change Image' : 'Pick Image'}
        </Button>

        {selectedImage && (
          <Image
            source={{ uri: selectedImage.uri }}
            style={{ width: 100, height: 100, marginBottom: 15, alignSelf: 'center' }}
          />
        )}

        <Button
          onPress={handleAddItem}
          disabled={loading}
        >
          {loading ? <Spinner /> : 'Add Item'}
        </Button>
      </Layout>
    </ScrollView>
  );
};
