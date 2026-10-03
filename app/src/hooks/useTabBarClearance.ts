import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarClearance } from '@/constants/theme';

/**
 * Bottom padding a scroll container needs so its last row isn't hidden behind
 * the floating, absolutely-positioned tab bar. Deliberately NOT applied via
 * `SafeAreaView`'s `edges={['bottom']}` — that would double-pad the screen.
 */
export const useTabBarClearance = (): number => {
  const insets = useSafeAreaInsets();
  return getTabBarClearance(insets.bottom);
};
