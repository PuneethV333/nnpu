import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useGetAllSections } from '@/src/hooks/useSections';
import { usePromoteTo2ndPuc } from '@/src/hooks/useEnrollment';
import type { PromoteTo2ndPucResponse } from '@/src/types/enrollment';
import { errorMessage } from '@/src/libs/errorMessage';
import { Banner, Card, Pill, PrimaryButton } from '@/components/ui/Primitives';
import SectionPickerGroups from './SectionPickerGroups';

/**
 * One renderer for the dry-run preview and the real result — the response
 * shape is identical and only `dryRun` flips, so the same component shows both.
 *
 * Skipped students are always rendered. A promotion that moves 118 of 120 is
 * not "118 moved"; it is 118 moved and 2 that need a human decision.
 */
const PromotionResult = ({ result }: { result: PromoteTo2ndPucResponse }) => {
  const toMove = result.sections.reduce((n, s) => n + s.studentsToMove, 0);
  const skipped = result.sections.reduce((n, s) => n + s.skipped.length, 0);

  return (
    <View className="mt-4" style={{ gap: 10 }}>
      <Banner
        tone={result.dryRun ? 'info' : 'success'}
        title={
          result.dryRun
            ? `Preview: ${toMove} student(s) would move`
            : `${result.moved} student(s) promoted`
        }
      >
        {`Into ${result.targetAcademicYearLabel}.${
          result.dryRun ? ' Nothing has been changed yet.' : ''
        }`}
      </Banner>

      {skipped > 0 ? (
        <Banner tone="warning" title={`${skipped} student(s) left behind`}>
          They need a decision from you — see the reasons below.
        </Banner>
      ) : null}

      {result.sections.map((s) => (
        <View key={s.sourceSectionId} className="rounded-xl border border-gray-200 p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-gray-900 flex-1 mr-2">
              {s.sourceName} → {s.targetName}
            </Text>
            <Text className="text-sm font-bold text-gray-900">{s.studentsToMove}</Text>
          </View>
          {s.targetCreated ? (
            <View className="mt-1.5">
              <Pill
                label={result.dryRun ? 'Section will be created' : 'Section created'}
                color="#2563EB"
              />
            </View>
          ) : null}
          {s.skipped.map((k, i) => (
            <View key={`${k.name}-${i}`} className="mt-2 pt-2 border-t border-gray-100">
              <Text className="text-xs font-medium text-amber-700">{k.name}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{k.reason}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const PromotionCard = () => {
  const { data: sections } = useGetAllSections();
  const { mutate: promote, isPending, variables } = usePromoteTo2ndPuc();

  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<PromoteTo2ndPucResponse | null>(null);
  const [done, setDone] = useState<PromoteTo2ndPucResponse | null>(null);

  const body = { sections: selected.map((sectionId) => ({ sectionId })) };
  const previewing = isPending && variables?.dryRun === true;
  const promoting = isPending && variables?.dryRun !== true;

  const change = (next: string[]) => {
    // Any change to the selection invalidates a preview made for the old one.
    setSelected(next);
    setPreview(null);
    setDone(null);
  };

  const runPreview = () => {
    setDone(null);
    promote(
      { ...body, dryRun: true },
      {
        onSuccess: setPreview,
        onError: (err) => Alert.alert('Preview failed', errorMessage(err)),
      },
    );
  };

  const confirm = () => {
    if (!preview) return;
    const toMove = preview.sections.reduce((n, s) => n + s.studentsToMove, 0);

    Alert.alert(
      'Promote to 2nd PUC?',
      `${toMove} student(s) from ${selected.length} section(s) move into ${preview.targetAcademicYearLabel}. Missing 2nd-PUC sections are created. This cannot be undone from the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          style: 'destructive',
          onPress: () =>
            promote(body, {
              onSuccess: (res) => {
                setDone(res);
                setPreview(null);
                setSelected([]);
              },
              onError: (err) => Alert.alert('Promotion failed', errorMessage(err)),
            }),
        },
      ],
    );
  };

  return (
    <Card className="p-4">
      <Text className="text-sm text-gray-600">
        Moves every active student in the chosen 1st-PUC sections into the matching 2nd-PUC
        section of the next academic year. Preview first.
      </Text>

      <View className="mt-4">
        {!sections || sections.length === 0 ? (
          <Text className="text-sm text-gray-400">No sections available.</Text>
        ) : (
          <SectionPickerGroups sections={sections} selectedIds={selected} onChange={change} />
        )}
      </View>

      <View className="mt-4" style={{ gap: 10 }}>
        <PrimaryButton
          label={selected.length ? `Preview (${selected.length} section${selected.length > 1 ? 's' : ''})` : 'Select sections'}
          icon="eye"
          tone={preview ? 'neutral' : 'indigo'}
          onPress={runPreview}
          disabled={selected.length === 0 || promoting}
          loading={previewing}
        />
        {preview ? (
          <PrimaryButton
            label="Confirm promotion"
            icon="arrow-up-circle"
            onPress={confirm}
            loading={promoting}
          />
        ) : null}
      </View>

      {preview ? <PromotionResult result={preview} /> : null}
      {done ? <PromotionResult result={done} /> : null}
    </Card>
  );
};

export default PromotionCard;
