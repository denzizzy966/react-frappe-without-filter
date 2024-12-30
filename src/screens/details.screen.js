import React, { useContext, useState } from "react";
import { SafeAreaView } from "react-native";
import styled from 'styled-components/native'
import { Layout, Text, Button } from "@ui-kitten/components";
import { AuthContext } from "../provider/auth";
import * as ImagePicker from 'expo-image-picker';
import { Image } from "expo-image"
import uploadFile from "../utils/fileUploader";
import { useFrappe } from "../provider/backend";
import { CircularProgressBar } from '@ui-kitten/components';

const LogoutButton = styled(Button)`
  border-radius: 6px;
`

const ProfileImage = styled(Image)`
  width: 120px; 
  height: 120px;
  border-radius: 9999px;
`

export const DetailsScreen = () => {
  const { isAuthenticated, logout, userInfo, accessToken, fetchUserInfo } = useContext(AuthContext);
  const { db } = useFrappe();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, padding: 20}}>
      <Layout
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
      <Text
        category="h5"
        style={{
          marginBottom: 20,
          alignSelf: 'flex-start'
        }}
      >
        Details
      </Text>
      <Layout
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        
        <Layout style={{ marginVertical: 20, position: "relative" }}>
          <ProfileImage source={{
            uri: userInfo.picture, headers: {
              Authorization: `Bearer ${accessToken}` // for handling private images
            }
          }} contentFit="cover" />

          {loading && <CircularProgressBar style={{ position: "absolute", top: 30, left: 30, backgroundColor: "white" }} progress={uploadProgress} />}
        </Layout>

        {errorMessage ? (
          <Text status="danger" style={{ marginBottom: 10 }}>{errorMessage}</Text>
        ) : null}

        <Button appearance="ghost" onPress={async () => {
          try {
            setErrorMessage('');
            // let the user pick image from gallery
            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled) {
              setLoading(true);
              setUploadProgress(0);
              
              const uploadResponse = await uploadFile(
                result.assets[0].uri,
                result.assets[0].uri.split('/').pop(),
                'image/jpeg',
                {
                  accessToken: accessToken,
                  onUploadProgress: (progressEvent) => {
                    const progress = (progressEvent.loaded / progressEvent.total) * 100;
                    setUploadProgress(progress);
                  },
                  onUploadComplete: async (data) => {
                    if (data?.message?.file_url) {
                      await db.updateDoc("User", userInfo.email, {
                        user_image: data.message.file_url
                      });
                      await fetchUserInfo();
                    }
                  },
                  isPrivate: false,
                  doctype: "User",
                  docname: userInfo.email,
                  fieldname: "user_image"
                }
              );

              console.log('Upload successful:', uploadResponse);
            }
          } catch (error) {
            console.error('Error during upload:', error);
            setErrorMessage(error.message || 'Failed to upload image. Please try again.');
          } finally {
            setLoading(false);
          }
        }}>Change Profile Pic</Button>

        <Layout style={{ marginVertical: 20 }}></Layout>

        <Text category="h4">{isAuthenticated ? userInfo.name : "Not Logged In"}</Text>
        {isAuthenticated && (
          <LogoutButton
            onPress={() => {
              logout();
            }}
          >
            Logout
          </LogoutButton>
        )}
      </Layout>
      </Layout>
    </SafeAreaView >
  );
};
