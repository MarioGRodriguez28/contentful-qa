import { describe, expect, it } from 'vitest';
import { loadConfig, loadDeliveryConfig } from '../src/config';

const full = { CONTENTFUL_SPACE_ID: 'space1', CONTENTFUL_CMA_TOKEN: 'cma-secret', CONTENTFUL_CDA_TOKEN: 'cda-secret' };

describe('loadConfig', () => {
  it('reads the values and defaults the environment to master', () => {
    expect(loadConfig(full)).toEqual({ spaceId: 'space1', environment: 'master', cmaToken: 'cma-secret', cdaToken: 'cda-secret' });
  });

  it('uses the environment from the variable when it is set', () => {
    expect(loadConfig({ ...full, CONTENTFUL_ENVIRONMENT: 'staging' }).environment).toBe('staging');
  });

  it('names every missing variable but never prints a value', () => {
    const error = (() => {
      try {
        loadConfig({ CONTENTFUL_SPACE_ID: 'space1', CONTENTFUL_CMA_TOKEN: '   ' });
      } catch (e) {
        return e as Error;
      }
    })();
    expect(error?.message).toContain('CONTENTFUL_CMA_TOKEN');
    expect(error?.message).toContain('CONTENTFUL_CDA_TOKEN');
    expect(error?.message).not.toContain('space1');
  });
});

describe('loadDeliveryConfig', () => {
  const readOnly = { CONTENTFUL_SPACE_ID: 'space1', CONTENTFUL_CDA_TOKEN: 'cda-secret' };

  it('does not need the management token', () => {
    expect(loadDeliveryConfig(readOnly)).toEqual({ spaceId: 'space1', environment: 'master', cdaToken: 'cda-secret' });
    expect(() => loadConfig(readOnly)).toThrow('CONTENTFUL_CMA_TOKEN');
  });

  it('never exposes a management token it was not asked for', () => {
    expect(loadDeliveryConfig({ ...readOnly, CONTENTFUL_CMA_TOKEN: 'cma-secret' })).not.toHaveProperty('cmaToken');
  });

  it('names the missing delivery variables without printing values', () => {
    expect(() => loadDeliveryConfig({ CONTENTFUL_SPACE_ID: 'space1' })).toThrow(/CONTENTFUL_CDA_TOKEN/);
    expect(() => loadDeliveryConfig({ CONTENTFUL_SPACE_ID: 'space1' })).not.toThrow(/space1/);
  });
});
