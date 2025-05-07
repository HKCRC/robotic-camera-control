import {
  Dimensions,
  Image,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";

import { Images } from "@/constants/Image";
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Button, Card, Modal, Portal, Snackbar } from "react-native-paper";
import { useEffect, useRef, useState } from "react";
import CameraScanner, { CameraScannerRef } from "@/components/ScanCamera";
import HeartbeatAnimation from "@/components/HeartbeatAnimation";
import { SOCKET_URL } from "@/constants";
import { EVENT_CODE, WebsocketResponseType } from "@/types";
import { useCameraPermissions } from "expo-camera";
import { Text as PaperText } from "react-native-paper";
import * as MediaLibrary from "expo-media-library";
import WebSocket from "isomorphic-ws";

export default function HomeScreen() {
  const { width: screenWidth } = useSafeAreaFrame();
  const [showScanner, setShowScanner] = useState(false);
  const [socketUrl, setSocketUrl] = useState(SOCKET_URL);
  const [photoResult, setPhotoResult] = useState({
    url: "",
    width: 0,
    height: 0,
    resultUri: "",
    ip: "",
  });

  const [ws, setWs] = useState<WebSocket | null>(null);
  const cameraScannerRef = useRef<CameraScannerRef>(null);
  const { top, bottom } = useSafeAreaInsets();
  const screenHeight = Dimensions.get("screen").height - (top + bottom);
  const [visible, setVisible] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [tempSocketUrl, setTempSocketUrl] = useState(socketUrl);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const [countdown, setCountdown] = useState(0);
  const hideModal = () => {
    setVisible(false);
    setPhotoResult({
      url: "",
      width: 0,
      height: 0,
      resultUri: "",
      ip: "",
    });
  };

  const [mediaLibraryPermission, requestMediaLibraryPermission] =
    MediaLibrary.usePermissions(); // 添加相册权限

  const hideUrlModal = () => {
    setShowUrlModal(false);
    setTempSocketUrl(socketUrl); // Reset to current socket URL
  };

  const handleUpdateSocketUrl = () => {
    setSocketUrl(tempSocketUrl);
    setShowUrlModal(false);
  };

  const calculateImageDimensions = () => {
    if (!photoResult.width || !photoResult.height) {
      return { width: 300, height: 200 };
    }

    const targetWidth = screenWidth * 0.8;
    const aspectRatio = photoResult.height / photoResult.width;
    const calculatedHeight = targetWidth * aspectRatio;

    return {
      width: targetWidth,
      height: calculatedHeight,
    };
  };

  useEffect(() => {
    const ws = new WebSocket(socketUrl);
    ws.binaryType = "blob";
    setWs(ws);

    ws.onopen = () => {
      console.log("WebSocket is open");
      setSnackbarMessage(`Connect to ${socketUrl} success`);
      setSnackbarVisible(true);
    };

    ws.onmessage = (event: WebSocket.MessageEvent) => {
      webSocketMsgHandle(event.data);
    };

    ws.onclose = () => {
      console.log("WebSocket is closed");
      setSnackbarMessage(`Connect to ${socketUrl} closed`);
      setSnackbarVisible(true);
    };

    ws.onerror = (error: WebSocket.ErrorEvent) => {
      console.log("WebSocket error:", error);
      setSnackbarMessage(`Connect to ${socketUrl} error`);
      setSnackbarVisible(true);
    };

    return () => {
      ws.close();
    };
  }, [socketUrl]);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <PaperText
          variant="titleMedium"
          style={{
            textAlign: "center",
            marginHorizontal: 50,
            marginTop: 50,
            marginBottom: 30,
          }}
        >
          The camera permission has expired or is invalid. Please allow the
          application to use the camera permission to scan the QR code
        </PaperText>

        <Button icon="camera" mode="contained" onPress={requestPermission}>
          Re-request camera permission
        </Button>
      </View>
    );
  }

  if (!mediaLibraryPermission?.granted) {
    return (
      <View style={styles.container}>
        <PaperText
          variant="titleMedium"
          style={{
            textAlign: "center",
            marginHorizontal: 50,
            marginTop: 50,
            marginBottom: 30,
          }}
        >
          The media library permission has expired or is invalid. Please allow
          the
        </PaperText>

        <Button
          icon="folder-image"
          mode="contained"
          onPress={requestMediaLibraryPermission}
        >
          Request media library permission
        </Button>
      </View>
    );
  }

  const webSocketMsgHandle = async (response: string) => {
    try {
      const data: WebsocketResponseType = JSON.parse(response);
      if (data.type === EVENT_CODE.OPEN_CAMERA) {
        setShowScanner(true);
        return;
      }

      if (data.type === EVENT_CODE.TAKE_PHOTO) {
        toTakePhotoAction();
        return;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toTakePhotoAction = async () => {
    let count = 5;
    setCountdown(count);

    while (count > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      count--;
      if (count <= 1) {
        setShowScanner(true);
      }
      setCountdown(count);
    }
    setTimeout(() => {
      cameraScannerRef.current?.takePhoto();
    }, 20);
  };

  const cameraCloseEventCall = () => {
    setShowScanner(false);
    setVisible(true);
  };

  const cameraTakePhotoEventCall = async (result: {
    url: string;
    width: number;
    height: number;
    resultUri: string;
    ip: string;
  }) => {
    setPhotoResult(result);

    try {
      // 获取图片的 blob 数据
      const response = await fetch(result.url);
      const blob = await response.blob();

      // 创建包含图片数据的消息对象
      const message = {
        type: EVENT_CODE.RECEIVE_PHOTO,
        message: {
          width: result.width,
          height: result.height,
          image: await blobToBase64(blob),
          resultUri: result.resultUri,
          ip: result.ip,
        },
      };

      // 通过 WebSocket 发送消息
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.error(message);
        ws.send(JSON.stringify(message));
      } else {
        console.error("WebSocket connection not established");
      }
    } catch (error) {
      console.error("Failed to send image:", error);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        resolve(`data:image/jpeg;base64,${base64}`);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  };

  return (
    <View>
      {showScanner ? (
        <CameraScanner
          onCallback={cameraTakePhotoEventCall}
          onClose={cameraCloseEventCall}
          ref={cameraScannerRef}
        />
      ) : (
        <View
          style={[styles.areaContainer, { height: screenHeight - top * 3 }]}
        >
          <TouchableOpacity
            onLongPress={() => setShowUrlModal(true)}
            delayLongPress={500}
          >
            <Image source={Images.photo} style={styles.reactLogo} />
          </TouchableOpacity>

          {/* Add URL Configuration Modal */}
          <Portal>
            <Modal
              visible={showUrlModal}
              onDismiss={hideUrlModal}
              contentContainerStyle={styles.modalContainer}
            >
              <Card>
                <Card.Content>
                  <Text style={styles.modalTitle}>Configure Socket URL</Text>
                  <TextInput
                    value={tempSocketUrl}
                    onChangeText={(text) => setTempSocketUrl(text)}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    textContentType="URL"
                  />
                  <View style={styles.buttonContainer}>
                    <Button mode="outlined" onPress={hideUrlModal}>
                      Cancel
                    </Button>
                    <Button mode="contained" onPress={handleUpdateSocketUrl}>
                      Confirm
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </Modal>
          </Portal>

          <View style={{ marginTop: 80 }}>
            <View className="relative">
              <HeartbeatAnimation />
              {countdown > 0 ? (
                <Text
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    fontSize: 40,
                    fontWeight: "bold",
                    color: "white",
                    transform: [
                      { translateX: screenWidth / 3.4 },
                      { translateY: 50 },
                    ],
                  }}
                >
                  {countdown}
                </Text>
              ) : null}
            </View>
            <Text
              style={{
                marginTop: 50,
                fontSize: 20,
                fontWeight: "bold",
                color: "#08244e",
              }}
            >
              Waiting for command...
            </Text>

            {photoResult?.url ? (
              <Portal>
                <Modal
                  visible={visible}
                  onDismiss={hideModal}
                  contentContainerStyle={{ marginHorizontal: 50 }}
                >
                  <View
                    style={{
                      position: "relative",
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Card style={{ position: "relative" }}>
                      <Card.Cover
                        style={calculateImageDimensions()}
                        source={{ uri: photoResult.url }}
                      />
                    </Card>

                    <TouchableOpacity
                      style={[styles.closeBtn]}
                      onPress={() => {
                        setVisible(false);
                      }}
                    >
                      <Image
                        source={Images.CloseIcon}
                        style={{ width: 30, height: 30 }}
                      />
                    </TouchableOpacity>
                  </View>
                </Modal>
              </Portal>
            ) : null}
          </View>

          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={3000}
            action={{
              label: "Close",
              onPress: () => setSnackbarVisible(false),
            }}
          >
            {snackbarMessage}
          </Snackbar>

          {/* <Button
            mode="contained"
            onPress={() => {
              toTakePhotoAction();
            }}
          >
            Open camera
          </Button> */}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 120,
    width: 120,
  },
  closeBtn: {
    position: "absolute",
    bottom: -60,
    // width: 20,
    // height: 20,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 100,
    padding: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {},
  areaContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    marginHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 16,
    fontWeight: "bold",
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
