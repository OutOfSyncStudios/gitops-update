import { InputOptions } from '@actions/core';
import { expect } from 'chai';
import proxyquire from 'proxyquire';
import { stub, SinonStub } from 'sinon';
import { getIntegerInput } from './input';

let getInputStub: SinonStub<[string, InputOptions?], string>;
let stubbedInputModule: {
  getIntegerInput: typeof getIntegerInput;
};

describe('Input utilities', () => {
  beforeEach(() => {
    getInputStub = stub();
    stubbedInputModule = proxyquire('./input', { '@actions/core': { getInput: getInputStub } });
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
      expect(() => stubbedInputModule.getIntegerInput(key)).to.throw(TypeError);
      getInputStub.calledOnceWith(key);
    });
  });
});
