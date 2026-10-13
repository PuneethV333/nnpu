import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  BottomSheet,
  Field,
  PrimaryButton,
} from "@/components/ui/Primitives";
import { useCreateAssessment } from "@/src/hooks/useMarks";
import {
  assessmentCategoryEnum,
  type AssessmentCategory,
} from "@/src/types/marks";

/**
 * Categories in the order a teacher meets them through a year. Mirrors the
 * Prisma enum exactly — `assessmentCategoryEnum` is the same list, and an
 * unknown value here would be rejected by the Zod parse on the way out.
 */
const CATEGORY_LABEL: Record<AssessmentCategory, string> = {
  UnitTest: "Unit Test",
  MidTerm: "Mid Term",
  FinalTheory: "Final Theory",
  FinalPractical: "Final Practical",
  Internal: "Internal",
};

const CATEGORIES = assessmentCategoryEnum.options;

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Creates an assessment for a section+subject.
 *
 * This exists because `POST /marks/assessment` and `useCreateAssessment` were
 * both already present but nothing called them — so a new section had no
 * assessments and no way to make one, which made the whole mark-entry screen
 * unreachable in practice. Marks cannot be entered until an assessment exists,
 * so this is the first step of that flow, not an optional extra.
 *
 * `date` is optional on the server. Left blank it is not sent at all rather
 * than sent as today, because an assessment the school never scheduled should
 * not silently acquire today's date.
 */
export const CreateAssessmentSheet = ({
  sectionId,
  sectionName,
  subjectId,
  subjectName,
  onClose,
  onCreated,
}: {
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  onClose: () => void;
  onCreated?: (assessmentId: string) => void;
}) => {
  const { mutate: createAssessment, isPending: saving } =
    useCreateAssessment();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssessmentCategory>("UnitTest");
  const [maxMarks, setMaxMarks] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Validated here rather than relying on a 400: a rejected request is a
  // round trip and shows a generic message, whereas these are the two ways
  // this form is actually misused.
  const max = Number(maxMarks);
  const maxInvalid = maxMarks !== "" && (!Number.isInteger(max) || max < 1);
  const dateInvalid = date !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(date);
  const canSubmit =
    name.trim().length > 0 && maxMarks !== "" && !maxInvalid && !dateInvalid;

  const submit = () => {
    if (!canSubmit || saving) return;
    setError(null);

    createAssessment(
      {
        name: name.trim(),
        category,
        subjectId,
        sectionId,
        maxMarks: max,
        ...(date ? { date } : {}),
      },
      {
        onSuccess: (created) => {
          // Land the teacher on the assessment they just made, rather than
          // leaving them to find it in the list.
          onCreated?.(created.id);
          onClose();
        },
        onError: (err: unknown) =>
          setError(
            (err as { response?: { data?: { message?: string | string[] } } })
              ?.response?.data?.message instanceof Array
              ? ((err as any).response.data.message as string[]).join(", ")
              : ((err as { response?: { data?: { message?: string } } })?.response
                  ?.data?.message ?? "Couldn't create the assessment."),
          ),
      },
    );
  };

  return (
    <BottomSheet
      title="New assessment"
      subtitle={`${subjectName} · ${sectionName}`}
      onClose={onClose}
    >
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Unit Test 1"
        maxLength={120}
      />

      <Text className="text-[13px] font-semibold text-gray-600 mb-2">
        Category
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              className="rounded-full border px-3 py-1.5"
              style={{
                backgroundColor: active ? "#2563EB" : "#FFFFFF",
                borderColor: active ? "#2563EB" : "#E5E7EB",
              }}
            >
              <Text
                className="text-[13px] font-medium"
                style={{ color: active ? "#FFFFFF" : "#374151" }}
              >
                {CATEGORY_LABEL[c]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Field
        label="Maximum marks"
        value={maxMarks}
        onChangeText={setMaxMarks}
        placeholder="25"
        keyboardType="number-pad"
      />
      {maxInvalid && (
        <Text className="text-xs text-red-500 -mt-3 mb-4">
          Marks must be a whole number of at least 1.
        </Text>
      )}

      <Field
        label={`Date (optional, ${today()})`}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      {dateInvalid && (
        <Text className="text-xs text-red-500 -mt-3 mb-4">
          Use YYYY-MM-DD, or leave it blank.
        </Text>
      )}

      {error && (
        <Text className="text-xs text-red-500 mb-3">{error}</Text>
      )}

      <View className="flex-row gap-3 mt-1">
        <View className="flex-1">
          <PrimaryButton
            label="Cancel"
            tone="neutral"
            onPress={onClose}
            disabled={saving}
          />
        </View>
        <View className="flex-[2]">
          <PrimaryButton
            label="Create"
            icon="plus-circle"
            onPress={submit}
            loading={saving}
            disabled={!canSubmit}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

/** Small trigger button so screens don't re-implement the open state. */
export const NewAssessmentButton = ({
  onPress,
}: {
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    className="flex-row items-center justify-center gap-1.5 mx-4 mt-3 py-2.5 rounded-xl border border-dashed border-gray-300 bg-white"
  >
    <Feather name="plus" size={14} color="#2563EB" />
    <Text className="text-[13px] font-semibold text-blue-600">
      New assessment
    </Text>
  </Pressable>
);