import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useActivateUser,
  useDeactivateUser,
  useResetPassword,
  useTransferStudent,
} from '@/src/hooks/useUsers';
import type { Section } from '@/src/types/section';
import { errorMessage } from '@/src/libs/errorMessage';
import { BottomSheet, FieldLabel, PrimaryButton } from '@/components/ui/Primitives';
import SectionChips from '@/components/ui/SectionChips';

type Student = { id: string; name: string | null };

type Props = {
  student: Student;
  currentSection: Section;
  sections: Section[];
  /**
   * `undefined` when unknown. The roster endpoint returns only id + name, so
   * the account state is only known once an action has reported it back.
   */
  isActive: boolean | undefined;
  onStatusChange: (userId: string, isActive: boolean) => void;
  onClose: () => void;
};

const ActionRow = ({
  icon,
  label,
  hint,
  danger,
  loading,
  disabled,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  hint: string;
  danger?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || loading}
    className="flex-row items-center py-3.5 border-b border-gray-100"
    style={{ opacity: disabled ? 0.4 : 1 }}
  >
    <View
      className="w-9 h-9 rounded-full items-center justify-center"
      style={{ backgroundColor: danger ? '#FEF2F2' : '#F3F4F6' }}
    >
      <Feather name={icon} size={16} color={danger ? '#DC2626' : '#374151'} />
    </View>
    <View className="flex-1 ml-3">
      <Text
        className="text-[15px] font-medium"
        style={{ color: danger ? '#DC2626' : '#111827' }}
      >
        {loading ? 'Working…' : label}
      </Text>
      <Text className="text-xs text-gray-500 mt-0.5">{hint}</Text>
    </View>
    <Feather name="chevron-right" size={18} color="#9CA3AF" />
  </Pressable>
);

const StudentActionsSheet = ({
  student,
  currentSection,
  sections,
  isActive,
  onStatusChange,
  onClose,
}: Props) => {
  const displayName = student.name ?? student.id;
  const [mode, setMode] = useState<'menu' | 'transfer'>('menu');
  const [targetId, setTargetId] = useState('');

  const deactivate = useDeactivateUser();
  const activate = useActivateUser();
  const reset = useResetPassword();
  const transfer = useTransferStudent();

  const destinations = sections.filter((s) => s.id !== currentSection.id);
  const target = destinations.find((s) => s.id === targetId) ?? null;

  const fail = (title: string) => (err: unknown) => Alert.alert(title, errorMessage(err));

  const confirmDeactivate = () =>
    Alert.alert(
      `Deactivate ${displayName}?`,
      'They are signed out immediately and cannot log in until reactivated.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () =>
            deactivate.mutate(student.id, {
              onSuccess: (res) => {
                onStatusChange(res.userId, res.isActive);
                Alert.alert(
                  res.unchanged ? 'Nothing changed' : 'Deactivated',
                  res.unchanged
                    ? `${displayName} was already deactivated.`
                    : `${displayName} has been signed out and deactivated.`,
                );
              },
              onError: fail('Could not deactivate'),
            }),
        },
      ],
    );

  const runActivate = () =>
    activate.mutate(student.id, {
      onSuccess: (res) => {
        onStatusChange(res.userId, res.isActive);
        Alert.alert(
          res.unchanged ? 'Nothing changed' : 'Reactivated',
          res.unchanged
            ? `${displayName} was already active.`
            : `${displayName} can log in again.`,
        );
      },
      onError: fail('Could not reactivate'),
    });

  const confirmReset = () =>
    Alert.alert(
      `Reset ${displayName}'s password?`,
      'A temporary password is issued and emailed to them. Their current password stops working.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () =>
            reset.mutate(student.id, {
              onSuccess: (res) =>
                Alert.alert(
                  res.emailedTo ? 'Password reset' : 'Reset, but no email sent',
                  res.emailedTo
                    ? `Temporary credentials were emailed to ${res.emailedTo}.`
                    : `${displayName} (${res.authId}) has no email address on file, so nothing was sent. They will need the new password from you in person.`,
                ),
              onError: fail('Could not reset password'),
            }),
        },
      ],
    );

  const confirmTransfer = () => {
    if (!target) return;
    Alert.alert(
      `Move ${displayName}?`,
      `${currentSection.name} (${currentSection.academicYearLabel}) → ${target.name} (${target.academicYearLabel})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          onPress: () =>
            transfer.mutate(
              { studentId: student.id, body: { sectionId: target.id } },
              {
                onSuccess: () => {
                  onClose();
                  Alert.alert('Student moved', `${displayName} is now in ${target.name}.`);
                },
                onError: fail('Could not move student'),
              },
            ),
        },
      ],
    );
  };

  if (mode === 'transfer') {
    return (
      <BottomSheet
        title="Move to another section"
        subtitle={`${displayName} · currently ${currentSection.name}`}
        onClose={onClose}
      >
        {destinations.length === 0 ? (
          <Text className="text-sm text-gray-400">There is no other section to move to.</Text>
        ) : (
          <>
            <FieldLabel>Destination</FieldLabel>
            <SectionChips
              sections={destinations}
              selectedIds={targetId ? [targetId] : []}
              onToggle={setTargetId}
            />
          </>
        )}
        <View className="mt-5" style={{ gap: 10 }}>
          <PrimaryButton
            label={target ? `Move to ${target.name}` : 'Pick a section'}
            icon="corner-down-right"
            onPress={confirmTransfer}
            disabled={!target}
            loading={transfer.isPending}
          />
          <PrimaryButton label="Back" tone="neutral" onPress={() => setMode('menu')} />
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      title={displayName}
      subtitle={`${currentSection.name} · ${currentSection.academicYearLabel}${
        isActive === undefined ? '' : isActive ? ' · Active' : ' · Deactivated'
      }`}
      onClose={onClose}
    >
      <ActionRow
        icon="shuffle"
        label="Move to another section"
        hint="Transfer between sections."
        onPress={() => setMode('transfer')}
      />
      <ActionRow
        icon="key"
        label="Reset password"
        hint="Issue a temporary password by email."
        loading={reset.isPending}
        onPress={confirmReset}
      />
      {isActive !== false ? (
        <ActionRow
          icon="user-x"
          label="Deactivate account"
          hint="Blocks login and ends their sessions."
          danger
          loading={deactivate.isPending}
          onPress={confirmDeactivate}
        />
      ) : null}
      {isActive !== true ? (
        <ActionRow
          icon="user-check"
          label="Reactivate account"
          hint="Lets them log in again."
          loading={activate.isPending}
          onPress={runActivate}
        />
      ) : null}
    </BottomSheet>
  );
};

export default StudentActionsSheet;
