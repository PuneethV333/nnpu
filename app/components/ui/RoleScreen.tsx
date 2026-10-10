import React, { Suspense } from "react";
import { View } from "react-native";
import { useAuth } from "@/src/hooks/useAuth";
import { CenteredLoader } from "./Feedback";
import type { Role } from "@/src/types/auth";

type RoleScreens = Partial<Record<Role, React.ComponentType>>;

/**
 * Renders the screen for the signed-in role, behind a loading state.
 *
 * Two bugs it exists to prevent, both of which surfaced as "the screen does
 * not open":
 *
 * 1. `React.lazy` needs a `<Suspense>` boundary above it. Every tab doing
 *    `const Teacher = lazy(() => import(...))` then rendering it directly had
 *    none, so the first tap suspended with nothing to catch it — the tab stayed
 *    blank or threw. It reads as intermittent because the module is cached
 *    after the first successful import: navigate away and back and it opens
 *    fine, so it looks like a flaky network rather than a missing boundary.
 *
 * 2. `role` is null until `GET /auth/me` resolves. A `switch (role)` with no
 *    default returned `undefined`, which renders as an empty screen for the
 *    first few hundred ms of every cold start. `isLoading` is what separates
 *    "we don't know yet" from "signed out".
 *
 * `fallback` lets a caller pass a skeleton closer to its own layout than a
 * centred spinner.
 */
export const RoleScreen = ({
  screens,
  fallback,
}: {
  screens: RoleScreens;
  fallback?: React.ReactNode;
}) => {
  const { role, isLoading } = useAuth();

  if (isLoading || !role) return <CenteredLoader />;

  const Screen = screens[role];

  // A role with no screen mapped is a routing gap, not a reason to render
  // nothing — an empty view is indistinguishable from a crash.
  if (!Screen) {
    return (
      <View className="flex-1 bg-gray-50">
        <CenteredLoader label="No screen is set up for this role yet." />
      </View>
    );
  }

  return <Suspense fallback={fallback ?? <CenteredLoader />}><Screen /></Suspense>;
};

export type { RoleScreens };