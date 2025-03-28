import { useEffect, useState } from "react";
import { View, Animated, StyleSheet } from "react-native";
// ... existing code ...

export default function HeartbeatAnimation() {
  const scaleAnim = useState(new Animated.Value(1))[0];
  const opacityAnim = useState(new Animated.Value(0.3))[0];

  const startBreathingAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  };

  useEffect(() => {
    startBreathingAnimation();
    return () => {
      // 清理动画
      scaleAnim.stopAnimation();
      opacityAnim.stopAnimation();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.circle,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
    </View>
  );
}

// 添加新的样式
const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  circle: {
    width: 150,
    height: 150,
    borderRadius: 200,
    backgroundColor: "#00409FFF",
  },
});

// ... existing code ...
