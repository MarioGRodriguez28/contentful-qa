import { describe, expect, it } from 'vitest';
import { configScript } from '../src/page-config';

const read = (script: string) => JSON.parse(script.replace(/^window\.CONTENTFUL = /, '').replace(/;$/, '')) as Record<string, string>;

describe('configScript', () => {
  it('hands the page the space, the environment and the delivery token, nothing else', () => {
    const handed = read(configScript({ spaceId: 's1', environment: 'master', cdaToken: 'cda-token' }));
    expect(handed).toEqual({ spaceId: 's1', environment: 'master', token: 'cda-token' });
  });

  it('keeps awkward characters inside the JSON string', () => {
    const handed = read(configScript({ spaceId: 'a"b', environment: 'master', cdaToken: '</script>' }));
    expect(handed.spaceId).toBe('a"b');
    expect(handed.token).toBe('</script>');
  });
});
