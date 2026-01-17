import { Suspense } from 'react';
import RsvpPageClient from './RsvpPageClient';

export default function RSVPPage() {
  return (
    <Suspense fallback={<div>Loading RSVP...</div>}>
      <RsvpPageClient />
    </Suspense>
  );
}
