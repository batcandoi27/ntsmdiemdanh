import { getAllEvents } from '@/services/event-service';
import EventList from '@/components/events/event-list';
import EventManagementHeader from '@/components/events/header';
import { Suspense } from 'react';

export default async function EventsPage() {
  const events = await getAllEvents();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <EventManagementHeader totalCount={events.length} />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-10">
        <Suspense fallback={<div className="text-center py-24 font-black text-orange-200 animate-pulse text-2xl uppercase tracking-widest">Đang tải lịch họp...</div>}>
          <EventList events={events} />
        </Suspense>
      </div>
    </div>
  );
}
