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
          const result = await cameraRef.current?.takePictureAsync();

          if (result?.uri) {
            onCallback({
              url: result?.uri,
              width: result?.width,
              height: result?.height,
            });
            setTimeout(() => {
              closeCamera();
            }, 100);
          }
        } else {
          Alert.alert("相机未ready");
        }
      } catch (error) {
        Alert.alert(JSON.stringify(error));
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
