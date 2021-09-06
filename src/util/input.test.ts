import { InputOptions } from '@actions/core';
import { expect } from 'chai';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import { getBooleanInput, getIntegerInput } from './input';

var getInputStub: sinon.SinonStub<[string, InputOptions?], string>;
var stubbedInputModule: {
  getBooleanInput: typeof getBooleanInput;
  getIntegerInput: typeof getIntegerInput;
};

describe('Input utilities', () => {
  beforeEach(() => {
    getInputStub = sinon.stub();
    stubbedInputModule = proxyquire('./input', {
      '@actions/core': {
        getInput: getInputStub,
      },
    });
  });

  describe('getBooleanInput', () => {
    describe('true inputs', () => {
      const truthy = ['true', 't', 'yes', 'y', 'on', '1'];

      truthy.forEach(input => {
        it(`returns true for ${input}`, () => {
          const key = 'input';
          getInputStub.returns(input);
          expect(stubbedInputModule.getBooleanInput(key)).to.be.true;
          getInputStub.calledOnceWith(key);
        });
      });
    });

    it('is case insenitive', () => {
      const key = 'input';
      getInputStub.returns('Yes');
      expect(stubbedInputModule.getBooleanInput(key)).to.be.true;
      getInputStub.calledOnceWith(key);
    });

    it('returns false for non-matching inputs', () => {
      const key = 'input';
      getInputStub.returns('false');
      expect(stubbedInputModule.getBooleanInput(key)).to.be.false;
      getInputStub.calledOnceWith(key);
    });

    it('returns false for empty inputs', () => {
      const key = 'input';
      getInputStub.returns('');
      expect(stubbedInputModule.getBooleanInput(key)).to.be.false;
      getInputStub.calledOnceWith(key);
    });
  });

  describe('getIntegerInput', () => {
    it('returns the correct integer', () => {
      const key = 'input';
      getInputStub.returns('42');
      expect(stubbedInputModule.getIntegerInput(key)).to.equal(42);
      getInputStub.calledOnceWith(key);
    });

    it('throws on non-integer input', () => {
      const key = 'input';
      getInputStub.returns('foobar');
      expect(() => stubbedInputModule.getIntegerInput(key)).to.throw;
      getInputStub.calledOnceWith(key);
    });
  });
});
