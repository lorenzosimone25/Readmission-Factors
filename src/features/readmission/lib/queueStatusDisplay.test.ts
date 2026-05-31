import { describe, expect, it } from 'vitest';

import { queueStatusDisplay } from '@/features/readmission/lib/queueStatusDisplay';

describe('queueStatusDisplay', () => {
  it('maps all annotation statuses to distinct labels', () => {
    expect(queueStatusDisplay('not_started').label).toBe('Not started');
    expect(queueStatusDisplay('draft').label).toBe('In progress');
    expect(queueStatusDisplay('submitted').label).toBe('Completed');
  });
});
