import { shuffle } from '../../test/helpers/helpers';

let MINTED_TOKENS: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

const MINTED_TOKENS_SHUFFLED = () => shuffle(MINTED_TOKENS);

export default MINTED_TOKENS_SHUFFLED;