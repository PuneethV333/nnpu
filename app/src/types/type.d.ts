import { Ionicons } from "@expo/vector-icons";
import { Role } from "./auth";

declare global {
  
  interface AppTab {
    name: string;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    roles:Role[]
  }

  type TabIconProps = {
    focused: boolean;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
  };

}

export { };