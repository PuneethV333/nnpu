import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useGetAllSections } from '@/src/hooks/useSections';
import { useGetStudents } from '@/src/hooks/useStudents';
import { useGetStudentInvoices } from '@/src/hooks/useFees';
import { useGetAdminDashboard } from '@/src/hooks/useDashboard';
import { formatDate, formatMoney } from '@/src/libs/money';
import { SectionPicker } from '@/components/attendance-page/SectionPicker';
import { StatCard } from '@/components/profile-page/StatCard';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import {
  SkeletonStatRow,
  SkeletonList,
  ChipRowSkeleton,
  MetricCardSkeleton,
} from '@/components/ui/skeletons';
import { useTabBarClearance } from '@/src/hooks/useTabBarClearance';

const InvoiceRow = ({
  invoice,
}: {
  invoice: {
    id: string;
    status: 'Pending' | 'Partial' | 'Paid';
    dueDate: Date;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    description: string | null;
  };
}) => {
  const tone =
    invoice.status === 'Paid'
      ? { bg: '#DCFCE7', text: '#16A34A' }
      : invoice.status === 'Partial'
        ? { bg: '#FEF3C7', text: '#D97706' }
        : { bg: '#FEE2E2', text: '#DC2626' };

  return (
    <View className="px-4 py-3 border-b border-gray-100 last:border-b-0">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-semibold text-gray-900 flex-1 mr-2" numberOfLines={1}>
          {invoice.description ?? 'Fee Invoice'}
        </Text>
        <View style={{ backgroundColor: tone.bg }} className="rounded-full px-2.5 py-1">
          <Text style={{ color: tone.text }} className="text-[11px] font-bold">
            {invoice.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text className="text-xs text-gray-400 mt-1">
        Due {formatDate(invoice.dueDate)}
      </Text>

      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-sm text-gray-500">
          Paid {formatMoney(invoice.paidAmount)} of {formatMoney(invoice.totalAmount)}
        </Text>
        <Text
          className="text-sm font-bold"
          style={{ color: invoice.balanceAmount > 0 ? '#DC2626' : '#16A34A' }}
        >
          {formatMoney(invoice.balanceAmount)}
        </Text>
      </View>
    </View>
  );
};

const FeesPage = () => {
  const tabBarClearance = useTabBarClearance();
  const {
    data: sections,
    isLoading: sectionsLoading,
    isError: sectionsError,
    refetch: refetchSections,
  } = useGetAllSections();
  const { data: dashboard } = useGetAdminDashboard();

  const [sectionId, setSectionId] = useState('');
  const [studentId, setStudentId] = useState('');

  const { data: students, isLoading: studentsLoading } = useGetStudents(sectionId);
  const { data: invoices, isLoading: invoicesLoading } = useGetStudentInvoices(
    studentId,
  );

  const selectedStudent = useMemo(
    () => students?.find((s) => s.id === studentId) ?? null,
    [students, studentId],
  );

  const onSelectSection = (id: string) => {
    setSectionId(id);
    setStudentId('');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
      >
        <Text className="text-2xl font-bold text-gray-900 px-4 pt-4 pb-3">
          Fees
        </Text>

        <View className="flex-row mx-3 mb-3">
          <StatCard label="Pending Invoices" value={dashboard?.fees.pendingInvoices ?? 0} />
          <StatCard label="Sections" value={sections?.length ?? 0} />
        </View>

        <View className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 p-4">
          <Text className="text-xs font-semibold text-gray-400 tracking-wide">
            TOTAL OUTSTANDING
          </Text>
          <Text className="text-3xl font-extrabold text-gray-900 mt-1">
            {formatMoney(dashboard?.fees.amountPending ?? 0)}
          </Text>
          <Text className="text-xs text-gray-400 mt-1">
            Across all unpaid invoices in the school
          </Text>
        </View>

        <Text className="text-base font-semibold text-gray-900 px-4 mb-2">
          Student Invoices
        </Text>

        {sectionsLoading ? (
          <>
            <View style={{ marginTop: 12 }}>
              <SkeletonStatRow />
            </View>
            <MetricCardSkeleton />
            <View style={{ marginTop: 20 }}>
              <ChipRowSkeleton />
            </View>
          </>
        ) : sectionsError ? (
          <ErrorState
            title="Couldn't load sections"
            subtitle="Check your connection and try again."
            onRetry={() => refetchSections()}
          />
        ) : !sections || sections.length === 0 ? (
          <EmptyState
            icon="grid"
            title="No sections yet"
            subtitle="Sections appear once the school creates them."
          />
        ) : (
          <>
            <SectionPicker
              sections={sections}
              selectedId={sectionId}
              onSelect={onSelectSection}
            />

            {!sectionId ? (
              <EmptyState
                icon="users"
                title="Pick a section"
                subtitle="Choose a section to see its students."
              />
            ) : studentsLoading ? (
              <View style={{ marginTop: 20 }}>
                <ChipRowSkeleton count={5} />
              </View>
            ) : !students || students.length === 0 ? (
              <EmptyState
                icon="user-x"
                title="No students in this section"
                subtitle="Nobody has been enrolled here yet."
              />
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    gap: 8,
                    paddingVertical: 12,
                  }}
                >
                  {students.map((s) => (
                    <StudentChip
                      key={s.id}
                      label={s.name ?? s.id}
                      selected={studentId === s.id}
                      onPress={() => setStudentId(s.id)}
                    />
                  ))}
                </ScrollView>

                <View className="mx-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {!studentId ? (
                    <View className="items-center px-8 py-12">
                      <Feather name="user" size={24} color="#D1D5DB" />
                      <Text className="text-sm text-gray-400 mt-3 text-center">
                        Pick a student to see their invoices.
                      </Text>
                    </View>
                  ) : invoicesLoading ? (
                    <View style={{ padding: 16 }}>
                      <SkeletonList count={3} />
                    </View>
                  ) : !invoices || invoices.length === 0 ? (
                    <View className="items-center px-8 py-12">
                      <Text className="text-sm text-gray-400 mt-3 text-center">
                        {selectedStudent?.name ?? 'This student'} has no invoices
                        yet.
                      </Text>
                    </View>
                  ) : (
                    invoices.map((inv) => (
                      <InvoiceRow key={inv.id} invoice={inv} />
                    ))
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const StudentChip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className="px-3 py-2 rounded-full border"
    style={{
      backgroundColor: selected ? '#2563EB' : '#FFFFFF',
      borderColor: selected ? '#2563EB' : '#E5E7EB',
    }}
  >
    <Text
      className="text-sm font-medium"
      style={{ color: selected ? '#FFFFFF' : '#374151' }}
    >
      {label}
    </Text>
  </Pressable>
);

export default FeesPage;
