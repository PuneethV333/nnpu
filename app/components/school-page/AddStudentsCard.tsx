import React, { useState } from 'react';
import { View } from 'react-native';
import { PillTabs } from '@/components/ui/Primitives';
import ImportCard from './ImportCard';
import SingleStudentCard from './SingleStudentCard';

type Mode = 'one' | 'bulk';

const OPTIONS: { value: Mode; label: string }[] = [
  { value: 'one', label: 'One student' },
  { value: 'bulk', label: 'Bulk (CSV)' },
];

/**
 * The "Adding students" section, offering the two ways a student ever enters the
 * system.
 *
 * This used to be a single CSV-only card, which is why there was no manual path
 * in the UI at all even though `POST /onboarding/create-student` has always
 * existed. "One student" is first because it is the smaller, more frequent job.
 */
const AddStudentsCard = () => {
  const [mode, setMode] = useState<Mode>('one');

  return (
    <>
      <PillTabs options={OPTIONS} value={mode} onChange={setMode} />
      <View style={{ marginTop: 12 }}>
        {mode === 'one' ? <SingleStudentCard /> : <ImportCard />}
      </View>
    </>
  );
};

export default AddStudentsCard;
