// import { useToastAction } from "@/hooks/useToast";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  Button as ButtonNative,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text } from "react-native-paper";
import { Images } from "@/constants/Image";
import { Image } from "react-native";

interface CameraScannerProps {
  onClose: () => void;
  onCallback: ({
    url,
    width,
    height,
  }: {
    url: string;
    width: number;
    height: number;
  }) => void;
}

// Add this interface for the ref
export interface CameraScannerRef {
  takePhoto: () => Promise<void>;
}

// Modify the component definition to use forwardRef
export default forwardRef<CameraScannerRef, CameraScannerProps>(
  function CameraScanner({ onClose, onCallback }, ref) {
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const { top } = useSafeAreaInsets();
    //   const { showToast } = useToastAction();
    const { width } = useWindowDimensions();
    const cameraRef = useRef<CameraView>(null);
    const screenHeight = Dimensions.get("screen").height;

    useEffect(() => {
      if (permission?.granted) {
        setIsCameraOn(true);
      } else {
      }
    }, [permission]);

    const takePhoto = async () => {
      try {
        if (isCameraReady) {
          // 相机已经准备好，直接拍照
          await takePictureAndProcess();
        } else {
          // 相机未准备好，开始等待策略
          Alert.alert("正在等待相机准备...");

          let waitTime = 0;
          const interval = 500; // 每0.5秒检查一次
          const maxWaitTime = 5000; // 最多等待5秒

          const waitForCamera = new Promise<boolean>((resolve) => {
            const checkInterval = setInterval(() => {
              waitTime += interval;

              if (isCameraReady) {
                // 相机准备好了
                clearInterval(checkInterval);
                resolve(true);
              } else if (waitTime >= maxWaitTime) {
                // 超过最大等待时间
                clearInterval(checkInterval);
                resolve(false);
              }
            }, interval);
          });

          const isReady = await waitForCamera;

          if (isReady) {
            // 相机准备好了，可以拍照
            await takePictureAndProcess();
          } else {
            // 等待超时，显示错误并关闭
            Alert.alert("相机准备超时", "相机在5秒内未能准备就绪");
            closeCamera();
          }
        }
      } catch (error) {
        Alert.alert("拍照出错", JSON.stringify(error));
        closeCamera();
      }
    };

    // 将拍照逻辑抽取为独立函数，便于复用
    const takePictureAndProcess = async () => {
      const result = await cameraRef.current?.takePictureAsync();

      if (result?.uri) {
        onCallback({
          url: result.uri,
          width: result.width,
          height: result.height,
        });
        setTimeout(() => {
          closeCamera();
        }, 100);
      }
    };

    const closeCamera = () => {
      setIsCameraOn(false);
      setTimeout(() => {
        onClose();
      }, 50);
    };

    // Add useImperativeHandle hook
    useImperativeHandle(ref, () => ({
      takePhoto,
    }));

    if (!permission?.granted) {
      return (
        <View style={styles.container}>
          <Text
            variant="titleMedium"
            style={{
              textAlign: "center",
              marginHorizontal: 50,
              marginTop: 50,
              marginBottom: 30,
            }}
          >
            授权失效或者授权过期，请允许应用程序允许相机权限以扫描二维码
          </Text>

          <Button icon="camera" mode="contained" onPress={requestPermission}>
            重新获取相机授权
          </Button>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {isCameraOn ? (
          <View style={styles.cameraContainer}>
            <TouchableOpacity
              style={[styles.closeBtn, { top: top + 5 }]}
              onPress={closeCamera}
            >
              <Image
                source={Images.CloseIcon}
                style={{ width: 30, height: 30 }}
              />
            </TouchableOpacity>

            <CameraView
              ref={cameraRef}
              onCameraReady={() => {
                setIsCameraReady(true);
              }}
              animateShutter={true}
              autofocus="on"
              style={[
                styles.scancontent,
                { width: width, height: screenHeight },
              ]}
            />
          </View>
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  cameraContainer: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  scancontent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  closeBtn: {
    position: "absolute",
    left: 25,
    zIndex: 20,
    backgroundColor: "white",
    borderRadius: 100,
    padding: 5,
  },
  boxContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  photoStatuContainer: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  photoBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 100,
  },
});
