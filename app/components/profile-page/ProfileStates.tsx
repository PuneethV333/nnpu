import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState } from "@/components/ui/Feedback";
import { ProfileSkeleton } from "@/components/ui/skeletons";

/**
 * The two states that stand in for a role profile page before it can render.
 *
 * Shared rather than repeated in Student/Teacher/Admin so the three cannot drift
 * apart, which is the same reason the page skeleton itself is one component.
 *
 * `style`, not `className`, on the SafeAreaView: it comes from
 * react-native-safe-area-context rather than react-native, and NativeWind's
 * className mapping onto it is unreliable enough that a whole screen silently
 * lost its `flex-1` once already (see the note in MarkEntry.tsx).
 */
const ProfileFrame = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaView
    style={{ flex: 1, backgroundColor: "#F9FAFB" }}
    edges={["top"]}
  >
    {children}
  </SafeAreaView>
);

/** `/auth/me` is in flight. */
export const ProfileLoading = () => (
  <ProfileFrame>
    <ProfileSkeleton />
  </ProfileFrame>
);

/**
 * The profile has finished loading and there is no user to render.
 *
 * That is a different state from "still loading": AuthProvider sets the user and
 * clears `isLoading` in the same update, so on the success path this branch is
 * unreachable. It is reached when the session is gone — no stored token, or
 * `/auth/me` rejected and the session cleared, or a token revoked mid-session.
 *
 * Nothing guards the `(tabs)` group, so a session that dies while this tab is
 * open leaves the screen mounted with no user. All three pages used to answer
 * that with `null`: a blank screen with no explanation and nothing to press.
 * Retrying is worth offering because a transient network failure and a dead
 * session look identical from here, and only `/auth/me` can tell them apart.
 */
export const ProfileUnavailable = ({ onRetry }: { onRetry: () => void }) => (
  <ProfileFrame>
    <ErrorState
      title="Couldn't load your profile"
      subtitle="Your session may have expired. Try again, or sign in once more."
      onRetry={onRetry}
    />
  </ProfileFrame>
);
