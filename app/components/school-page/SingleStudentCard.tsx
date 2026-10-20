import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { AttendanceStatusModal } from '@/components/attendance-page/AttendanceStatusModal';
import { useAuth } from '@/src/hooks/useAuth';
import { useGetAllSections } from '@/src/hooks/useSections';
import { useGetCombinations } from '@/src/hooks/useCombinations';
import { useCreateStudent } from '@/src/hooks/useOnboarding';
import { errorMessage } from '@/src/libs/errorMessage';
import { sectionSessionLabel, sectionStreamValue } from '@/src/libs/sectionLabels';
import {
  Banner,
  Card,
  Field,
  FieldLabel,
  PrimaryButton,
} from '@/components/ui/Primitives';
import { Skeleton } from '@/components/ui/Skeleton';
import SectionChips from '@/components/ui/SectionChips';
import { colors } from '@/constants/theme';

const LANGUAGES = ['Kannada', 'Hindi', 'Sanskrit'] as const;
type Language = (typeof LANGUAGES)[number];

/**
 * Single-select pill row.
 *
 * No `className`: NativeWind drops a function-valued `style` when one is present,
 * so the press state would never render. Geometry lives in the style function.
 */
const ChoicePills = ({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) => (
  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
    {options.map((option) => {
      const active = option.value === value;
      return (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          style={({ pressed }) => ({
            borderRadius: 9999,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: active
              ? pressed
                ? colors.accentPressed
                : colors.accent
              : pressed
                ? '#E5E7EB'
                : '#FFFFFF',
            borderColor: active ? colors.accent : pressed ? '#D1D5DB' : '#E5E7EB',
          })}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: active ? '#FFFFFF' : '#374151' }}
          >
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

/**
 * Create exactly one student by hand.
 *
 * Class year, stream and the session label are all taken from the picked section
 * rather than asked for separately: `Section` already determines them, and the
 * create endpoint resolves the section from those three fields, so any
 * independent choice could only disagree with the section and be rejected.
 *
 * The combination list is filtered to the section's stream for the same reason —
 * the server rejects a cross-stream code, so offering one would be a guaranteed
 * 400.
 */
const SingleStudentCard = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: sections } = useGetAllSections();
  const { data: combinations, isLoading: combinationsLoading, isError: combinationsError } =
    useGetCombinations();
  const { mutate: createStudent, isPending } = useCreateStudent();

  const [sectionId, setSectionId] = useState('');
  const [name, setName] = useState('');
  const [combinationId, setCombinationId] = useState('');
  const [language, setLanguage] = useState<Language>('Kannada');
  const [created, setCreated] = useState<{ name: string; authId: string } | null>(null);

  /**
   * The outcome is shown as a modal, the same one attendance, marks and the
   * teacher card use, so every create in this screen reports itself the same way
   * instead of one of them appearing as a line further down the card.
   */
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ visible: false, type: 'success', title: '', message: '' });

  const section = useMemo(
    () => (sections ?? []).find((s) => s.id === sectionId) ?? null,
    [sections, sectionId],
  );

  const stream = section ? sectionStreamValue(section.session) : null;
  const classYear =
    section && (section.className === '1' || section.className === '2')
      ? section.className
      : null;

  const streamCombinations = useMemo(
    () => (combinations ?? []).filter((c) => c.stream === stream),
    [combinations, stream],
  );

  const selectedCombination =
    streamCombinations.find((c) => c.id === combinationId) ?? null;

  const schoolId = user?.school?.id ?? null;
  const trimmedName = name.trim();
  const valid =
    !!section && !!classYear && !!stream && !!schoolId && !!combinationId && trimmedName.length > 0;

  const submit = () => {
    if (!valid || !section || !stream || !classYear || !schoolId || !selectedCombination) {
      return;
    }

    createStudent(
      {
        name: trimmedName,
        schoolId,
        classYear,
        stream,
        session: sectionSessionLabel(section.session),
        subjectCode: selectedCombination.idCode,
        language,
      },
      {
        onSuccess: (res) => {
          setCreated({ name: trimmedName, authId: res.authId });
          setFeedback({
            visible: true,
            type: 'success',
            title: `${trimmedName} created`,
            // No mail is sent for a single student, so the ID on this screen is
            // the only copy that exists.
            message: `Login ID ${res.authId}. No email was sent — give this ID to the student, password nnpu123.`,
          });
          setName('');
          setCombinationId('');
          // The new account has to appear on the roster behind this card.
          queryClient.invalidateQueries({ queryKey: ['students', section.id] });
        },
        onError: (err) =>
          setFeedback({
            visible: true,
            type: 'error',
            title: 'Could not create student',
            message: errorMessage(err),
          }),
      },
    );
  };

  return (
    <Card className="p-4">
      <Text className="text-sm text-gray-600">
        Create a single account by hand. The student gets the password nnpu123, but
        no email is sent — share the login ID that appears here once it is saved.
      </Text>

      <View className="mt-4">
        <FieldLabel>Section</FieldLabel>
        {!sections || sections.length === 0 ? (
          <Text className="text-sm text-gray-400">
            No sections yet — create one before adding students.
          </Text>
        ) : (
          <SectionChips
            sections={sections}
            selectedIds={sectionId ? [sectionId] : []}
            onToggle={(id) => {
              setSectionId(id === sectionId ? '' : id);
              setCombinationId('');
            }}
          />
        )}
      </View>

      <View className="mt-4">
        <Field
          label="Student name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ananya Rao"
          maxLength={80}
          autoCapitalize="words"
        />
      </View>

      {section ? (
        <View className="mb-4">
          <FieldLabel>Combination</FieldLabel>
          {!stream ? (
            <Text className="text-sm text-gray-400">
              {section.name} has no stream prefix, so a combination cannot be
              resolved for it.
            </Text>
          ) : combinationsLoading ? (
            <View className="flex-row" style={{ gap: 8 }}>
              <Skeleton width={76} height={32} radius="full" />
              <Skeleton width={76} height={32} radius="full" phase={1} />
            </View>
          ) : combinationsError ? (
            <Text className="text-sm text-gray-400">
              Couldn&apos;t load combinations. Check your connection and try again.
            </Text>
          ) : streamCombinations.length === 0 ? (
            <Text className="text-sm text-gray-400">
              No {stream} combinations are defined yet.
            </Text>
          ) : (
            <>
              <ChoicePills
                options={streamCombinations.map((c) => ({
                  value: c.id,
                  label: c.code,
                }))}
                value={combinationId}
                onChange={setCombinationId}
              />
              {selectedCombination ? (
                <Text className="text-xs text-gray-500 mt-2">
                  {selectedCombination.name}
                </Text>
              ) : null}
            </>
          )}
        </View>
      ) : null}

      <View className="mb-4">
        <FieldLabel>Second language</FieldLabel>
        <ChoicePills
          options={LANGUAGES.map((l) => ({ value: l, label: l }))}
          value={language}
          onChange={(next) => setLanguage(next as Language)}
        />
      </View>

      <PrimaryButton
        label={section ? 'Create student' : 'Pick a section first'}
        icon="user-plus"
        onPress={submit}
        disabled={!valid}
        loading={isPending}
      />

      {!schoolId ? (
        <Text className="text-xs text-amber-600 mt-2">
          Your account came back without a school id, so a student cannot be
          created right now.
        </Text>
      ) : null}

      {created ? (
        <View className="mt-4">
          <Banner tone="success" title={`${created.name} created`}>
            {`Login ID ${created.authId}. Password nnpu123 — no email was sent, so pass this ID on directly.`}
          </Banner>
        </View>
      ) : null}

      <AttendanceStatusModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((f) => ({ ...f, visible: false }))}
        onRetry={
          feedback.type === 'error'
            ? () => {
                // Safe to repeat: a rejected create wrote nothing, so nothing is
                // half-made and no authId was burned.
                setFeedback((f) => ({ ...f, visible: false }));
                submit();
              }
            : undefined
        }
      />
    </Card>
  );
};

export default SingleStudentCard;
