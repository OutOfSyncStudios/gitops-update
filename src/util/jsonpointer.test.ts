import {expect} from 'chai';
import {parse, unescapeToken} from './jsonpointer';

describe('jsonpointer.unescapeToken', () => {
  it('unescapes ~1 to /', () => {
    expect(unescapeToken('foo~1bar')).to.equal('foo/bar');
  });

  it('unescapes ~0 to ~', () => {
    expect(unescapeToken('foo~0bar')).to.equal('foo~bar');
  });

  it('unescapes a mix of ~0 and ~1', () => {
    expect(unescapeToken('foo~0~1bar')).to.equal('foo~/bar');
  });
});

describe('jsonpointer.parse', () => {
  it('throws on an empty pointer', () => {
    expect(() => parse('')).to.throw();
  });

  it('throws on an invalid pointer', () => {
    expect(() => parse('foo/bar')).to.throw();
  });

  it('parses a simple JSON pointer', () => {
    expect(parse('/foo/bar')).to.have.ordered.members(['foo', 'bar']);
  });

  it('parses an escaped JSON pointer', () => {
    expect(parse('/foo~0/bar~1baz')).to.have.ordered.members(['foo~', 'bar/baz']);
  })
});
