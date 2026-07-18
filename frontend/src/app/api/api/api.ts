export * from './billing.service';
import { BillingService } from './billing.service';
export * from './default.service';
import { DefaultService } from './default.service';
export * from './fORJD.service';
import { FORJDService } from './fORJD.service';
export * from './interactions.service';
import { InteractionsService } from './interactions.service';
export * from './users.service';
import { UsersService } from './users.service';
export const APIS = [
  BillingService,
  DefaultService,
  FORJDService,
  InteractionsService,
  UsersService,
];
