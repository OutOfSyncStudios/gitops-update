import { InputOptions, getInput } from '@actions/core';
import _ from 'lodash';
import YAML from 'yaml';

/**
 * Gets an input and interprets it as an integer
 *
 * @param name - @see getInput.
 * @param options - @see getInput.
 * @returns The value interpreted as an integer.
 */
export function getIntegerInput(name: string, options?: InputOptions): number {
  const value = getInput(name, options);
  const int = parseInt(value, 10);
  if (_.isNaN(int)) {
    throw new TypeError(`Could not parse ${value} as an integer`);
  }
  return int;
}

/**
 * Gets an input and parses it as YAML
 * @param name - @see getInput.
 * @param options - @see getInput.
 * @returns The value parsed as YAML
 */
export function getYamlInput(name: string, options?: InputOptions): any {
  const value = getInput(name, options);
  return YAML.parse(value);
}
