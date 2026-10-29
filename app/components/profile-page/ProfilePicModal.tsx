import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useUpdateProfilePic } from '@/src/hooks/useUsers';
import { isCloudinaryConfigured } from '$/config/env';
import { errorMessage } from '@/src/libs/errorMessage';
import type { PickedImage } from '@/src/types/cloudinary';

/**
 * The picker options, shared by the camera and the library.
 *
 * `allowsEditing` + a 1:1 `aspect` so what the user crops is what the circular
 * avatar shows — without it a landscape photo is centre-cropped by the `Image`
 * and the face is as likely as not outside the circle.
 *
 * `quality: 0.7` is the upload budget, not a look: these are displayed at 96px
 * and the file travels over a school connection.
 */
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

const SourceButton = ({
  icon,
  label,
  onPress,
  disabled,
  primary,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  disabled: boolean;
  primary?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    className={`flex-row items-center justify-center gap-2 rounded-xl py-3 w-full ${
      primary ? 'bg-blue-600 active:bg-blue-700' : 'bg-gray-100 active:bg-gray-200'
    } ${disabled ? 'opacity-50' : ''}`}
  >
    <Feather name={icon} size={16} color={primary ? '#FFFFFF' : '#374151'} />
    <Text
      className={`text-sm font-semibold ${
        primary ? 'text-white' : 'text-gray-700'
      }`}
    >
      {label}
    </Text>
  </Pressable>
);

/**
 * The "change your picture" popup, opened by double-tapping the avatar.
 *
 * Self-contained on purpose: picking, uploading and the write are one user
 * action, and splitting them across the header would leave that component
 * holding upload state it never renders.
 *
 * The upload goes straight to Cloudinary and only the resulting URL reaches our
 * backend — see `src/api/cloudinary.ts` for why the bytes never touch the
 * server.
 */
const ProfilePicModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const { mutate: updateProfilePic, isPending } = useUpdateProfilePic();
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (isPending) return;
    setError(null);
    onClose();
  }, [isPending, onClose]);

  const submit = useCallback(
    (file: PickedImage) => {
      setError(null);
      updateProfilePic(file, {
        onSuccess: () => onClose(),
        onError: (err) => setError(errorMessage(err, 'Upload failed.')),
      });
    },
    [updateProfilePic, onClose],
  );

  const pick = useCallback(
    async (source: 'library' | 'camera') => {
      // Checked before the picker opens: an unset cloud name only fails once
      // the photo has been chosen and cropped, which reads as "my upload
      // failed" rather than "this build was never configured".
      if (!isCloudinaryConfigured()) {
        setError(
          'Image uploads are not set up in this build. Ask an admin to configure Cloudinary.',
        );
        return;
      }

      setError(null);

      try {
        const permission =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          setError(
            source === 'camera'
              ? 'Camera access is off for this app. Turn it on in Settings to take a photo.'
              : 'Photo access is off for this app. Turn it on in Settings to choose a picture.',
          );
          return;
        }

        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
            : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

        // Backing out of the picker is not an error — say nothing and leave the
        // popup open so the other source is still one tap away.
        if (result.canceled) return;

        const asset = result.assets[0];
        if (!asset) return;

        submit({
          uri: asset.uri,
          // Both are optional on the asset: the camera returns no file name at
          // all, and a library pick can come back without a mime type. The
          // server never reads either (it stores the URL Cloudinary answers
          // with), but FormData needs them to build the part.
          name: asset.fileName ?? `profile-${Date.now()}.jpg`,
          type: asset.mimeType ?? 'image/jpeg',
        });
      } catch (err) {
        setError(errorMessage(err, 'Could not open the picker.'));
      }
    },
    [submit],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View className="flex-1 bg-black/40 items-center justify-center px-8">
        <View
          className="bg-white rounded-2xl p-6 w-full items-center"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          <View className="w-14 h-14 rounded-full bg-blue-50 items-center justify-center mb-4">
            <Feather name="camera" size={26} color="#2563EB" />
          </View>

          <Text className="text-lg font-bold text-gray-900 mb-1.5">
            Change profile picture
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-5">
            Pick a new photo. Everyone who sees your name in the app sees this
            picture.
          </Text>

          {isPending ? (
            <View className="items-center py-3">
              <ActivityIndicator size="small" color="#2563EB" />
              <Text className="text-sm text-gray-500 mt-2">
                Uploading your picture…
              </Text>
            </View>
          ) : (
            <View className="w-full gap-2">
              <SourceButton
                icon="image"
                label="Choose from gallery"
                onPress={() => void pick('library')}
                disabled={isPending}
                primary
              />
              <SourceButton
                icon="camera"
                label="Take a photo"
                onPress={() => void pick('camera')}
                disabled={isPending}
              />
            </View>
          )}

          {error ? (
            <Text className="text-xs text-red-600 text-center mt-3">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={close}
            disabled={isPending}
            accessibilityRole="button"
            hitSlop={8}
            className={`mt-4 ${isPending ? 'opacity-50' : ''}`}
          >
            <Text className="text-sm font-semibold text-gray-500">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default ProfilePicModal;
