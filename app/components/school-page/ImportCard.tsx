import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useGetAllSections } from '@/src/hooks/useSections';
import { useImportStudents } from '@/src/hooks/useEnrollment';
import type { ImportStudentsResponse } from '@/src/types/enrollment';
import { errorMessage } from '@/src/libs/errorMessage';
import { Banner, Card, FieldLabel, PrimaryButton } from '@/components/ui/Primitives';
import SectionChips from '@/components/ui/SectionChips';

/**
 * Roster CSV import into one session.
 *
 * `year` is derived from the picked section rather than typed: the server only
 * ever compares it with the section's academic year, so anything the admin
 * entered could only disagree.
 */
const ImportCard = () => {
  const { data: sections, isLoading } = useGetAllSections();
  const { mutate: importStudents, isPending } = useImportStudents();
  const [pickedId, setPickedId] = useState('');
  const [result, setResult] = useState<ImportStudentsResponse | null>(null);

  const picked = useMemo(
    () => (sections ?? []).find((s) => s.id === pickedId) ?? null,
    [sections, pickedId],
  );

  const handlePick = async () => {
    if (!picked) return;

    const doc = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
      copyToCacheDirectory: true,
    });
    if (doc.canceled) return;

    const asset = doc.assets?.[0];
    if (!asset) return;

    setResult(null);
    importStudents(
      {
        sectionId: picked.id,
        year: picked.academicYearStart,
        file: {
          uri: asset.uri,
          name: asset.name ?? 'students.csv',
          type: asset.mimeType ?? 'text/csv',
        },
      },
      {
        onSuccess: (res) => {
          setResult(res);
          setPickedId('');
        },
        onError: (err) => Alert.alert('Import failed', errorMessage(err)),
      },
    );
  };

  return (
    <Card className="p-4">
      <Text className="text-sm text-gray-600">
        Students are added by uploading a CSV into one session. Create the session first,
        then pick it below.
      </Text>

      <View className="mt-3 rounded-xl border border-dashed border-gray-300 p-4">
        <Text className="text-xs font-semibold text-gray-400 tracking-wide mb-1">
          CSV COLUMNS
        </Text>
        <Text className="text-xs text-gray-600">name,email,stream,combination,language</Text>
        <Text className="text-xs text-gray-400 leading-5 mt-2">
          Every new student gets the password nnpu123 and an email with their login ID,
          asking them to change it.
        </Text>
      </View>

      {isLoading || !sections || sections.length === 0 ? null : (
        <View className="mt-4">
          <FieldLabel>Session</FieldLabel>
          <SectionChips
            sections={sections}
            selectedIds={pickedId ? [pickedId] : []}
            onToggle={(id) => {
              setPickedId(id);
              setResult(null);
            }}
          />
        </View>
      )}

      {picked ? (
        <Text className="text-xs text-gray-500 mt-4">
          Uploading into{' '}
          <Text className="font-semibold text-gray-900">{picked.name}</Text> (
          {picked.academicYearLabel}).
        </Text>
      ) : null}

      <View className="mt-4">
        <PrimaryButton
          label={picked ? 'Choose CSV and upload' : 'Pick a session first'}
          icon="upload"
          onPress={handlePick}
          disabled={!picked}
          loading={isPending}
        />
      </View>

      {result ? (
        <View className="mt-4" style={{ gap: 10 }}>
          <Banner tone="success" title={`${result.created.length} student(s) created`}>
            {`${result.emailed} login email(s) sent.`}
          </Banner>

          {result.emailFailed > 0 ? (
            <Banner tone="warning" title={`${result.emailFailed} email(s) failed`}>
              Those accounts exist but the student has not been told their login ID — send it
              to them manually.
            </Banner>
          ) : null}

          {result.skipped.length > 0 ? (
            <View className="rounded-xl border border-gray-200 overflow-hidden">
              <Text className="text-xs font-semibold text-gray-500 px-3 pt-3 pb-1">
                {result.skipped.length} ROW(S) SKIPPED
              </Text>
              {result.skipped.map((s) => (
                <View key={`${s.line}-${s.name}`} className="px-3 py-2 border-t border-gray-100">
                  <Text className="text-sm font-medium text-gray-900">
                    Line {s.line} · {s.name || 'unnamed'}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">{s.reason}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {result.created.length > 0 ? (
            <View className="rounded-xl border border-gray-200 overflow-hidden">
              <Text className="text-xs font-semibold text-gray-500 px-3 pt-3 pb-1">
                NEW LOGIN IDS
              </Text>
              {result.created.map((c) => (
                <View
                  key={c.authId}
                  className="flex-row items-center justify-between px-3 py-2 border-t border-gray-100"
                >
                  <Text className="text-sm text-gray-900 flex-1 mr-2" numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text className="text-xs font-semibold text-gray-500">{c.authId}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
};

export default ImportCard;
