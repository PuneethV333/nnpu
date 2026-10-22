import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Field, PrimaryButton } from "@/components/ui/Primitives";
import { useCreateFeeStructure, useUpdateFeeStructure } from "@/src/hooks/useFees";
import { errorMessage } from "@/src/libs/errorMessage";
import { formatMoney, rupeesToPaise } from "@/src/libs/money";
import type { FeeStructure } from "@/src/types/fees";

/**
 * The five amounts a fee structure is made of. Tuition is the only one the
 * school must state; the rest default to zero, so a day-scholar section is not
 * forced to enter a hostel fee it will never use.
 */
const AMOUNT_FIELDS = [
  { key: "tuitionFee", label: "Tuition fee" },
  { key: "examFee", label: "Exam fee" },
  { key: "transportFee", label: "Transport fee" },
  { key: "hostelFee", label: "Hostel fee" },
  { key: "otherFee", label: "Other fee" },
] as const;

type AmountKey = (typeof AMOUNT_FIELDS)[number]["key"];
type AmountText = Record<AmountKey, string>;

const BLANK: AmountText = {
  tuitionFee: "",
  examFee: "",
  transportFee: "",
  hostelFee: "",
  otherFee: "",
};

/** Paise → the plain rupee string an input shows, without a trailing ".00". */
const toInput = (paise: number): string => String(paise / 100);

const fromStructure = (structure: FeeStructure): AmountText => ({
  tuitionFee: toInput(structure.tuitionFee),
  examFee: toInput(structure.examFee),
  transportFee: toInput(structure.transportFee),
  hostelFee: toInput(structure.hostelFee),
  otherFee: toInput(structure.otherFee),
});

type Parsed =
  | { ok: true; paise: Record<AmountKey, number> }
  | { ok: false; problem: string };

/**
 * Rupee text → paise, refusing anything that would bill the wrong amount.
 *
 * Blank means zero for every field except tuition: a missing tuition fee is
 * almost always a half-filled form, and a ₹0-per-student structure is not a
 * structure anybody meant to create. It is refused here rather than left to the
 * server, whose DTO allows zero.
 */
const parse = (amounts: AmountText): Parsed => {
  // Every key is written by the loop below, so the empty object is never read
  // with a missing field.
  const paise = {} as Record<AmountKey, number>;

  for (const field of AMOUNT_FIELDS) {
    const raw = amounts[field.key].trim();
    if (!raw) {
      if (field.key === "tuitionFee") {
        return { ok: false, problem: "Enter the tuition fee." };
      }
      paise[field.key] = 0;
      continue;
    }

    const value = rupeesToPaise(raw);
    if (value === null) {
      return {
        ok: false,
        problem: `${field.label} must be a plain amount — up to two decimals, no ₹ or minus sign.`,
      };
    }
    paise[field.key] = value;
  }

  const total = AMOUNT_FIELDS.reduce((sum, f) => sum + paise[f.key], 0);
  if (total <= 0) {
    return { ok: false, problem: "The total must be more than ₹0." };
  }

  return { ok: true, paise };
};

/**
 * Create or edit the fee structure that invoices are built from.
 *
 * This lives inside `GenerateInvoicesSheet` because that is the moment the
 * absence of a structure actually blocks the admin: the sheet used to dead-end
 * with "create a fee structure first" and no way to do it in the app. Creating
 * one here drops straight through to the generate step.
 *
 * Editing is the same form. The server refuses it once any invoice exists
 * against the structure (see `FeesService.updateFeeStructure`), so the button is
 * offered to everyone and the error is surfaced verbatim — hiding it would need
 * an invoice count this screen does not have.
 */
export const FeeStructureForm = ({
  sectionId,
  academicYearId,
  sectionName,
  academicYearLabel,
  initial,
  onDone,
  onCancel,
}: {
  sectionId: string;
  academicYearId: string;
  sectionName: string;
  /**
   * Shown next to the name because `Section.name` ("1-SCI-A") does not carry
   * the year, so the same name exists in every academic year.
   */
  academicYearLabel: string;
  initial: FeeStructure | null;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const [amounts, setAmounts] = useState<AmountText>(() =>
    initial ? fromStructure(initial) : BLANK,
  );
  const [error, setError] = useState<string | null>(null);

  const create = useCreateFeeStructure();
  const update = useUpdateFeeStructure();
  const saving = create.isPending || update.isPending;

  // Sums whatever is currently parseable, so the admin sees the per-student
  // total before committing to it.
  const liveTotal = useMemo(
    () =>
      AMOUNT_FIELDS.reduce(
        (sum, field) => sum + (rupeesToPaise(amounts[field.key]) ?? 0),
        0,
      ),
    [amounts],
  );

  const setAmount = (key: AmountKey) => (text: string) => {
    setAmounts((prev) => ({ ...prev, [key]: text }));
    // A validation message describes the amounts as they were when submitted;
    // leaving it up while they change reads as if the new value also failed.
    if (error) setError(null);
  };

  const submit = () => {
    if (saving) return;

    const result = parse(amounts);
    if (!result.ok) {
      setError(result.problem);
      return;
    }
    setError(null);

    const onError = (err: unknown) => setError(errorMessage(err));

    if (initial) {
      update.mutate(
        { id: initial.id, ...result.paise },
        { onSuccess: onDone, onError },
      );
      return;
    }

    create.mutate(
      {
        sectionId,
        academicYearId,
        ...result.paise,
      },
      { onSuccess: onDone, onError },
    );
  };

  return (
    <View>
      <Text className="text-sm text-gray-700 mb-1">
        {initial
          ? "Edit this year's fee structure."
          : "This section has no fee structure for the selected year."}
      </Text>
      <Text className="text-xs text-gray-400 mb-4">
        {sectionName} · {academicYearLabel}. One structure per section and
        academic year — its total becomes the invoice amount for each student.
      </Text>

      {AMOUNT_FIELDS.map((field) => (
        <Field
          key={field.key}
          label={`${field.label} (₹)`}
          value={amounts[field.key]}
          onChangeText={setAmount(field.key)}
          placeholder={field.key === "tuitionFee" ? "e.g. 50000" : "0"}
          keyboardType="decimal-pad"
          autoCapitalize="none"
        />
      ))}

      <View className="bg-gray-50 rounded-xl p-4 mb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-semibold text-gray-400 tracking-wide">
            TOTAL PER STUDENT
          </Text>
          <Text className="text-[11px] text-gray-400 mt-0.5">
            Becomes the invoice amount
          </Text>
        </View>
        <Text className="text-xl font-extrabold text-gray-900">
          {formatMoney(liveTotal)}
        </Text>
      </View>

      {error && <Text className="text-xs text-red-500 mb-3">{error}</Text>}

      <View className="flex-row gap-3 mt-1">
        <View className="flex-1">
          <PrimaryButton
            label="Cancel"
            tone="neutral"
            onPress={onCancel}
            disabled={saving}
          />
        </View>
        <View className="flex-[2]">
          <PrimaryButton
            label={initial ? "Save structure" : "Create structure"}
            icon={initial ? "save" : "plus"}
            onPress={submit}
            loading={saving}
          />
        </View>
      </View>
    </View>
  );
};
