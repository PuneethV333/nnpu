import React, { useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BottomSheet, Field, PrimaryButton } from "@/components/ui/Primitives";
import { FeeStructureForm } from "@/components/fees-page/FeeStructureForm";
import { useGetFeeStructure, useGenerateInvoices } from "@/src/hooks/useFees";
import { formatMoney } from "@/src/libs/money";

const today = () => new Date().toISOString().slice(0, 10);
const in30Days = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

/**
 * Builds invoices for one section from its fee structure.
 *
 * The counterpart to assessment creation: `POST /fees/invoices/generate` and
 * `useGenerateInvoices` existed with no screen calling them, so a fee structure
 * could be created and then nothing could be billed from it.
 *
 * Two things make this worth a confirm step rather than a single tap:
 *
 * - It writes one Invoice row per active student in the section. That is
 *   hundreds of rows for one press, and it is the kind of write that shows up
 *   on the student's side immediately.
 * - There is no delete. Correcting it means issuing credit or voiding by hand
 *   in the database, so the due date and total are confirmed on screen first.
 *
 * Re-running is safe and cheap: the server skips students who already have an
 * invoice for this structure and returns `created: 0` rather than duplicating,
 * so a slipped second tap cannot double-bill.
 *
 * The structure itself is created here too, when the section has none: the
 * sheet is where its absence blocks the admin, and sending them to a separate
 * screen to fix it was the dead end this branch used to be.
 */
export const GenerateInvoicesSheet = ({
  sectionId,
  sectionName,
  academicYearId,
  academicYearLabel,
  studentCount,
  onClose,
}: {
  sectionId: string;
  sectionName: string;
  academicYearId: string;
  academicYearLabel: string;
  studentCount: number;
  onClose: () => void;
}) => {
  const { data: structure, isLoading: loadingStructure } = useGetFeeStructure(
    sectionId,
    academicYearId,
  );
  const { mutate: generate, isPending: generating } = useGenerateInvoices();

  const [dueDate, setDueDate] = useState(in30Days());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const dateInvalid = !/^\d{4}-\d{2}-\d{2}$/.test(dueDate);

  const total = structure
    ? structure.tuitionFee +
      structure.examFee +
      structure.transportFee +
      structure.hostelFee +
      structure.otherFee
    : 0;

  const noStructure = !loadingStructure && !structure;

  const submit = () => {
    if (!structure || dateInvalid || generating) return;
    setError(null);

    generate(
      {
        feeStructureId: structure.id,
        dueDate,
        ...(description.trim() ? { description: description.trim() } : {}),
      },
      {
        onSuccess: (res) => {
          // `created: 0` with everything already invoiced is not an error, and
          // saying "Generated" would be a lie — the message states the count.
          const suffix =
            res.created === 0
              ? ` Every student in this section already has an invoice for this fee structure (${res.skipped} skipped).`
              : ` ${res.skipped > 0 ? `${res.skipped} already had one. ` : ""}`;
          Alert.alert(
            res.created > 0 ? "Invoices generated" : "Nothing to generate",
            `${res.created} invoice${res.created === 1 ? "" : "s"} created.${suffix}`,
          );
          onClose();
        },
        onError: (err: unknown) =>
          setError(
            (err as { response?: { data?: { message?: string | string[] } } })
              ?.response?.data?.message instanceof Array
              ? ((err as any).response.data.message as string[]).join(", ")
              : ((err as { response?: { data?: { message?: string } } })?.response
                  ?.data?.message ?? "Couldn't generate invoices."),
          ),
      },
    );
  };

  return (
    <BottomSheet
      title={editing ? "Fee structure" : "Generate invoices"}
      subtitle={`${sectionName} · ${academicYearLabel} · ${studentCount} student${
        studentCount === 1 ? "" : "s"
      }`}
      onClose={onClose}
    >
      {loadingStructure ? (
        <Text className="text-sm text-gray-400 py-6 text-center">
          Loading fee structure…
        </Text>
      ) : noStructure || editing ? (
        <FeeStructureForm
          sectionId={sectionId}
          academicYearId={academicYearId}
          sectionName={sectionName}
          academicYearLabel={academicYearLabel}
          initial={structure ?? null}
          // Creating one leaves `structure` populated after the invalidation,
          // so clearing `editing` lands on the generate step either way.
          onDone={() => setEditing(false)}
          onCancel={structure ? () => setEditing(false) : onClose}
        />
      ) : (
        <View>
          <View className="bg-gray-50 rounded-xl p-4 mb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-gray-400 tracking-wide">
                PER STUDENT
              </Text>
              <Pressable
                onPress={() => setEditing(true)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Edit fee structure"
                className="flex-row items-center"
                style={{ gap: 4 }}
              >
                <Feather name="edit-2" size={11} color="#2563EB" />
                <Text className="text-[11px] font-semibold text-blue-600">
                  Edit
                </Text>
              </Pressable>
            </View>
            <Text className="text-2xl font-extrabold text-gray-900 mt-1">
              {formatMoney(total)}
            </Text>
            <Text className="text-xs text-gray-400 mt-1">
              One invoice each for {studentCount} student
              {studentCount === 1 ? "" : "s"}
            </Text>
          </View>

          <Field
            label="Due date"
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
          {dateInvalid && (
            <Text className="text-xs text-red-500 -mt-3 mb-4">
              Use YYYY-MM-DD.
            </Text>
          )}

          <Field
            label={`Description (optional, e.g. Term 1 — ${today()})`}
            value={description}
            onChangeText={setDescription}
            placeholder="Term 1 fees"
          />

          {error && <Text className="text-xs text-red-500 mb-3">{error}</Text>}

          <View className="flex-row gap-3 mt-1">
            <View className="flex-1">
              <PrimaryButton
                label="Cancel"
                tone="neutral"
                onPress={onClose}
                disabled={generating}
              />
            </View>
            <View className="flex-[2]">
              <PrimaryButton
                label={`Generate ${studentCount}`}
                icon="file-text"
                onPress={submit}
                loading={generating}
                disabled={dateInvalid || studentCount === 0}
              />
            </View>
          </View>

          <Text className="text-[11px] text-gray-400 mt-3 text-center">
            Students already invoiced for this structure are skipped, so
            running it twice will not double-bill.
          </Text>
        </View>
      )}
    </BottomSheet>
  );
};

/** Trigger shown above the invoice list. */
export const GenerateInvoicesButton = ({
  disabled,
  onPress,
}: {
  disabled?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    className={`flex-row items-center justify-center gap-2 mx-4 mb-3 py-3 rounded-xl border ${
      disabled ? "opacity-40 border-gray-200 bg-gray-50" : "border-blue-200 bg-blue-50"
    }`}
  >
    <Feather
      name="file-text"
      size={15}
      color={disabled ? "#9CA3AF" : "#2563EB"}
    />
    <Text
      className="text-[14px] font-semibold"
      style={{ color: disabled ? "#9CA3AF" : "#2563EB" }}
    >
      Generate invoices
    </Text>
  </Pressable>
);