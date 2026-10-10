import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useGetAllSections } from '@/src/hooks/useSections';
import { usePassOutStudents } from '@/src/hooks/useUsers';
import type { PassOutResponse } from '@/src/types/users';
import { errorMessage } from '@/src/libs/errorMessage';
import { Banner, Card, Field, PrimaryButton } from '@/components/ui/Primitives';
import SectionPickerGroups from './SectionPickerGroups';

const CONFIRM_WORD = 'PASS OUT';

const PassOutResult = ({ result }: { result: PassOutResponse }) => (
  <View className="mt-4" style={{ gap: 10 }}>
    <Banner
      tone={result.dryRun ? 'info' : 'success'}
      title={
        result.dryRun
          ? `Preview: ${result.deactivated} account(s) would be deactivated`
          : `${result.deactivated} account(s) deactivated`
      }
    >
      {result.dryRun
        ? 'Nothing has been changed yet.'
        : 'Their sessions were revoked and they can no longer log in.'}
    </Banner>

    {result.classTeachersUntouched.length > 0 ? (
      <Banner tone="warning" title="Class teachers left active">
        <View className="mt-0.5">
          <Text className="text-xs leading-5" style={{ color: '#92400E' }}>
            Staff attached to these sections are never deactivated, so the count above can be
            lower than expected:
          </Text>
          {result.classTeachersUntouched.map((t) => (
            <Text key={t} className="text-xs font-semibold mt-0.5" style={{ color: '#92400E' }}>
              • {t}
            </Text>
          ))}
        </View>
      </Banner>
    ) : null}

    {result.sections.map((s) => (
      <View
        key={s.sectionId}
        className="rounded-xl border border-gray-200 p-3 flex-row items-center justify-between"
      >
        <Text className="text-sm font-semibold text-gray-900 flex-1 mr-2">{s.sectionName}</Text>
        <Text className="text-sm font-bold text-gray-900">{s.passedOut}</Text>
      </View>
    ))}
  </View>
);

const PassOutCard = () => {
  const { data: sections } = useGetAllSections();
  const { mutate: passOut, isPending, variables } = usePassOutStudents();

  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [preview, setPreview] = useState<PassOutResponse | null>(null);
  const [done, setDone] = useState<PassOutResponse | null>(null);

  const previewing = isPending && variables?.dryRun === true;
  const running = isPending && variables?.dryRun !== true;

  const body = {
    sections: selected.map((sectionId) => ({ sectionId })),
    ...(reason.trim() ? { reason: reason.trim() } : {}),
  };

  const change = (next: string[]) => {
    setSelected(next);
    setPreview(null);
    setDone(null);
    setTyped('');
  };

  const runPreview = () => {
    setDone(null);
    passOut(
      { ...body, dryRun: true },
      {
        onSuccess: setPreview,
        onError: (err) => Alert.alert('Preview failed', errorMessage(err)),
      },
    );
  };

  const confirm = () => {
    if (!preview) return;
    Alert.alert(
      'Pass out these students?',
      `${preview.deactivated} student account(s) will be deactivated and signed out. Reactivating them is a manual, one-by-one job.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pass out',
          style: 'destructive',
          onPress: () =>
            passOut(body, {
              onSuccess: (res) => {
                setDone(res);
                setPreview(null);
                setSelected([]);
                setTyped('');
                setReason('');
              },
              onError: (err) => Alert.alert('Pass-out failed', errorMessage(err)),
            }),
        },
      ],
    );
  };

  const typedOk = typed.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <Card className="p-4">
      <Text className="text-sm text-gray-600">
        Deactivates every active student in the chosen sections once the year closes.
        Teachers are never touched.
      </Text>

      <View className="mt-4">
        {!sections || sections.length === 0 ? (
          <Text className="text-sm text-gray-400">No sections available.</Text>
        ) : (
          <SectionPickerGroups
            sections={sections}
            selectedIds={selected}
            onChange={change}
            activeColor="#DC2626"
          />
        )}
      </View>

      <View className="mt-4">
        <Field
          label="Reason (optional)"
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. 2026 graduating batch"
          maxLength={200}
        />
      </View>

      <View style={{ gap: 10 }}>
        <PrimaryButton
          label={selected.length ? `Preview (${selected.length} section${selected.length > 1 ? 's' : ''})` : 'Select sections'}
          icon="eye"
          tone={preview ? 'neutral' : 'red'}
          onPress={runPreview}
          disabled={selected.length === 0 || running}
          loading={previewing}
        />
      </View>

      {preview ? (
        <>
          <PassOutResult result={preview} />
          <View className="mt-4">
            <Field
              label={`Type ${CONFIRM_WORD} to confirm`}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={CONFIRM_WORD}
            />
            <PrimaryButton
              label="Confirm pass-out"
              icon="user-x"
              tone="red"
              onPress={confirm}
              disabled={!typedOk || preview.deactivated === 0}
              loading={running}
            />
          </View>
        </>
      ) : null}

      {done ? <PassOutResult result={done} /> : null}
    </Card>
  );
};

export default PassOutCard;
