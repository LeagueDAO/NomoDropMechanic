import { shuffle } from '../../test/helpers/helpers';
import { PRIVILEGED } from './privilegedAddresses';

const coerceUndefined = (environmentVariableValue: any) =>
  environmentVariableValue !== "undefined"
    ? environmentVariableValue
    : undefined;

export const generateCollection = (collectionLength: number) =>  Array.from({ length: collectionLength }, (_, i) => i + 1);

export default { generateCollection, shuffle, coerceUndefined, PRIVILEGED };