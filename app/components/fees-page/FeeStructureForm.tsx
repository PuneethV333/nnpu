import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Field, PrimaryButton } from "@/components/ui/Primitives";
import { useCreateFeeStructure, useUpdateFeeStructure } from "@/src/hooks/useFees";
import { errorMessage } from "@/src/libs/errorMessage";
import { formatMoney, rupeesToPaise } from "@/src/libs/money";
import type { FeeStructure } from "@/src/types/fees";

/**
 * Every amount the API stores, in the order they are billed.
 *
 * Transport and hostel are deliberately NOT inputs here (see `EDITABLE`): this
 * school does not bill them through the app, but they are still columns on the
 * structure and still counted in the invoice total, so they are carried rather
 * than deleted.
 */
type AmountKey =
  | "tuitionFee"
  | "examFee"
  | "transportFee"
  | "hostelFee"
  | "otherFee";

const ALL: AmountKey[] = [
  "tuitionFee",
  "examFee",
  "transportFee",
  "hostelFee",
  "otherFee",
];

const LABEL: Record<AmountKey, string> = {
  tuitionFee: "Tuition fee",
  examFee: "Exam fee",
  transportFee: "Transport fee",
  hostelFee: "Hostel fee",
  otherFee: "Other fee",
};

/**
 * The amounts an admin types.
 *
 * "Academic fee" is stored in the `tuitionFee` column. It is the same money
 * under the school's own name for it, and reusing the column keeps the invoice
 * total, the DTO and every structure created before this change correct without
 * a schema migration. The mapping lives here and nowhere else, so a future
 * split into two distinct columns is a change to this list plus the Prisma
 * model — not a hunt through the app.
 *
 * Transport and hostel are left out: the school quotes an academic fee, an exam
 * fee and a catch-all other fee. On create those two are ₹0; on edit they keep
 * whatever the structure already holds, because sending 0 for a column the form
 * never showed would silently wipe an amount the section is being billed for.
 */
const EDITABLE: { key: AmountKey; label: string; placeholder: string }[] = [
  { key: "tuitionFee", label: "Academic fee", placeholder: "e.g. 40000" },
  { key: "examFee", label: "Exam fee", placeholder: "e.g. 2000" },
  { key: "otherFee", label: "Other fee", placeholder: "e.g. 5000" },
];

const BLANK: Record<AmountKey, string> = {
  tuitionFee: "",
  examFee: "",
  transportFee: "",
  hostelFee: "",
  otherFee: "",
};

/** Paise → the plain rupee string an input shows, without a trailing ".00". */
const toInput = (paise: number): string => String(paise / 100);

const fromStructure = (structure: FeeStructure): Record<AmountKey, string> => ({
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
 * Typed rupee text → the full set of paise the structure will store.
 *
 * The carried amounts (transport, hostel) come from `initial` when there is
 * one, so an edit changes only what the admin can see. Blank input is ₹0 for
 * every editable field; nothing is required, so a structure that adds up to ₹0
 * is the thing that gets refused — it would generate zero-value invoices for
 * the whole section.
 */
const parse = (
  typed: Record<AmountKey, string>,
  initial: FeeStructure | null,
): Parsed => {
  const paise = {} as Record<AmountKey, number>;
  for (const key of ALL) paise[key] = initial ? initial[key] : 0;

  for (const { key, label } of EDITABLE) {
    const raw = typed[key].trim();
    if (!raw) {
      paise[key] = 0;
      continue;
    }

    const value = rupeesToPaise(raw);
    if (value === null) {
      return {
        ok: false,
        problem: `${label} must be a plain amount — up to two decimals, no ₹ or minus sign.`,
      };
    }
    paise[key] = value;
  }

  const total = ALL.reduce((sum, key) => sum + paise[key], 0);
  if (total <= 0) {
    return {
      ok: false,
      problem:
        "The total must be more than ₹0 — enter an academic fee, an exam fee or an other fee.",
    };
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
  const [amounts, setAmounts] = useState<Record<AmountKey, string>>(() =>
    initial ? fromStructure(initial) : BLANK,
  );
  const [error, setError] = useState<string | null>(null);

  const create = useCreateFeeStructure();
  const update = useUpdateFeeStructure();
  const saving = create.isPending || update.isPending;

  // Sums what the structure will actually store, so the admin sees the invoice
  // amount before committing — including any carried-over amount they cannot
  // see in the inputs.
  const liveTotal = useMemo(
    () =>
      ALL.reduce((sum, key) => {
        if (initial && !EDITABLE.some((field) => field.key === key)) {
          return sum + initial[key];
        }
        return sum + (rupeesToPaise(amounts[key]) ?? 0);
      }, 0),
    [amounts, initial],
  );

  // Amounts the structure already carries that this form does not show. Named
  // explicitly so a total that looks larger than the inputs is explained rather
  // than looking like a bug.
  const carried = useMemo(() => {
    if (!initial) return [];
    return ALL.filter(
      (key) => !EDITABLE.some((field) => field.key === key) && initial[key] > 0,
    ).map((key) => `${LABEL[key]} ${formatMoney(initial[key])}`);
  }, [initial]);

  const setAmount = (key: AmountKey) => (text: string) => {
    setAmounts((prev) => ({ ...prev, [key]: text }));
    // A validation message describes the amounts as they were when submitted;
    // leaving it up while they change reads as if the new value also failed.
    if (error) setError(null);
  };

  const submit = () => {
    if (saving) return;

    const result = parse(amounts, initial);
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

      {initial ? null : (
        <Text className="text-[11px] text-gray-400 -mt-3 mb-4">
          Transport and hostel are not asked for here — they are saved as ₹0.
        </Text>
      )}

      {EDITABLE.map((field) => (
        <Field
          key={field.key}
          label={`${field.label} (₹)`}
          value={amounts[field.key]}
          onChangeText={setAmount(field.key)}
          placeholder={field.placeholder}
          keyboardType="decimal-pad"
          autoCapitalize="none"
        />
      ))}

      <View className="bg-gray-50 rounded-xl p-4 mb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
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

        {carried.length > 0 ? (
          <Text className="text-[11px] text-gray-400 mt-3">
            Kept from this structure: {carried.join(" · ")}
          </Text>
        ) : null}
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
