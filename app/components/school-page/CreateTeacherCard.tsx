import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { z } from 'zod';
import { AttendanceStatusModal } from '@/components/attendance-page/AttendanceStatusModal';
import { useAuth } from '@/src/hooks/useAuth';
import { useCreateTeacher } from '@/src/hooks/useOnboarding';
import { useGetSubjects } from '@/src/hooks/useSubjects';
import { errorMessage } from '@/src/libs/errorMessage';
import {
  Banner,
  Card,
  Field,
  FieldLabel,
  PrimaryButton,
} from '@/components/ui/Primitives';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Subject } from '@/src/types/subject';
import type { CreatedTeacher } from '@/src/types/onboarding';

/** The same rule the server applies, so a typo fails here and not after a round trip. */
const emailSchema = z.email();

/**
 * Multi-select pill row.
 *
 * No `className`: NativeWind drops a function-valued `style` when one is present,
 * so the press state would never render. Geometry lives in the style function.
 */
const SubjectPills = ({
  subjects,
  selected,
  onToggle,
}: {
  subjects: Subject[];
  selected: string[];
  onToggle: (subjectId: string) => void;
}) => (
  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
    {subjects.map((subject) => {
      const active = selected.includes(subject.id);
      return (
        <Pressable
          key={subject.id}
          onPress={() => onToggle(subject.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          style={({ pressed }) => ({
            borderRadius: 9999,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: active
              ? pressed
                ? '#4338CA'
                : '#4F46E5'
              : pressed
                ? '#E5E7EB'
                : '#FFFFFF',
            borderColor: active ? '#4F46E5' : pressed ? '#D1D5DB' : '#E5E7EB',
          })}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: active ? '#FFFFFF' : '#374151' }}
          >
            {/* The practical flag comes straight from the catalogue, so the admin
                can tell which of two similarly named papers is which. */}
            {subject.hasPractical ? `${subject.name} · practical` : subject.name}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

/**
 * Create a teacher account, with the subjects they teach.
 *
 * The subjects are a fact about the teacher, not an assignment: they are stored
 * on the teacher and deliberately not tied to a section, so a new teacher does
 * not have to be staffed anywhere to exist — and so they can be picked in the
 * staffing pickers, which list every active teacher rather than only those
 * already staffed somewhere.
 *
 * The login ID and the shared password are emailed to the address entered here,
 * which is why the address is required.
 */
const CreateTeacherCard = () => {
  const { user } = useAuth();
  const {
    data: subjects,
    isLoading: subjectsLoading,
    isError: subjectsError,
  } = useGetSubjects();
  const { mutate: createTeacher, isPending } = useCreateTeacher();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [created, setCreated] = useState<
    (CreatedTeacher & { name: string }) | null
  >(null);

  /**
   * The outcome is shown as a modal, the same one attendance and marks use, so
   * a create reports itself the way every other save in the app does instead of
   * appearing as a line the admin can scroll past.
   */
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ visible: false, type: 'success', title: '', message: '' });

  const schoolId = user?.school?.id ?? null;
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const emailValid = emailSchema.safeParse(trimmedEmail).success;
  const valid =
    !!schoolId && trimmedName.length > 0 && emailValid && subjectIds.length > 0;

  const toggleSubject = (subjectId: string) =>
    setSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId],
    );

  const submit = () => {
    if (!valid || !schoolId) return;

    // Cleared up front so the previous result cannot be mistaken for this one.
    setCreated(null);

    createTeacher(
      {
        name: trimmedName,
        email: trimmedEmail,
        schoolId,
        subjectIds,
      },
      {
        onSuccess: (res) => {
          setCreated({ ...res, name: trimmedName });
          setFeedback({
            visible: true,
            type: 'success',
            title: `${trimmedName} created`,
            // The account exists either way — a delivery failure is news about
            // the email, and the ID has to be handed over by hand in that case.
            message: res.emailSent
              ? `Login ID ${res.authId}. The details were emailed to ${res.emailedTo}. Password nnpu123 until they change it.`
              : `Login ID ${res.authId}. Sending the email failed, so pass this ID on by hand — password nnpu123.`,
          });
          setName('');
          setEmail('');
          setSubjectIds([]);
        },
        onError: (err) =>
          setFeedback({
            visible: true,
            type: 'error',
            title: 'Could not create teacher',
            message: errorMessage(err),
          }),
      },
    );
  };

  return (
    <Card className="p-4">
      <Text className="text-sm text-gray-600">
        Create a teacher account and record the subjects they teach. The subjects
        are saved on the teacher, not on a section — staff them into sections
        from here afterwards. The login ID and password are emailed to the
        address below.
      </Text>

      <View className="mt-4">
        <Field
          label="Teacher name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ravi Kumar"
          maxLength={80}
          autoCapitalize="words"
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="name@school.example"
          maxLength={120}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      {trimmedEmail.length > 0 && !emailValid ? (
        <Text className="text-xs text-red-600 -mt-2 mb-2">
          That doesn&apos;t look like an email address.
        </Text>
      ) : null}

      <View className="mb-4">
        <FieldLabel>Subjects taught</FieldLabel>
        {subjectsLoading ? (
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width={92} height={32} radius="full" phase={i} />
            ))}
          </View>
        ) : subjectsError ? (
          <Text className="text-sm text-gray-400">
            Couldn&apos;t load subjects. Check your connection and try again.
          </Text>
        ) : !subjects || subjects.length === 0 ? (
          <Text className="text-sm text-gray-400">
            No subjects are defined yet, so none can be recorded.
          </Text>
        ) : (
          <>
            <SubjectPills
              subjects={subjects}
              selected={subjectIds}
              onToggle={toggleSubject}
            />
            <Text className="text-xs text-gray-500 mt-2">
              {subjectIds.length === 0
                ? 'Pick at least one subject.'
                : `${subjectIds.length} selected`}
            </Text>
          </>
        )}
      </View>

      <PrimaryButton
        label="Create teacher"
        icon="user-plus"
        onPress={submit}
        disabled={!valid}
        loading={isPending}
      />

      {!schoolId ? (
        <Text className="text-xs text-amber-600 mt-2">
          Your account came back without a school id, so a teacher cannot be
          created right now.
        </Text>
      ) : null}

      {created ? (
        <View className="mt-4">
          <Banner
            // The account exists either way, so a delivery failure is a warning
            // about the email, not a failure of the create. Kept alongside the
            // modal because the popup is dismissed: this line is what is left on
            // screen when the admin goes to hand the login ID over.
            tone={created.emailSent ? 'success' : 'warning'}
            title={`${created.name} created`}
          >
            {created.emailSent
              ? `Login ID ${created.authId}. The details were emailed to ${created.emailedTo}. Password nnpu123 until they change it.`
              : `Login ID ${created.authId}. Nothing was delivered to ${
                  created.emailedTo ?? 'them'
                }, so pass this ID on directly — password nnpu123.`}
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
                // A failed create is safe to repeat: the account and its subject
                // rows are one transaction, so a rejected attempt wrote nothing.
                setFeedback((f) => ({ ...f, visible: false }));
                submit();
              }
            : undefined
        }
      />
    </Card>
  );
};

export default CreateTeacherCard;
