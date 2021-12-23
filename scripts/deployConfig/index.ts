import { shuffle } from '../../test/helpers/helpers';
import { WHITE_LISTED } from './whitelistedAddresses';
import { ELIGIBLE } from './eligibleAddresses';
import { TOKEN_IDS } from './tokenIds';

const coerceUndefined = (environmentVariableValue: any) =>
  environmentVariableValue !== "undefined"
    ? environmentVariableValue
    : undefined;

export const generateCollection = (collectionLength: number) => Array.from({ length: collectionLength }, (_, i) => i + 1);

export default { generateCollection, shuffle, coerceUndefined, WHITE_LISTED, ELIGIBLE, TOKEN_IDS };