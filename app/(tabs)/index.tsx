import {
  Dimensions,
  Image,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
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

export default function HomeScreen() {
  const { width: screenWidth } = useSafeAreaFrame();
  const [showScanner, setShowScanner] = useState(false);
  const [socketUrl, setSocketUrl] = useState(SOCKET_URL);
  const [photoResult, setPhotoResult] = useState({
    url: "",
    width: 0,
    height: 0,
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
  const hideModal = () => {
    setVisible(false);
    setPhotoResult({
      url: "",
      width: 0,
      height: 0,
    });
  };

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
      setSnackbarMessage(`连接到 ${socketUrl} 成功`);
      setSnackbarVisible(true);
    };

    ws.onmessage = (event) => {
      webSocketMsgHandle(event.data);
    };

    ws.onclose = () => {
      console.log("WebSocket is closed");
    };

    ws.onerror = (error) => {
      console.log("WebSocket error:", error);
      setSnackbarMessage(`连接到 ${socketUrl} 失败`);
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
          授权失效或者授权过期，请允许应用程序允许相机权限以扫描二维码
        </PaperText>

        <Button icon="camera" mode="contained" onPress={requestPermission}>
          重新获取相机授权
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
        setShowScanner(true);

        setTimeout(() => {
          cameraScannerRef.current?.takePhoto();
        }, 500);
        return;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cameraCloseEventCall = () => {
    setShowScanner(false);
    setVisible(true);
  };

  const cameraTakePhotoEventCall = async (result: {
    url: string;
    width: number;
    height: number;
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
        },
      };

      // 通过 WebSocket 发送消息
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      } else {
        console.error("WebSocket 连接未建立");
      }
    } catch (error) {
      console.error("发送图片失败:", error);
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
            <Image source={Images.HKCRCLogo} style={styles.reactLogo} />
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
                  <Text style={styles.modalTitle}>配置 Socket URL</Text>
                  <TextInput
                    value={tempSocketUrl}
                    onChangeText={setTempSocketUrl}
                    style={styles.input}
                  />
                  <View style={styles.buttonContainer}>
                    <Button mode="outlined" onPress={hideUrlModal}>
                      取消
                    </Button>
                    <Button mode="contained" onPress={handleUpdateSocketUrl}>
                      确认
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </Modal>
          </Portal>

          <View style={{ marginTop: 80 }}>
            {/* <Button
              icon="camera"
              mode="contained"
              onPress={() => setShowScanner(true)}
            >
              打开相机
            </Button> */}

            <HeartbeatAnimation />
            <Text
              style={{
                marginTop: 50,
                fontSize: 20,
                fontWeight: "bold",
                color: "#08244e",
              }}
            >
              等待命令下達...
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
              label: "关闭",
              onPress: () => setSnackbarVisible(false),
            }}
          >
            {snackbarMessage}
          </Snackbar>
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
    height: 80,
    width: 240,
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
