'use client';

import { useQueryClient } from '@tanstack/react-query';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useId, useState } from 'react';
import { announceMockConnectivity } from '@/lib/connectivity';
import { mockClock } from '@/mocks/clock';
import { saveScenario } from '@/mocks/persist';
import { PRESETS, applyScenario, resetScenario, scenario } from '@/mocks/scenarios';
import { Button } from '../ui/button';

// Dev-only scenario switcher (F4-10): one click to any §19.2 state. Excluded from
// production builds (see app/providers.tsx); the marker attribute lets the bundle
// assertion prove it.

export function ScenarioSwitcher() {
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState('Reference');
  const [date, setDate] = useState(mockClock.now().toISOString().slice(0, 10));
  const presetId = useId();
  const dateId = useId();

  function refresh() {
    saveScenario();
    // The shell's offline chip follows the "Offline" preset (F5-08).
    announceMockConnectivity(scenario().offline);
    void queryClient.invalidateQueries();
  }

  function choose(name: string) {
    setPreset(name);
    resetScenario();
    applyScenario({ ...PRESETS[name] });
    refresh();
  }

  return (
    <div
      data-dev-scenario-switcher=""
      className="fixed bottom-(--tabbar-total) right-4 z-(--z-toast) mb-4 md:bottom-4 md:mb-0"
    >
      <Popover.Root>
        <Popover.Trigger className="inline-flex min-h-(--touch-min) items-center gap-2 rounded-full bg-neutral-900 px-4 type-label text-fg-on-action shadow-elev-3">
          <FlaskConical aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
          Mock: {preset}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="top"
            align="end"
            sideOffset={8}
            className="z-(--z-toast) flex w-(--popover-width) flex-col gap-3 rounded-lg border border-border-default bg-bg-card p-4 shadow-elev-3"
          >
            <p className="type-label text-fg-default">Mock API scenario</p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={presetId} className="type-body-sm text-fg-body">
                Scenario
              </label>
              <select
                id={presetId}
                value={preset}
                onChange={(e) => {
                  choose(e.target.value);
                }}
                className="min-h-(--touch-min) rounded-md border border-border-input bg-bg-card px-3 type-body-lg text-fg-default"
              >
                {Object.keys(PRESETS).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={dateId} className="type-body-sm text-fg-body">
                Mock date (clock)
              </label>
              <input
                id={dateId}
                type="date"
                value={date}
                onChange={(e) => {
                  if (e.target.value === '') return;
                  setDate(e.target.value);
                  mockClock.set(`${e.target.value}T12:00:00.000Z`);
                  refresh();
                }}
                className="min-h-(--touch-min) rounded-md border border-border-input bg-bg-card px-3 type-body-lg text-fg-default"
              />
            </div>
            <p className="type-caption text-fg-muted">
              Latency {scenario().latencyMs} ms · {scenario().offline ? 'offline' : 'online'}
            </p>
            <Button
              variant="tertiary"
              size="sm"
              iconLeft={<RotateCcw aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />}
              onClick={() => {
                choose(preset);
                setDate(mockClock.now().toISOString().slice(0, 10));
              }}
            >
              Reset data
            </Button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
