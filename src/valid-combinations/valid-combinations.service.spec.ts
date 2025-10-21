import { Test, TestingModule } from '@nestjs/testing';
import { ValidCombinationsService } from './valid-combinations.service';

describe('ValidCombinationsService', () => {
  let service: ValidCombinationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidCombinationsService],
    }).compile();

    service = module.get<ValidCombinationsService>(ValidCombinationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
