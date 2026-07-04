import { Suspense } from 'react';
import { getHydraServices } from '@/lib/api/hydra-services';
import FeaturesClient from './features-client';

async function FeaturesList() {
  const services = await getHydraServices();
  return <FeaturesClient services={services} />;
}

export default function FeaturesPage() {
  return (
    <Suspense fallback={<div>Loading features...</div>}>
      <FeaturesList />
    </Suspense>
  );
}
