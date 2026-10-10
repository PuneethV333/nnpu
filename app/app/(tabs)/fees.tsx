import React, { lazy } from "react";
import { View } from "react-native";
import { RoleScreen } from "@/components/ui/RoleScreen";
import { InvoiceCardSkeleton } from "@/components/ui/skeletons";

const Student = lazy(() => import("@/components/fees-page/main/Student"));
const Admin = lazy(() => import("@/components/fees-page/main/Admin"));

/** Matches the fees list: a couple of invoice cards. */
const Loading = () => (
  <View className="bg-gray-50" style={{ marginTop: 20 }}>
    <InvoiceCardSkeleton count={3} />
  </View>
);

const Fees = () => <RoleScreen screens={{ Student, Admin }} fallback={<Loading />} />;

export default Fees;