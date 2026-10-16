import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  BottomSheet,
  Field,
  PrimaryButton,
} from "@/components/ui/Primitives";
import { DateField } from "@/components/ui/DateField";
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
  // `date` comes from the picker, so it is either "" or a valid YYYY-MM-DD.
  const canSubmit = name.trim().length > 0 && maxMarks !== "" && !maxInvalid;

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
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => ({
                borderRadius: 9999,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: active
                  ? pressed
                    ? "#1D4ED8"
                    : "#2563EB"
                  : pressed
                    ? "#E5E7EB"
                    : "#FFFFFF",
                borderColor: active
                  ? pressed
                    ? "#1D4ED8"
                    : "#2563EB"
                  : pressed
                    ? "#D1D5DB"
                    : "#E5E7EB",
              })}
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

      <DateField
        label="Date (optional)"
        value={date}
        onChange={setDate}
      />

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
        <View className="flex-2">
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
    // Geometry inline rather than in `className`, for the usual reason: a
    // function-valued `style` is dropped when `className` is present. A dashed
    // outline has no fill to darken, so the surface darkens instead.
    style={({ pressed }) => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginHorizontal: 16,
      marginTop: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "dashed",
      backgroundColor: pressed ? "#F3F4F6" : "#FFFFFF",
      borderColor: pressed ? "#9CA3AF" : "#D1D5DB",
    })}
  >
    <Feather name="plus" size={14} color="#2563EB" />
    <Text className="text-[13px] font-semibold text-blue-600">
      New assessment
    </Text>
  </Pressable>
);