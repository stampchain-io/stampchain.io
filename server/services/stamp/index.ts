import { StampCreationService } from "$server/services/stamp/stampCreationService.ts";
import {
  InsufficientXcpError,
  StampValidationService,
} from "$server/services/stamp/stampValidationService.ts";

export {
  InsufficientXcpError,
  StampCreationService,
  StampValidationService,
};

export class StampService {
  static readonly MintService = StampCreationService;
  static readonly ValidationService = StampValidationService;
}
