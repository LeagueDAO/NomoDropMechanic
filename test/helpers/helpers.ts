import { ContractReceipt } from 'ethers';

export function getTokensFromEventArgs(txReceipt: ContractReceipt, eventName: string,) {
    let storage: string[] = [];
    for (const event of txReceipt.events as Array<any>) {
        if (event.event == eventName) {
            for (const token of event?.args[0]) {
                storage.push(token.toString());
            }
        }
    }
    return storage;
}