import React, { useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import {
  useCreateAnnouncement,
  useUpdateAnnouncement,
} from '@/src/hooks/useAnnouncement';
import { useGetAllSections } from '@/src/hooks/useSections';
import type {
  AnnouncementAudience,
  AnnouncementType,
  CreateAnnouncementBody,
  Latest,
  UpdateAnnouncementBody,
} from '@/src/types/announcement';
import { errorMessage } from '@/src/libs/errorMessage';
import {
  BottomSheet,
  Field,
  FieldLabel,
  PrimaryButton,
} from '@/components/ui/Primitives';
import SectionChips from '@/components/ui/SectionChips';
import {
  AUDIENCE_COPY,
  AUDIENCE_ORDER,
  TYPE_COPY,
  TYPE_ORDER,
} from './announcementMeta';

type Props = {
  /** When set the sheet edits this post; otherwise it creates a new one. */
  initial?: Latest | null;
  onClose: () => void;
};

/**
 * Mounted only while open, so every field initialises fresh from `initial`
 * without a reset effect.
 *
 * Edit semantics follow `UpdateAnnouncementBody`: the read payload does not
 * carry audience / section / pinned, so they cannot be pre-filled. They are
 * only sent when the admin explicitly chooses to re-scope — and then
 * `audience` and `sectionId` always travel together, because the server
 * answers 400 to a lone `sectionId`.
 */
const AnnouncementForm = ({ initial = null, onClose }: Props) => {
  const isEdit = !!initial;

  const { data: sections } = useGetAllSections();
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const saving = create.isPending || update.isPending;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [type, setType] = useState<AnnouncementType>(initial?.type ?? 'Normal');
  const [rescope, setRescope] = useState(!isEdit);
  const [audience, setAudience] = useState<AnnouncementAudience>('School');
  const [sectionId, setSectionId] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  const needsSection = rescope && audience === 'Section';
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const valid =
    trimmedTitle.length > 0 && trimmedBody.length > 0 && (!needsSection || !!sectionId);

  const fail = (err: unknown) =>
    Alert.alert(isEdit ? 'Could not update' : 'Could not post', errorMessage(err));

  const submit = () => {
    if (!valid) return;

    if (!initial) {
      const payload: CreateAnnouncementBody = {
        title: trimmedTitle,
        body: trimmedBody,
        type,
        audience,
        isPinned,
        ...(audience === 'Section' ? { sectionId } : {}),
      };
      create.mutate(payload, { onSuccess: onClose, onError: fail });
      return;
    }

    const diff: UpdateAnnouncementBody = {};
    if (trimmedTitle !== initial.title) diff.title = trimmedTitle;
    if (trimmedBody !== initial.body) diff.body = trimmedBody;
    if (type !== initial.type) diff.type = type;
    if (rescope) {
      diff.audience = audience;
      diff.isPinned = isPinned;
      if (audience === 'Section') diff.sectionId = sectionId;
    }

    if (Object.keys(diff).length === 0) {
      onClose();
      return;
    }

    update.mutate({ id: initial.id, body: diff }, { onSuccess: onClose, onError: fail });
  };

  return (
    <BottomSheet title={isEdit ? 'Edit announcement' : 'New announcement'} onClose={onClose}>
      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Diwali holidays"
        maxLength={120}
      />
      <Field
        label="Message"
        value={body}
        onChangeText={setBody}
        placeholder="Write the announcement…"
        multiline
      />

      <FieldLabel>Type</FieldLabel>
      <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
        {TYPE_ORDER.map((t) => {
          const active = t === type;
          const meta = TYPE_COPY[t];
          return (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              className="rounded-full px-3 py-1.5 border"
              style={{
                backgroundColor: active ? meta.color : '#FFFFFF',
                borderColor: active ? meta.color : '#E5E7EB',
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: active ? '#FFFFFF' : '#374151' }}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isEdit ? (
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-medium text-gray-900">Change who sees this</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Current audience isn&apos;t shown here. Turn on to set it again.
            </Text>
          </View>
          <Switch
            value={rescope}
            onValueChange={setRescope}
            trackColor={{ true: '#4F46E5', false: '#E5E7EB' }}
          />
        </View>
      ) : null}

      {rescope ? (
        <>
          <FieldLabel>Audience</FieldLabel>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {AUDIENCE_ORDER.map((a) => {
              const active = a === audience;
              return (
                <Pressable
                  key={a}
                  onPress={() => setAudience(a)}
                  className="rounded-full px-3 py-1.5 border"
                  style={{
                    backgroundColor: active ? '#4F46E5' : '#FFFFFF',
                    borderColor: active ? '#4F46E5' : '#E5E7EB',
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: active ? '#FFFFFF' : '#374151' }}
                  >
                    {AUDIENCE_COPY[a].label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-xs text-gray-400 mt-2 mb-4">
            {AUDIENCE_COPY[audience].hint}
          </Text>

          {audience === 'Section' ? (
            <View className="mb-4">
              <FieldLabel>Section</FieldLabel>
              {!sections || sections.length === 0 ? (
                <Text className="text-sm text-gray-400">No sections available.</Text>
              ) : (
                <SectionChips
                  sections={sections}
                  selectedIds={sectionId ? [sectionId] : []}
                  onToggle={setSectionId}
                />
              )}
            </View>
          ) : null}

          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-medium text-gray-900">Pin to top</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Pinned posts stay above newer ones.
              </Text>
            </View>
            <Switch
              value={isPinned}
              onValueChange={setIsPinned}
              trackColor={{ true: '#4F46E5', false: '#E5E7EB' }}
            />
          </View>
        </>
      ) : (
        <View className="mb-2" />
      )}

      <PrimaryButton
        label={isEdit ? 'Save changes' : 'Post announcement'}
        icon={isEdit ? 'check' : 'send'}
        onPress={submit}
        loading={saving}
        disabled={!valid}
      />
    </BottomSheet>
  );
};

export default AnnouncementForm;
