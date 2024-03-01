import { parseEther } from 'ethers/lib/utils';
import { DateTime } from 'luxon';

export const SCHEDULES = [
  ['0', DateTime.fromISO('2024-01-24T14:53:05.017Z').toUnixInteger(), parseEther('50')],
  ['1', DateTime.fromISO('2024-01-25T14:53:05.017Z').toUnixInteger(), parseEther('70')],
  ['2', DateTime.fromISO('2024-01-26T14:53:05.017Z').toUnixInteger(), parseEther('100')],
];
