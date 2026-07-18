import { Ionicons } from "@expo/vector-icons";

declare global {
  interface AppTab {
    name: string;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
  }

  type TabIconProps = {
    focused: boolean;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
  };

}

export { };