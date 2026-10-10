import React from 'react';
import { View } from 'react-native';
import { Banner, SectionTitle } from '@/components/ui/Primitives';
import PromotionCard from './PromotionCard';
import PassOutCard from './PassOutCard';

const YearEndTab = () => (
  <>
    <View className="mx-4 mt-2">
      <Banner tone="warning" title="Year-end tools">
        Both actions affect whole cohorts. Each one runs a preview first so you can check the
        counts before anything is written.
      </Banner>
    </View>

    <SectionTitle title="Promote 1st PUC → 2nd PUC" />
    <PromotionCard />

    <SectionTitle title="Pass out graduating students" />
    <PassOutCard />
  </>
);

export default YearEndTab;
