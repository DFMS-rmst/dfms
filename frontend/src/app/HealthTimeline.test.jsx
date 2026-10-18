import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { HealthTimeline } from './FoundationApp.jsx';
import { formatTimelineDate, timelineEventLabel, timelineEventsFromResponse } from './timeline.js';

afterEach(cleanup);

const administrationEvent = {
  id: 'event-1',
  eventType: 'TREATMENT_ADMINISTERED',
  summary: 'An actual medicine administration was recorded.',
  details: {
    administrationId: 'private-id',
    treatmentId: 'private-treatment-id',
    medicine: 'Referenced Medicine',
    product: 'Approved Product',
    actualAmount: '5',
    amountUnit: 'ml',
    route: 'INTRAMUSCULAR',
    administeredAt: '2026-09-23T08:30:00.000Z',
    recordedBy: 'Farm Operator',
    performedBy: 'Farm Worker',
    deviationReason: 'Actual route was recorded explicitly',
  },
  createdAt: '2026-09-23T08:30:00.000Z',
};

describe('health timeline', () => {
  it('renders the current API contract and a populated administration event', () => {
    const result = { events: [administrationEvent] };
    render(
      <HealthTimeline
        timeline={{ animal: { name: 'Gauri' }, events: timelineEventsFromResponse(result) }}
      />,
    );

    expect(screen.getByText('Gauri History')).toBeInTheDocument();
    expect(screen.getByText('Medicine Administration Recorded')).toBeInTheDocument();
    expect(screen.getByText(administrationEvent.summary)).toBeInTheDocument();
    expect(screen.getByText('Referenced Medicine')).toBeInTheDocument();
    expect(screen.getByText('Approved Product')).toBeInTheDocument();
    expect(screen.getByText('Farm Operator')).toBeInTheDocument();
    expect(screen.getByText('Farm Worker')).toBeInTheDocument();
    expect(screen.queryByText('private-id')).not.toBeInTheDocument();
    expect(screen.queryByText('Date unavailable')).not.toBeInTheDocument();
  });

  it('renders a useful empty state for an empty response', () => {
    render(
      <HealthTimeline
        timeline={{
          animal: { tagNumber: 'COW-NEW' },
          events: timelineEventsFromResponse({ events: [] }),
        }}
      />,
    );

    expect(screen.getByText('No health timeline events are available yet.')).toBeInTheDocument();
  });

  it('handles missing events and undefined or null details', () => {
    const events = [
      { id: 'one', eventType: 'CREATED', summary: 'Animal created', createdAt: null },
      {
        id: 'two',
        eventType: 'UPDATED',
        summary: 'Animal updated',
        details: null,
        createdAt: undefined,
      },
    ];
    const { rerender } = render(
      <HealthTimeline timeline={{ animal: { name: 'Gauri' }, events }} />,
    );

    expect(screen.getByText('Animal Profile Created')).toBeInTheDocument();
    expect(screen.getAllByText('Date unavailable')).toHaveLength(2);

    rerender(<HealthTimeline timeline={{ animal: { name: 'Gauri' } }} />);
    expect(screen.getByText('No health timeline events are available yet.')).toBeInTheDocument();
  });

  it('provides human-readable labels for known event types', () => {
    expect(timelineEventLabel('TREATMENT_REQUEST_CREATED')).toBe('Treatment Request Created');
    expect(timelineEventLabel('MILK_ELIGIBILITY_CHANGED')).toBe('Milk Eligibility Updated');
    expect(timelineEventLabel('TREATMENT_ADMINISTERED')).toBe('Medicine Administration Recorded');
  });

  it('safely formats unknown event types', () => {
    expect(timelineEventLabel('FOLLOW_UP_RECORDED')).toBe('Follow Up Recorded');
    expect(timelineEventLabel(undefined)).toBe('Health Timeline Event');
  });

  it('handles malformed dates without throwing', () => {
    expect(formatTimelineDate('not-a-date')).toBe('Date unavailable');
    expect(formatTimelineDate(null)).toBe('Date unavailable');
  });

  it('can be opened from a button without crashing', () => {
    function Harness() {
      const [timeline, setTimeline] = useState(null);
      return (
        <>
          <button
            type="button"
            onClick={() =>
              setTimeline({
                animal: { name: 'Gauri' },
                events: timelineEventsFromResponse({ events: [administrationEvent] }),
              })
            }
          >
            View health timeline
          </button>
          {timeline && <HealthTimeline timeline={timeline} />}
        </>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'View health timeline' }));
    expect(screen.getByRole('region', { name: 'Gauri health timeline' })).toBeInTheDocument();
    expect(screen.getByText('Medicine Administration Recorded')).toBeInTheDocument();
  });
});
