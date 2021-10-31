import { expect } from 'chai';
import { computeBlobHash } from './hash';

describe('hash', () => {
  it('correctly hashes blobs', () => {
    expect(computeBlobHash('test content\n')).to.equal('d670460b4b4aece5915caf5c68d12f560a9fe3e4');
  });
});
